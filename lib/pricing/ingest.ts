// Ingestion pipeline coordinator.
//
// Flow per adapter:
//   1. fetchCatalogPages()   — HTTP fetch of public catalog pages
//   2. parseProducts()       — extract raw product entries
//   3. match to ingredient   — 6-step matching algorithm (lib/pricing/matching.ts)
//   4. write SourceCatalogProduct + PriceSnapshot to DB
//   5. stale snapshot cleanup
//
// The pipeline is designed to be resumable and idempotent:
//   - Products are upserted by a deterministic ID that includes brand + pack size
//     so that "500g pack" and "1kg pack" of the same product stay separate rows
//   - PriceSnapshots accumulate — old ones are kept for history, then pruned
//   - Matching errors are logged and skipped, never throw to the caller

import { prisma } from "@/lib/prisma"
import { matchIngredient } from "./matching"
import type { CatalogAdapter, MatchType, ParsedProduct } from "./types"
import type { IngredientRow } from "./matching"

const SNAPSHOT_PRUNE_DAYS = 60

export interface IngestResult {
  adapter: string
  pagesProcessed: number
  productsFound: number
  productsIngested: number
  matchesCreated: number   // actual ProductIngredientMatch rows written
  snapshotsCreated: number
  errors: number
  durationMs: number
}

interface ManualOverrideRow {
  sourceCatalogProductId: string
  ingredientId: string
  ingredientSlug: string
  matchType: MatchType
  confidenceScore: number
}

// Run a single adapter through the full pipeline
export async function ingestAdapter(adapter: CatalogAdapter): Promise<IngestResult> {
  const start = Date.now()
  let pagesProcessed = 0
  let productsFound = 0
  let productsIngested = 0
  let matchesCreated = 0
  let snapshotsCreated = 0
  let errors = 0

  // Pre-load all active ingredients for matching (avoids per-product DB queries)
  const ingredients: IngredientRow[] = await prisma.ingredient.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      aliases: { select: { alias: true } },
    },
  })

  // Pre-load all existing manual overrides
  const rawOverrides = await prisma.productIngredientMatch.findMany({
    where: { isManualOverride: true },
    select: {
      sourceCatalogProductId: true,
      ingredientId: true,
      matchType: true,
      confidenceScore: true,
      ingredient: { select: { slug: true } },
    },
  })
  const manualOverrides: ManualOverrideRow[] = rawOverrides.map((m) => ({
    sourceCatalogProductId: m.sourceCatalogProductId,
    ingredientId: m.ingredientId,
    ingredientSlug: m.ingredient.slug,
    matchType: m.matchType as MatchType,
    confidenceScore: m.confidenceScore.toNumber(),
  }))

  // Step 1: Fetch catalog pages
  let pages
  try {
    pages = await adapter.fetchCatalogPages()
  } catch (err) {
    console.error(`[ingest:${adapter.source}] fetchCatalogPages failed:`, (err as Error).message)
    return {
      adapter: adapter.source,
      pagesProcessed: 0,
      productsFound: 0,
      productsIngested: 0,
      matchesCreated: 0,
      snapshotsCreated: 0,
      errors: 1,
      durationMs: Date.now() - start,
    }
  }
  pagesProcessed = pages.length

  // Steps 2–4: Parse → match → write
  for (const page of pages) {
    let products: ParsedProduct[]
    try {
      products = adapter.parseProducts(page)
    } catch (err) {
      console.error(`[ingest:${adapter.source}] parse error for ${page.url}:`, (err as Error).message)
      errors++
      continue
    }

    productsFound += products.length

    for (const product of products) {
      try {
        const result = await ingestProduct({ product, adapter, ingredients, manualOverrides })
        productsIngested++
        if (result.matchCreated) matchesCreated++ // only count real DB writes
        snapshotsCreated += result.snapshotsWritten
      } catch (err) {
        console.error(
          `[ingest:${adapter.source}] product "${product.rawName}" error:`,
          (err as Error).message
        )
        errors++
      }
    }
  }

  return {
    adapter: adapter.source,
    pagesProcessed,
    productsFound,
    productsIngested,
    matchesCreated,
    snapshotsCreated,
    errors,
    durationMs: Date.now() - start,
  }
}

interface IngestProductResult {
  matchCreated: boolean
  snapshotsWritten: number
}

