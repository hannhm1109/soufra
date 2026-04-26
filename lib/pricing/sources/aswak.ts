// Aswak Assalam catalog adapter.
//
// Fetches public category pages from aswakassalam.com and extracts product
// listings. All HTTP calls happen ONLY during the scheduled cron job — never
// during a user request.
//
// Parser design:
//   Strategy A (JSON-LD)  — parses <script type="application/ld+json"> blocks.
//                           Most robust for price; also tries to extract pack
//                           size from description and priceSpecification fields.
//   Strategy B (HTML regex) — falls back to pattern matching in the raw HTML.
//                           More fragile but captures pack/unit-price text that
//                           JSON-LD often omits.
//   The two strategies are ADDITIVE: both run on every page.  JSON-LD is
//   authoritative for name + price; HTML enriches pack/unit-price when JSON-LD
//   doesn't have them.  HTML-only products are kept when JSON-LD missed them.
//
// To calibrate to Aswak's real HTML:
//   1. Fetch a category page: curl -L https://www.aswakassalam.com/product-category/fruits-legumes/
//   2. Check whether JSON-LD blocks exist (grep ld\+json)
//   3. If not, adjust the patterns in parseHtmlProducts() to match the real selectors
//
// The adapter interface (CatalogAdapter) is intentionally thin so you can
// swap this file for another source without touching any other code.

import { normalizeForMatch, parsePackLabel, extractBrand, UNIT_NORMALIZE } from "../normalize"
import type {
  CatalogAdapter,
  ConfidenceLevel,
  ParsedProduct,
  ProductPrice,
  RawCatalogPage,
} from "../types"

// ─── Category configuration ────────────────────────────────────────────────
const ASWAK_BASE = "https://www.aswakassalam.com"
const CATEGORIES: Array<{ path: string; category: string }> = [
  { path: "/product-category/fruits-legumes/", category: "Vegetables" },
  { path: "/product-category/boucherie-volaille/", category: "Meat & Protein" },
  { path: "/product-category/cremerie/", category: "Dairy" },
  { path: "/product-category/epicerie/", category: "Pantry & Spices" },
  { path: "/product-category/boulangerie/", category: "Grains" },
  { path: "/product-category/surgeles/", category: "Meat & Protein" },
]

const REQUEST_DELAY_MS = 1500
const REQUEST_TIMEOUT_MS = 15_000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ─── Fetch ─────────────────────────────────────────────────────────────────

async function fetchPage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Soufra-PriceBot/1.0; +https://soufra.app/pricing-info)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr-MA,fr;q=0.9,ar;q=0.8",
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      cache: "no-store",
    })
    if (!res.ok) {
      console.warn(`[aswak] fetch ${url} → HTTP ${res.status}`)
      return null
    }
    return res.text()
  } catch (err) {
    console.warn(`[aswak] fetch ${url} failed:`, (err as Error).message)
    return null
  }
}

// ─── Entry types ───────────────────────────────────────────────────────────

interface RawProductEntry {
  rawName: string
  priceText: string
  unitPriceText?: string
  packLabel?: string
}

// ─── Strategy A: JSON-LD ──────────────────────────────────────────────────
// Standard schema.org/Product markup — most reliable source of name + price.
// Also extracts pack size from `description` and unit price from
// `priceSpecification` when available.

function extractPackFromText(text: string): string | null {
  // Matches "1kg", "500 g", "1 L", "33cl", "6x120g" (take the per-unit measure)
  const multiMatch = text.match(/\d+\s*x\s*(\d+(?:[.,]\d+)?\s*(?:kg|g|[Ll]|cl|ml|pièce|piece))/i)
  if (multiMatch) return multiMatch[1]
  const singleMatch = text.match(/\b(\d+(?:[.,]\d+)?\s*(?:kg|g|[Ll]|cl|ml|pièce|piece|pcs?))\b/i)
  return singleMatch ? singleMatch[1] : null
}

function extractUnitPriceText(priceSpec: unknown): string | null {
  if (!priceSpec) return null
  const specs = Array.isArray(priceSpec) ? priceSpec : [priceSpec]
  for (const spec of specs) {
    if (typeof spec !== "object" || spec === null) continue
    const s = spec as Record<string, unknown>
    // schema.org UnitPriceSpecification
    const price = s["price"] ?? s["pricePerUnit"]
    const unit = s["referenceQuantity"] ?? s["unitText"] ?? s["unitCode"]
    if (price != null && unit != null) {
      const unitStr = String(unit).toLowerCase().replace("kgm", "kg")
      return `${price} DH/${unitStr}`
    }
  }
  return null
}

