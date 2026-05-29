// Price resolver: given an ingredient ID + market context, returns the best
// available price with full confidence metadata.
//
// Priority chain:
//   1. Fresh PriceSnapshot (new table) — max age 30 days, prefer < 7 days for "high"
//   2. IngredientPriceSnapshot (existing aggregate table)
//   3. BaselineIngredientPrice (DB-backed fallback seeded from JSON)
//   4. null → caller falls back to curated JSON / generic estimate
//
// All Decimal values from Prisma are converted to number with .toNumber().

import { prisma } from "@/lib/prisma"
import { convertToBaseUnits } from "./normalize"
import type {
  ConfidenceLevel,
  LegacyPriceSource,
  MarketTierValue,
  ResolvedPrice,
} from "./types"
import type { MarketTier } from "@prisma/client"

const SNAPSHOT_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000 // 30 days
const HIGH_CONFIDENCE_AGE_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function toNum(d: { toNumber(): number } | null | undefined): number | null {
  if (d == null) return null
  return d.toNumber()
}

function confidenceFromScore(score: number): ConfidenceLevel {
  if (score >= 0.8) return "high"
  if (score >= 0.55) return "medium"
  return "low"
}

// Human-readable store label for a snapshot, using metadata when available
function snapshotStoreName(source: string, metadata: unknown): string | undefined {
  if (source === "aswak_shop" || source === "aswak_catalog_pdf") return "Aswak Assalam"
  if (source === "receipt") {
    const meta = metadata as Record<string, unknown> | null
    const name = meta?.storeName
    return typeof name === "string" && name ? name : "Receipt"
  }
  return undefined
}

function legacySource(source: string): LegacyPriceSource {
  if (source === "aswak_shop" || source === "aswak_catalog_pdf") return "scrape"
  if (source === "receipt") return "receipt"
  return "curated"
}

function deriveUnitPriceFromPackage(
  packagePrice: number | null,
  packageQty: number | null,
  packageUnit: string | null,
  defaultUnit: string
): number | null {
  if (!packagePrice || packagePrice <= 0 || !packageQty || packageQty <= 0 || !packageUnit) {
    return null
  }

  const packageInDefaultUnit = convertToBaseUnits(packageQty, packageUnit, defaultUnit)
  if (!packageInDefaultUnit || packageInDefaultUnit <= 0) return null

  return packagePrice / packageInDefaultUnit
}

function minimumReasonableUnitPrice(defaultUnit: string): number {
  if (/^\d+(?:\.\d+)?\s*(g|kg|ml|l)$/.test(defaultUnit)) return 0.5

  const floors: Record<string, number> = {
    kg: 2,
    l: 2,
    dozen: 8,
    pot: 2,
    can: 4,
    jar: 4,
    bottle: 4,
    loaf: 1,
    bag: 1,
    bunch: 1,
    pc: 0.5,
  }

  return floors[defaultUnit] ?? 0.2
}

function isImplausibleUnitPrice(unitPrice: number, defaultUnit: string): boolean {
  if (!Number.isFinite(unitPrice) || unitPrice <= 0) return true
  if (unitPrice > 500) return true
  return unitPrice < minimumReasonableUnitPrice(defaultUnit)
}

function selectSnapshotUnitPrice(params: {
  rawUnitPrice: number | null
  rawBaseUnit: string | null
  rawPackagePrice: number | null
  packageQty: number | null
  packageUnit: string | null
  defaultUnit: string
}): number | null {
  const stored =
    params.rawUnitPrice && params.rawUnitPrice > 0 && (!params.rawBaseUnit || params.rawBaseUnit === params.defaultUnit)
      ? params.rawUnitPrice
      : null

  const derived = deriveUnitPriceFromPackage(
    params.rawPackagePrice,
    params.packageQty,
    params.packageUnit,
    params.defaultUnit
  )

  const storedPlausible =
    stored !== null && !isImplausibleUnitPrice(stored, params.defaultUnit) ? stored : null
  const derivedPlausible =
    derived !== null && !isImplausibleUnitPrice(derived, params.defaultUnit) ? derived : null

  if (storedPlausible !== null && derivedPlausible !== null) {
    const ratio = Math.max(storedPlausible, derivedPlausible) / Math.min(storedPlausible, derivedPlausible)
    return ratio > 3 ? derivedPlausible : storedPlausible
  }

  return storedPlausible ?? derivedPlausible
}