// Process one product through steps 3–4
async function ingestProduct({
  product,
  adapter,
  ingredients,
  manualOverrides,
}: {
  product: ParsedProduct
  adapter: CatalogAdapter
  ingredients: IngredientRow[]
  manualOverrides: ManualOverrideRow[]
}): Promise<IngestProductResult> {
  // Step 3a: Upsert SourceCatalogProduct with stable deterministic ID
  const productId = generateProductId(adapter.source, product)
  const catalogProduct = await prisma.sourceCatalogProduct.upsert({
    where: { id: productId },
    update: {
      rawName: product.rawName,
      brand: product.brand,
      category: product.category,
      packLabel: product.packLabel,
      quantityValue: product.quantityValue,
      quantityUnit: product.quantityUnit,
      lastSeenAt: new Date(),
      metadata: (product.metadata ?? {}) as object,
    },
    create: {
      id: productId,
      source: adapter.source,
      externalId: product.externalId,
      sourceUrl: product.sourceUrl,
      rawName: product.rawName,
      normalizedName: product.normalizedName,
      brand: product.brand,
      category: product.category,
      packLabel: product.packLabel,
      quantityValue: product.quantityValue,
      quantityUnit: product.quantityUnit,
      city: product.city,
      metadata: (product.metadata ?? {}) as object,
    },
  })

  // Step 3b: Match to ingredient
  const matchResult = matchIngredient({
    normalizedProductName: product.normalizedName,
    productCategory: product.category,
    ingredients,
    manualOverrides,
    sourceCatalogProductId: catalogProduct.id,
  })

  let matchCreated = false
  if (matchResult) {
    await prisma.productIngredientMatch.upsert({
      where: {
        sourceCatalogProductId_ingredientId: {
          sourceCatalogProductId: catalogProduct.id,
          ingredientId: matchResult.ingredientId,
        },
      },
      update: {
        matchType: matchResult.matchType,
        confidenceScore: matchResult.confidenceScore,
      },
      create: {
        sourceCatalogProductId: catalogProduct.id,
        ingredientId: matchResult.ingredientId,
        matchType: matchResult.matchType,
        confidenceScore: matchResult.confidenceScore,
        isManualOverride: false,
      },
    })
    matchCreated = true
  }

  // Step 4: Write PriceSnapshot(s)
  let snapshotsWritten = 0
  for (const price of product.prices) {
    await prisma.priceSnapshot.create({
      data: {
        ingredientId: matchResult?.ingredientId ?? null,
        sourceCatalogProductId: catalogProduct.id,
        source: adapter.source,
        city: price.city ?? product.city ?? null,
        marketTier: price.marketTier ?? null,
        packagePrice: price.packagePrice,
        packageQuantityValue: price.packageQuantityValue ?? null,
        packageQuantityUnit: price.packageQuantityUnit ?? null,
        unitPrice: price.unitPrice ?? null,
        unitBaseQuantity: price.unitBaseQuantity ?? null,
        unitBaseUnit: price.unitBaseUnit ?? null,
        isPromo: price.isPromo ?? false,
        inStock: price.inStock ?? null,
        confidenceLevel: price.confidenceLevel,
        confidenceScore: price.confidenceScore,
        capturedAt: price.capturedAt,
        expiresAt: price.expiresAt ?? null,
      },
    })
    snapshotsWritten++
  }

  return { matchCreated, snapshotsWritten }
}

// Pruning: remove snapshots older than SNAPSHOT_PRUNE_DAYS
export async function pruneStaleSnapshots(): Promise<number> {
  const cutoff = new Date(Date.now() - SNAPSHOT_PRUNE_DAYS * 24 * 60 * 60 * 1000)
  const { count } = await prisma.priceSnapshot.deleteMany({
    where: { capturedAt: { lt: cutoff } },
  })
  return count
}

// Deterministic product ID.
// Includes brand and pack size so 500g and 1kg variants stay separate rows.
// If externalId is available (from JSON-LD or structured data), it is the sole key.
function generateProductId(source: string, product: ParsedProduct): string {
  const key = product.externalId
    ? `${source}::id:${product.externalId}`
    : buildCompositeKey(source, product)

  // djb2-inspired hash → stable base-36 string
  let hash = 5381
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash) ^ key.charCodeAt(i)
    hash = hash >>> 0 // unsigned 32-bit
  }
  return `cat_${hash.toString(36)}`
}

function buildCompositeKey(source: string, product: ParsedProduct): string {
  const brand = product.brand
    ? `|b:${product.brand.toLowerCase().replace(/\s+/g, "")}`
    : ""
  const pack =
    product.quantityValue != null
      ? `|q:${product.quantityValue}${product.quantityUnit ?? ""}`
      : ""
  return `${source}::${product.normalizedName}${brand}${pack}`
}