function parseJsonLdProducts(html: string): RawProductEntry[] {
  const entries: RawProductEntry[] = []
  const blocks = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]

  for (const block of blocks) {
    let data: unknown
    try {
      data = JSON.parse(block[1])
    } catch {
      continue
    }

    const items = Array.isArray(data) ? data : [data]
    for (const item of items) {
      if (typeof item !== "object" || item === null) continue
      const product = item as Record<string, unknown>

      // Accept Product or ItemList → ListItem → Product
      const type = product["@type"] as string | string[] | undefined
      const types = Array.isArray(type) ? type : [type ?? ""]
      if (!types.some((t) => t === "Product")) continue

      const name = product["name"] as string | undefined
      if (!name) continue

      const offers = product["offers"] as Record<string, unknown> | undefined
      const price = offers?.["price"] ?? product["price"]
      if (price == null) continue

      const description = (product["description"] ?? offers?.["description"]) as string | undefined

      // Pack size: check description first, then fall back to product name itself
      const packLabel =
        (description ? extractPackFromText(description) : null) ??
        extractPackFromText(name) ??
        undefined

      // Unit price: try priceSpecification array / object
      const unitPriceText =
        extractUnitPriceText(offers?.["priceSpecification"]) ??
        extractUnitPriceText(product["priceSpecification"]) ??
        undefined

      entries.push({
        rawName: name,
        priceText: String(price),
        packLabel,
        unitPriceText,
      })
    }
  }
  return entries
}

// ─── Strategy B: HTML regex ────────────────────────────────────────────────
// Calibrate the patterns below to match Aswak's actual rendered markup.
// Inspect a live page to find real class names / element structure.
// Multiple patterns are tried in priority order.

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
}

function parseHtmlProducts(html: string): RawProductEntry[] {
  const entries: RawProductEntry[] = []

  // Aswak uses WooCommerce Porto theme. Product cards have:
  //   class="woocommerce-loop-product__title" for the name (contains "title")
  //   class="price" for the price outer element
  //   class="woocommerce-Price-currencySymbol" for the "Dh" symbol (contains "Price")
  //
  // Price format: <bdi>23,95&nbsp;<span class="...currencySymbol">Dh</span></bdi>
  // The NUMBER comes FIRST, then &nbsp; (HTML entity, not whitespace), then "Dh".
  // The old approach of capturing up to first </tag> gave "Dh" (only the currency span).
  // Fix: use the old block-finding pattern (which correctly finds 12 products), then
  // extract price from the full block with a pattern that handles the &nbsp; entity.
  const pattern =
    /class="[^"]*product[^"]*"[\s\S]{0,800}?class="[^"]*(?:name|title|libelle)[^"]*"[^>]*>([\s\S]{1,120}?)<\/[\w]+>[\s\S]{0,500}?class="[^"]*(?:prix|price)[^"]*"[^>]*>([\s\S]{1,60}?)<\/[\w]+>/gi

  for (const match of html.matchAll(pattern)) {
    const block = match[0]
    const rawName = stripTags(match[1]).trim()
    if (!rawName || rawName.length < 2) continue

    // Aswak price HTML: <bdi>23,95&nbsp;<span class="...currencySymbol">Dh</span></bdi>
    // The number is the first text node in <bdi>, before any nested tags or entities.
    let priceText = ""
    const bdiM = block.match(/<bdi>([\d,.\s]+?)(?:&|<)/)
    if (bdiM) priceText = bdiM[1].trim()
    if (!priceText) continue

    const unitPriceMatch = block.match(/([\d,.\s]+(?:Dh|MAD)?\/(?:kg|g|l|L|ml|pièce|piece))/i)
    const packMatch = block.match(/(?:au\s|par\s)?(\d+(?:[.,]\d+)?\s*(?:kg|g|[Ll]|cl|ml|pièce|piece))/i)

    entries.push({
      rawName,
      priceText,
      unitPriceText: unitPriceMatch?.[1],
      packLabel: packMatch?.[1],
    })
  }

  return entries
}

// ─── Merge strategies ──────────────────────────────────────────────────────
// Both strategies run on every page.
// JSON-LD is authoritative for name + price.
// HTML enriches pack/unitPrice when JSON-LD lacks them.
// HTML-only products are appended (JSON-LD may not list all products).

function extractProductEntries(html: string): RawProductEntry[] {
  const jsonLdMap = new Map<string, RawProductEntry>()
  const htmlMap = new Map<string, RawProductEntry>()

  for (const e of parseJsonLdProducts(html)) {
    jsonLdMap.set(normalizeForMatch(e.rawName), e)
  }
  for (const e of parseHtmlProducts(html)) {
    htmlMap.set(normalizeForMatch(e.rawName), e)
  }

  const merged = new Map<string, RawProductEntry>()

  // JSON-LD entries: enrich with HTML pack/unit when not in JSON-LD
  for (const [key, jsonEntry] of jsonLdMap) {
    const htmlEntry = htmlMap.get(key)
    merged.set(key, {
      rawName: jsonEntry.rawName,
      priceText: jsonEntry.priceText,
      unitPriceText: jsonEntry.unitPriceText ?? htmlEntry?.unitPriceText,
      packLabel: jsonEntry.packLabel ?? htmlEntry?.packLabel,
    })
  }

  // HTML-only entries not captured by JSON-LD
  for (const [key, htmlEntry] of htmlMap) {
    if (!merged.has(key)) merged.set(key, htmlEntry)
  }

  return [...merged.values()]
}