export async function resolvePrice(
  ingredientId: string,
  ingredientSlug: string,
  ingredientDefaultUnit: string,
  tier: MarketTierValue,
  city: string | null
): Promise<ResolvedPrice | null> {
  const now = Date.now()
  const cutoff = new Date(now - SNAPSHOT_MAX_AGE_MS)
  const tierEnum = tier as MarketTier

  // ── Step 1: fresh PriceSnapshot ──────────────────────────────────────────
  // Query: exact city + tier first, then national (city IS NULL)
  const snapshots = await prisma.priceSnapshot.findMany({
    where: {
      ingredientId,
      capturedAt: { gte: cutoff },
      isPromo: false,
      OR: [
        { expiresAt: { gte: new Date() } },
        { expiresAt: null },
      ],
    },
    orderBy: { capturedAt: "desc" },
    take: 20,
  })

  const bestSnapshot = selectBestSnapshot(snapshots, city, tier)

  if (bestSnapshot) {
    const rawUnitPrice = toNum(bestSnapshot.unitPrice)
    const rawBaseUnit = bestSnapshot.unitBaseUnit
    const rawPackagePrice = toNum(bestSnapshot.packagePrice)
    const packageQty = bestSnapshot.packageQuantityValue
    const packageUnit = bestSnapshot.packageQuantityUnit

    // Prefer trustworthy package-derived rates when stored snapshot rates look corrupted.
    const unitPrice = selectSnapshotUnitPrice({
      rawUnitPrice,
      rawBaseUnit,
      rawPackagePrice,
      packageQty,
      packageUnit,
      defaultUnit: ingredientDefaultUnit,
    })

    if (unitPrice && unitPrice > 0) {
      const ageMs = now - bestSnapshot.capturedAt.getTime()
      const isRecent = ageMs < HIGH_CONFIDENCE_AGE_MS
      const baseScore = toNum(bestSnapshot.confidenceScore) ?? 0.8
      const recencyBoost = isRecent ? 0 : -0.1
      const score = Math.max(0.3, baseScore + recencyBoost)
      const level = isRecent ? "high" : confidenceFromScore(score)
      const sourceStr = bestSnapshot.source as string

      return {
        unitPrice: Math.round(unitPrice * 10) / 10,
        packagePrice: rawPackagePrice ?? undefined,
        source: bestSnapshot.source as ResolvedPrice["source"],
        legacySource: legacySource(sourceStr),
        resolutionMethod: "exact_snapshot",
        confidenceLevel: level,
        confidenceScore: score,
        explanation: `Price from ${sourceStr.replace("_", " ")} snapshot captured ${Math.round(ageMs / 86400000)} days ago`,
        snapshotId: bestSnapshot.id,
        capturedAt: bestSnapshot.capturedAt,
        city: bestSnapshot.city ?? city ?? undefined,
        marketTier: (bestSnapshot.marketTier as MarketTierValue) ?? tier,
        ingredientId,
        storeName: snapshotStoreName(sourceStr, bestSnapshot.metadata),
      }
    }
  }

  // ── Step 2: existing IngredientPriceSnapshot (computed aggregate) ─────────
  const legacySnapshots = await prisma.ingredientPriceSnapshot.findMany({
    where: { ingredientId, tier: tierEnum },
    orderBy: { computedAt: "desc" },
    take: 5,
  })

  const legacyBest = city
    ? (legacySnapshots.find((s) => s.city === city) ?? legacySnapshots.find((s) => !s.city))
    : legacySnapshots.find((s) => !s.city)

  if (legacyBest && legacyBest.referencePriceMad > 0) {
    const score = Math.min(legacyBest.confidence, 0.78) // cap below fresh snapshot
    return {
      unitPrice: legacyBest.referencePriceMad,
      source: "baseline",
      legacySource: "curated",
      resolutionMethod: "baseline",
      confidenceLevel: confidenceFromScore(score),
      confidenceScore: score,
      explanation: `Computed from ${legacyBest.basedOnPoints} price point(s) in ${tier} market`,
      capturedAt: legacyBest.computedAt,
      city: legacyBest.city ?? city ?? undefined,
      marketTier: tier,
      ingredientId,
    }
  }

  // ── Step 3: BaselineIngredientPrice (DB-seeded from JSON catalog) ─────────
  const baseline = await prisma.baselineIngredientPrice.findFirst({
    where: {
      ingredientId,
      marketTier: tierEnum,
      city: { in: [city ?? "national", "national"] },
    },
    orderBy: [
      // prefer exact city over national
      { city: "asc" },
      { updatedAt: "desc" },
    ],
  })

  if (baseline && baseline.unitPrice.toNumber() > 0) {
    const score = 0.55
    return {
      unitPrice: baseline.unitPrice.toNumber(),
      source: "baseline",
      legacySource: "curated",
      resolutionMethod: "baseline",
      confidenceLevel: "low",
      confidenceScore: score,
      explanation: "Price from internal Moroccan market baseline catalog",
      marketTier: tier,
      ingredientId,
    }
  }

  // ── Step 4: no match — caller falls back to curated JSON ─────────────────
  return null
}

