// Diagnostic script: validate the Aswak parser against a real page.
//
// Usage:
//   npx tsx scripts/test-aswak-parser.ts
//   npx tsx scripts/test-aswak-parser.ts /boucherie-et-volaille
//
// What it does:
//   1. Fetches ONE Aswak category page
//   2. Reports how many products each extraction strategy found
//   3. Prints the first 10 parsed products with all fields
//   4. Flags products that have price but no unit data (resolver will skip them)
//
// After looking at the output:
//   - If jsonLd=0 and html=0: inspect the raw HTML (saved to /tmp/aswak-debug.html)
//   - If jsonLd>0 but packLabel missing: JSON-LD lacks quantity, check description field
//   - If html>0: check that class names match the real DOM and adjust parseHtmlProducts()
//
// Run this before enabling the cron in production.

const ASWAK_BASE = "https://www.aswakassalam.com"
const DEFAULT_PATH = "/product-category/fruits-legumes/"

const categoryPath = process.argv[2] ?? DEFAULT_PATH
const url = `${ASWAK_BASE}${categoryPath}`

async function main() {
  console.log(`\n[test-aswak-parser] Fetching: ${url}\n`)

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Soufra-PriceBot/1.0; +https://soufra.app/pricing-info)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "fr-MA,fr;q=0.9,ar;q=0.8",
    },
    signal: AbortSignal.timeout(15_000),
  })

  if (!res.ok) {
    console.error(`HTTP ${res.status} — page not reachable or blocked`)
    process.exit(1)
  }

  const html = await res.text()
  console.log(`Page size: ${(html.length / 1024).toFixed(1)} KB`)

  // ── Strategy A: JSON-LD ──────────────────────────────────────────────────
  const jsonLdBlocks = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)]
  console.log(`\nJSON-LD blocks found: ${jsonLdBlocks.length}`)

  const jsonLdProducts: Array<{
    name: string
    price: string
    packLabel?: string
    unitPriceText?: string
    description?: string
  }> = []

  for (const block of jsonLdBlocks) {
    let data: unknown
    try { data = JSON.parse(block[1]) } catch { continue }
    const items = Array.isArray(data) ? data : [data]
    for (const item of items) {
      if (typeof item !== "object" || item === null) continue
      const p = item as Record<string, unknown>
      const types = Array.isArray(p["@type"]) ? p["@type"] : [p["@type"] ?? ""]
      if (!types.includes("Product")) continue

      const name = p["name"] as string | undefined
      const offers = p["offers"] as Record<string, unknown> | undefined
      const price = offers?.["price"] ?? p["price"]
      const description = (p["description"] ?? offers?.["description"]) as string | undefined

      if (!name || price == null) continue

      const packMatch = (description ?? name).match(/\b(\d+(?:[.,]\d+)?\s*(?:kg|g|[Ll]|cl|ml|pièce|piece))\b/i)
      jsonLdProducts.push({
        name,
        price: String(price),
        packLabel: packMatch?.[1],
        description: description?.slice(0, 80),
      })
    }
  }
  console.log(`JSON-LD products: ${jsonLdProducts.length}`)

  // ── Strategy B: HTML regex ───────────────────────────────────────────────
  // Aswak (WooCommerce Porto): price format is <bdi>23,95&nbsp;<span>Dh</span></bdi>
  // Number comes FIRST, then &nbsp; (HTML entity), then "Dh". The old capture of
  // the price element's first </tag> content gave "Dh" (the currency symbol span).
  // Fix: use the working block pattern but extract price via &nbsp;-aware regex on block.
  const htmlProducts: Array<{ name: string; price: string; packLabel?: string; unitPriceText?: string }> = []
  const pattern = /class="[^"]*product[^"]*"[\s\S]{0,800}?class="[^"]*(?:name|title|libelle)[^"]*"[^>]*>([\s\S]{1,120}?)<\/[\w]+>[\s\S]{0,500}?class="[^"]*(?:prix|price)[^"]*"[^>]*>([\s\S]{1,60}?)<\/[\w]+>/gi

  for (const match of html.matchAll(pattern)) {
    const block = match[0]
    const rawName = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    if (!rawName) continue

    // Aswak price HTML: <bdi>23,95&nbsp;<span>Dh</span></bdi>
    // The number is the first text node in <bdi>, before &nbsp; or any nested tag.
    let price = ""
    const bdiM = block.match(/<bdi>([\d,.\s]+?)(?:&|<)/)
    if (bdiM) price = bdiM[1].trim()
    if (!price) continue

    const unitM = block.match(/([\d,.]+\s*(?:DH|MAD)?\s*\/\s*(?:kg|g|l|L|ml|pièce|piece))/i)
    const packM = block.match(/(?:au\s|par\s)?(\d+(?:[.,]\d+)?\s*(?:kg|g|[Ll]|cl|ml))/i)
    htmlProducts.push({ name: rawName, price, unitPriceText: unitM?.[1], packLabel: packM?.[1] })
  }
  console.log(`HTML-pattern products: ${htmlProducts.length}`)

  // ── Merged result ────────────────────────────────────────────────────────
  const all = [...jsonLdProducts, ...htmlProducts]
  const withUnit = all.filter(p => p.unitPriceText || p.packLabel)
  const withoutUnit = all.filter(p => !p.unitPriceText && !p.packLabel)

  console.log(`\nTotal merged products: ${all.length}`)
  console.log(`  With unit/pack data:    ${withUnit.length}  ← resolver CAN derive unitPrice`)
  console.log(`  Package-price only:     ${withoutUnit.length}  ← resolver may SKIP these`)

  if (all.length === 0) {
    console.log("\n⚠️  NO PRODUCTS FOUND — parser needs calibration for this page.")
    console.log("   Inspect the raw HTML below (first 3000 chars) to find product class names:\n")
    console.log(html.slice(0, 3000))
    console.log("\n   Look for repeated elements that contain product name + price and note their class names.")
    console.log("   Then update parseHtmlProducts() in lib/pricing/sources/aswak.ts.\n")
    // Save full HTML for offline inspection
    try {
      const { writeFileSync } = await import("fs")
      writeFileSync("/tmp/aswak-debug.html", html, "utf8")
      console.log("   Full HTML saved to /tmp/aswak-debug.html")
    } catch {
      // /tmp might not exist on Windows — write to cwd instead
      try {
        const { writeFileSync } = await import("fs")
        writeFileSync("aswak-debug.html", html, "utf8")
        console.log("   Full HTML saved to aswak-debug.html (current directory)")
      } catch { /* ignore */ }
    }
    process.exit(1)
  }

  // ── Print first 10 products ──────────────────────────────────────────────
  console.log("\nFirst 10 products:")
  for (const p of all.slice(0, 10)) {
    const flag = !p.unitPriceText && !p.packLabel ? "  ⚠️  no unit data" : ""
    console.log(`  ${p.name.slice(0, 40).padEnd(40)} | ${p.price.padEnd(10)} | pack: ${(p.packLabel ?? "—").padEnd(10)} | unit: ${p.unitPriceText ?? "—"}${flag}`)
  }

  if (withoutUnit.length > 0) {
    console.log(`\n⚠️  ${withoutUnit.length} products have no pack/unit data.`)
    console.log("   These will be stored with packagePrice only.")
    console.log("   The resolver ignores them UNLESS packageQuantityValue + packageQuantityUnit are present.")
    console.log("   Fix: add pack label extraction for the page's price-per-unit element in parseHtmlProducts().")
  }

  console.log("\n✓ Parser diagnostic complete.\n")
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