// ─── Price parsing ─────────────────────────────────────────────────────────

function parsePriceMad(text: string): number | null {
  // Handle "8,50", "8.50", "8 50", "8,50 DH", "8.50 MAD"
  const cleaned = text.replace(/\s/g, "").replace(",", ".").replace(/[^\d.]/g, "")
  const value = Number.parseFloat(cleaned)
  return Number.isFinite(value) && value > 0 ? value : null
}

// ─── Confidence scoring ────────────────────────────────────────────────────

function computeConfidence(entry: RawProductEntry, price: number): { score: number; level: ConfidenceLevel } {
  let score = 0.65 // base for any parsed product
  if (entry.unitPriceText) score += 0.12
  if (entry.packLabel) score += 0.08
  if (price < 1 || price > 5000) score -= 0.25 // sanity bounds
  const level: ConfidenceLevel = score >= 0.8 ? "high" : score >= 0.55 ? "medium" : "low"
  return { score: Math.max(0.3, Math.min(1.0, score)), level }
}

// ─── Main parser ───────────────────────────────────────────────────────────

function parseCategoryPage(page: RawCatalogPage): ParsedProduct[] {
  const entries = extractProductEntries(page.html)

  if (entries.length === 0) {
    console.warn(`[aswak] no products extracted from ${page.url} — page structure may need calibration`)
  }

  const products: ParsedProduct[] = []

  for (const entry of entries) {
    const packagePrice = parsePriceMad(entry.priceText)
    if (!packagePrice) continue

    const { brand, generic } = extractBrand(entry.rawName)
    const normalizedName = normalizeForMatch(generic)
    if (!normalizedName || normalizedName.length < 2) continue

    const packParsed = entry.packLabel ? parsePackLabel(entry.packLabel) : null
    const packageQuantityValue = packParsed?.value ?? null
    const packageQuantityUnit = packParsed?.unit
      ? (UNIT_NORMALIZE[packParsed.unit] ?? packParsed.unit)
      : null

    // Compute unit price from pack quantity when available
    let unitPrice: number | null = null
    let unitBaseUnit: string | null = null
    if (packageQuantityValue && packageQuantityUnit && packageQuantityValue > 0) {
      unitPrice = packagePrice / packageQuantityValue
      unitBaseUnit = packageQuantityUnit
    }

    // Parse unit price from text like "8,50 DH/kg" when pack derivation fails
    if (!unitPrice && entry.unitPriceText) {
      const match = entry.unitPriceText.match(/([\d,.\s]+)\s*(?:DH|MAD)?\s*\/\s*([a-zéèàA-Z]+)/i)
      if (match) {
        const up = parsePriceMad(match[1])
        const rawUnit = match[2].toLowerCase()
        const unit = UNIT_NORMALIZE[rawUnit] ?? rawUnit
        if (up && up > 0) {
          unitPrice = up
          unitBaseUnit = unit
        }
      }
    }

    const { score, level } = computeConfidence(entry, packagePrice)

    const price: ProductPrice = {
      packagePrice,
      packageQuantityValue: packageQuantityValue ?? undefined,
      packageQuantityUnit: packageQuantityUnit ?? undefined,
      unitPrice: unitPrice ?? undefined,
      unitBaseUnit: unitBaseUnit ?? undefined,
      isPromo: false,
      inStock: true,
      capturedAt: page.fetchedAt,
      city: undefined,
      marketTier: "supermarket",
      confidenceScore: score,
      confidenceLevel: level,
    }

    products.push({
      source: "aswak_shop",
      sourceUrl: page.url,
      rawName: entry.rawName,
      normalizedName,
      brand: brand ?? undefined,
      category: page.category,
      packLabel: entry.packLabel,
      quantityValue: packageQuantityValue ?? undefined,
      quantityUnit: packageQuantityUnit ?? undefined,
      metadata: { parsedAt: page.fetchedAt.toISOString() },
      prices: [price],
    })
  }

  return products
}

// ─── Adapter export ────────────────────────────────────────────────────────

export const aswakAdapter: CatalogAdapter = {
  source: "aswak_shop",

  async fetchCatalogPages(): Promise<RawCatalogPage[]> {
    const pages: RawCatalogPage[] = []
    for (const { path, category } of CATEGORIES) {
      const url = `${ASWAK_BASE}${path}`
      const html = await fetchPage(url)
      if (html) {
        pages.push({ url, html, fetchedAt: new Date(), category })
      }
      await delay(REQUEST_DELAY_MS)
    }
    return pages
  },

  parseProducts(page: RawCatalogPage): ParsedProduct[] {
    try {
      return parseCategoryPage(page)
    } catch (err) {
      console.error(`[aswak] parse error for ${page.url}:`, (err as Error).message)
      return []
    }
  },

  buildSnapshots(product: ParsedProduct): ProductPrice[] {
    return product.prices
  },
}