// ─── helpers ─────────────────────────────────────────────────────────────────

type SnapshotRow = {
  id: string
  city: string | null
  marketTier: string | null
  unitPrice: { toNumber(): number } | null
  packagePrice: { toNumber(): number }
  packageQuantityValue: number | null
  packageQuantityUnit: string | null
  unitBaseUnit: string | null
  confidenceScore: { toNumber(): number }
  confidenceLevel: string
  capturedAt: Date
  source: string
  isPromo: boolean
  metadata: unknown
}

function selectBestSnapshot(
  rows: SnapshotRow[],
  city: string | null,
  tier: MarketTierValue
): SnapshotRow | null {
  const tierMatch = rows.filter((r) => r.marketTier === tier || r.marketTier === null)
  const cityExact = city ? tierMatch.filter((r) => r.city === city) : []
  const national = tierMatch.filter((r) => !r.city)
  const candidates = cityExact.length > 0 ? cityExact : national
  // Sort: most recent first, then highest confidence
  candidates.sort((a, b) => {
    const timeDiff = b.capturedAt.getTime() - a.capturedAt.getTime()
    if (timeDiff !== 0) return timeDiff
    return b.confidenceScore.toNumber() - a.confidenceScore.toNumber()
  })
  return candidates[0] ?? null
}

