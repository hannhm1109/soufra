// Admin debug endpoint: fetch ONE Aswak page and return parsing diagnostics.
//
// Use this to validate the parser before trusting the cron in production.
// Protected by CRON_SECRET (same as other admin endpoints).
//
// GET /api/admin/pricing/debug-aswak?path=/product-category/fruits-legumes/
//
// Response shows:
//   - How many products each strategy found
//   - Which products have unit data (resolver can use them)
//   - Which products are package-price only (resolver skips them)
//   - First 20 parsed products for inspection

import { NextResponse } from "next/server"
import { aswakAdapter } from "@/lib/pricing/sources/aswak"
import { normalizeForMatch } from "@/lib/pricing/normalize"

export const maxDuration = 30

function isAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== "production"
  return req.headers.get("authorization") === `Bearer ${secret}`
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const categoryPath = searchParams.get("path") ?? "/product-category/fruits-legumes/"
  const url = `https://www.aswakassalam.com${categoryPath}`

  // Fetch the page
  let html: string
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Soufra-PriceBot/1.0; +https://soufra.app/pricing-info)",
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "fr-MA,fr;q=0.9,ar;q=0.8",
      },
      signal: AbortSignal.timeout(12_000),
      cache: "no-store",
    })
    if (!res.ok) {
      return NextResponse.json(
        { error: `Aswak returned HTTP ${res.status}`, url },
        { status: 502 }
      )
    }
    html = await res.text()
  } catch (err) {
    return NextResponse.json(
      { error: `Fetch failed: ${(err as Error).message}`, url },
      { status: 502 }
    )
  }

  // Run through the real adapter parser
  const page = { url, html, fetchedAt: new Date(), category: categoryPath.replace(/^\//, "") }
  const products = aswakAdapter.parseProducts(page)

  const withUnit = products.filter(
    (p) => p.prices[0]?.unitPrice != null || (p.prices[0]?.packageQuantityValue != null && p.prices[0]?.packageQuantityUnit != null)
  )
  const packageOnly = products.filter(
    (p) => p.prices[0]?.unitPrice == null && (p.prices[0]?.packageQuantityValue == null || p.prices[0]?.packageQuantityUnit == null)
  )

  // JSON-LD block count (diagnostic)
  const jsonLdCount = (html.match(/<script[^>]+type="application\/ld\+json"/gi) ?? []).length

  return NextResponse.json({
    url,
    pageSizeKb: Math.round(html.length / 1024),
    jsonLdBlocksFound: jsonLdCount,
    totals: {
      productsFound: products.length,
      withUnitData: withUnit.length,
      packagePriceOnly: packageOnly.length,
    },
    note: packageOnly.length > 0
      ? `${packageOnly.length} products have no pack/unit data — resolver will skip them. Calibrate parseHtmlProducts() in lib/pricing/sources/aswak.ts to extract the unit-price element.`
      : products.length === 0
      ? "No products found — parser needs calibration for this page. Inspect the HTML class names and update parseHtmlProducts()."
      : "All products have usable unit data.",
    // First 20 products for inspection
    products: products.slice(0, 20).map((p) => ({
      rawName: p.rawName,
      normalizedName: normalizeForMatch(p.rawName),
      brand: p.brand ?? null,
      packLabel: p.packLabel ?? null,
      price: {
        packagePrice: p.prices[0]?.packagePrice,
        packageQuantityValue: p.prices[0]?.packageQuantityValue ?? null,
        packageQuantityUnit: p.prices[0]?.packageQuantityUnit ?? null,
        unitPrice: p.prices[0]?.unitPrice ?? null,
        unitBaseUnit: p.prices[0]?.unitBaseUnit ?? null,
        confidenceScore: p.prices[0]?.confidenceScore,
        confidenceLevel: p.prices[0]?.confidenceLevel,
      },
    })),
  })
}
