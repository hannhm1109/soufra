// Shared types for the pricing system v2.
// These mirror the Prisma enums but are plain TypeScript literals so they
// can be imported by both server and client code without the Prisma runtime.

export type CatalogSource = "aswak_shop" | "aswak_catalog_pdf" | "receipt" | "baseline"
export type MatchType = "exact" | "alias" | "fuzzy" | "manual" | "category_fallback"
export type ConfidenceLevel = "high" | "medium" | "low"
export type ResolutionMethod = "exact_snapshot" | "recent_receipt_avg" | "baseline" | "category_fallback"
export type MarketTierValue = "souk" | "supermarket" | "premium"

// Maps to PriceSourceType enum in the DB (used by GroceryItem.priceSource)
export type LegacyPriceSource = "curated" | "scrape" | "receipt" | "admin"

// A raw HTML page fetched from a catalog source
export interface RawCatalogPage {
  url: string
  html: string
  fetchedAt: Date
  category?: string
}

// A product as parsed from a catalog page, before DB persistence
export interface NormalizedProduct {
  source: CatalogSource
  externalId?: string
  sourceUrl?: string
  rawName: string
  normalizedName: string
  brand?: string
  category?: string
  packLabel?: string
  quantityValue?: number
  quantityUnit?: string
  city?: string
  metadata?: Record<string, unknown>
}

// A price observation linked to a NormalizedProduct
export interface ProductPrice {
  packagePrice: number
  packageQuantityValue?: number
  packageQuantityUnit?: string
  // unitPrice is price per unitBaseUnit (e.g., 10 MAD/kg, 45 MAD/l)
  unitPrice?: number
  unitBaseQuantity?: number
  unitBaseUnit?: string
  isPromo?: boolean
  inStock?: boolean
  capturedAt: Date
  expiresAt?: Date
  city?: string
  marketTier?: MarketTierValue
  confidenceScore: number
  confidenceLevel: ConfidenceLevel
}

// A product with its associated prices, ready for ingestion
export interface ParsedProduct extends NormalizedProduct {
  prices: ProductPrice[]
}

// Result of the 6-step ingredient matching algorithm
export interface MatchResult {
  ingredientId: string
  ingredientSlug: string
  matchType: MatchType
  confidenceScore: number
}

// The final resolved price returned by the resolver
export interface ResolvedPrice {
  // unitPrice is price per ingredient's defaultUnit (MAD)
  unitPrice: number
  packagePrice?: number
  source: CatalogSource | "curated"
  // Legacy source type for backward-compat with GroceryItem.priceSource
  legacySource: LegacyPriceSource
  resolutionMethod: ResolutionMethod
  confidenceLevel: ConfidenceLevel
  confidenceScore: number
  explanation: string
  snapshotId?: string
  capturedAt?: Date
  city?: string
  marketTier: MarketTierValue
  ingredientId?: string
  storeName?: string
}

// Adapter interface — implement this for each catalog source
export interface CatalogAdapter {
  source: CatalogSource
  fetchCatalogPages(): Promise<RawCatalogPage[]>
  parseProducts(page: RawCatalogPage): ParsedProduct[]
  buildSnapshots(product: ParsedProduct): ProductPrice[]
}