// Resolve prices for a batch of ingredients in one call (fewer DB round-trips)
export async function resolvePriceBatch(
  ingredients: Array<{
    id: string
    slug: string
    defaultUnit: string
  }>,
  tier: MarketTierValue,
  city: string | null
): Promise<Map<string, ResolvedPrice>> {
  const now = Date.now()
  const cutoff = new Date(now - SNAPSHOT_MAX_AGE_MS)
  const ingredientIds = ingredients.map((i) => i.id)
  const tierEnum = tier as MarketTier

  // Batch-fetch all three sources at once
  const [freshSnapshots, legacySnapshots, baselines] = await Promise.all([
    prisma.priceSnapshot.findMany({
      where: {
        ingredientId: { in: ingredientIds },
        capturedAt: { gte: cutoff },
        isPromo: false,
        OR: [
          { expiresAt: { gte: new Date() } },
          { expiresAt: null },
        ],
      },
      orderBy: { capturedAt: "desc" },
    }),
    prisma.ingredientPriceSnapshot.findMany({
      where: { ingredientId: { in: ingredientIds }, tier: tierEnum },
      orderBy: { computedAt: "desc" },
    }),
    // Include city-specific and national baselines
    prisma.baselineIngredientPrice.findMany({
      where: {
        ingredientId: { in: ingredientIds },
        marketTier: tierEnum,
        city: { in: city ? [city, "national"] : ["national"] },
      },
    }),
  ])

  const result = new Map<string, ResolvedPrice>()

  for (const ing of ingredients) {
    // Step 1: fresh snapshots for this ingredient
    const ingSnapshots = freshSnapshots.filter((s) => s.ingredientId === ing.id)
    const bestSnap = selectBestSnapshot(ingSnapshots as SnapshotRow[], city, tier)

    if (bestSnap) {
      const rawUnitPrice = toNum(bestSnap.unitPrice)
      const rawBaseUnit = bestSnap.unitBaseUnit
      const rawPackagePrice = toNum(bestSnap.packagePrice)
      const packageQty = bestSnap.packageQuantityValue
      const packageUnit = bestSnap.packageQuantityUnit

      // Prefer trustworthy package-derived rates when stored snapshot rates look corrupted.
      const unitPrice = selectSnapshotUnitPrice({
        rawUnitPrice,
        rawBaseUnit,
        rawPackagePrice,
        packageQty,
        packageUnit,
        defaultUnit: ing.defaultUnit,
      })

      if (unitPrice && unitPrice > 0) {
        const ageMs = now - bestSnap.capturedAt.getTime()
        const isRecent = ageMs < HIGH_CONFIDENCE_AGE_MS
        const score = Math.max(0.3, (toNum(bestSnap.confidenceScore) ?? 0.8) + (isRecent ? 0 : -0.1))
        const resolved: ResolvedPrice = {
          unitPrice: Math.round(unitPrice * 10) / 10,
          packagePrice: rawPackagePrice ?? undefined,
          source: bestSnap.source as ResolvedPrice["source"],
          legacySource: legacySource(bestSnap.source),
          resolutionMethod: "exact_snapshot",
          confidenceLevel: isRecent ? "high" : confidenceFromScore(score),
          confidenceScore: score,
          explanation: `Snapshot from ${bestSnap.source.replace("_", " ")}, ${Math.round(ageMs / 86400000)}d ago`,
          snapshotId: bestSnap.id,
          capturedAt: bestSnap.capturedAt,
          city: bestSnap.city ?? city ?? undefined,
          marketTier: (bestSnap.marketTier as MarketTierValue) ?? tier,
          ingredientId: ing.id,
          storeName: snapshotStoreName(bestSnap.source, bestSnap.metadata),
        }
        result.set(ing.id, resolved)
        continue
      }
    }

    // Step 2: legacy aggregate snapshot
    const legSnaps = legacySnapshots.filter((s) => s.ingredientId === ing.id)
    const legBest = city
      ? (legSnaps.find((s) => s.city === city) ?? legSnaps.find((s) => !s.city))
      : legSnaps.find((s) => !s.city)

    if (legBest && legBest.referencePriceMad > 0) {
      const score = Math.min(legBest.confidence, 0.78)
      result.set(ing.id, {
        unitPrice: legBest.referencePriceMad,
        source: "baseline",
        legacySource: "curated",
        resolutionMethod: "baseline",
        confidenceLevel: confidenceFromScore(score),
        confidenceScore: score,
        explanation: `Aggregate from ${legBest.basedOnPoints} price point(s)`,
        capturedAt: legBest.computedAt,
        city: legBest.city ?? city ?? undefined,
        marketTier: tier,
        ingredientId: ing.id,
      })
      continue
    }

    // Step 3: baseline
    // Prefer city-specific baseline over national fallback
    const base =
      (city ? baselines.find((b) => b.ingredientId === ing.id && b.city === city) : null) ??
      baselines.find((b) => b.ingredientId === ing.id && b.city === "national") ??
      baselines.find((b) => b.ingredientId === ing.id)
    if (base && base.unitPrice.toNumber() > 0) {
      result.set(ing.id, {
        unitPrice: base.unitPrice.toNumber(),
        source: "baseline",
        legacySource: "curated",
        resolutionMethod: "baseline",
        confidenceLevel: "low",
        confidenceScore: 0.55,
        explanation: "Internal Moroccan market baseline",
        marketTier: tier,
        ingredientId: ing.id,
      })
    }
    // Step 4: no match — the Map simply has no entry for this ingredientId
  }

  return result
}

// Write an audit log entry without blocking the caller
export function logResolution(entry: {
  groceryListId?: string
  groceryListItemId?: string
  ingredientId?: string
  resolved: ResolvedPrice
}): void {
  void prisma.priceResolutionLog
    .create({
      data: {
        groceryListId: entry.groceryListId,
        groceryListItemId: entry.groceryListItemId,
        ingredientId: entry.ingredientId,
        chosenSource: entry.resolved.source,
        chosenSnapshotId: entry.resolved.snapshotId,
        resolutionMethod: entry.resolved.resolutionMethod,
        confidenceLevel: entry.resolved.confidenceLevel,
        explanation: entry.resolved.explanation,
      },
    })
    .catch(() => {
      // fire-and-forget — never block grocery generation on audit log
    })
}
