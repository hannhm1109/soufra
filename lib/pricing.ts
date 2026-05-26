import curatedCatalog from "@/lib/data/moroccan-ingredient-prices.json"
import { prisma } from "@/lib/prisma"
import {
  type MarketTierValue,
  type BudgetAssessment,
  assessBudgetFeasibility,
  getConfidenceLabel,
} from "@/lib/budget-utils"
import { resolvePriceBatch } from "@/lib/pricing/resolve"
import type { ResolutionMethod } from "@/lib/pricing/types"

export type { MarketTierValue, BudgetAssessment }
export { assessBudgetFeasibility, getConfidenceLabel }

export type PriceSourceValue = "curated" | "scrape" | "receipt" | "admin"

interface CuratedIngredient {
  slug: string
  name: string
  category: string
  defaultUnit: string
  aliases: string[]
  tierPrices: Record<MarketTierValue, number>
  isSeasonal?: boolean
}

interface CatalogEntry {
  ingredientId?: string
  slug: string
  name: string
  category: string
  defaultUnit: string
  aliases: string[]
  referencePriceMad: number
  lowPriceMad?: number
  highPriceMad?: number
  confidence: number
  sourceName: string
  sourceType: PriceSourceValue
}

export interface IngredientEstimate {
  ingredientId?: string
  canonicalName: string
  displayName: string
  quantity: string
  category: string
  estimatedCost: number
  unitPrice: number
  priceConfidence: number
  priceSource: PriceSourceValue
  sourceLabel: string
  marketTier: MarketTierValue
}


const countUnits = new Set(["pc", "bunch", "can", "jar", "pot", "dozen", "loaf", "bag"])

const UNIT_NORMALIZE: Record<string, string> = {
  // Weight
  g: "g",
  gr: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilo: "kg",
  kilogram: "kg",
  kilograms: "kg",
  // Volume
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  cl: "cl",          // 1 cl = 10 ml — kept as own unit, converted in convertToBaseUnits
  l: "l",
  liter: "l",
  litre: "l",
  liters: "l",
  litres: "l",
  // Spoon / cup
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  cup: "cup",
  cups: "cup",
  // Pieces / counts
  clove: "pc",
  cloves: "pc",
  piece: "pc",
  pieces: "pc",
  pcs: "pc",
  egg: "pc",
  eggs: "pc",
  // Bunches / herbs
  bunch: "bunch",
  bunches: "bunch",
  sprig: "bunch",
  sprigs: "bunch",
  // Containers
  can: "can",
  cans: "can",
  jar: "jar",
  jars: "jar",
  pot: "pot",
  pots: "pot",
  loaf: "loaf",
  loaves: "loaf",
  bag: "bag",
  bags: "bag",
  // Slices
  slice: "slice",
  slices: "slice",
  // Approximate small amounts for recipe-style descriptions
  pinch: "tsp",
  pinches: "tsp",
  handful: "tbsp",
  handfuls: "tbsp",
  // Produce plurals → singular so mixed plurals aggregate correctly
  // (singular forms intentionally absent — the count-fix uses them as food-name units)
  carrots: "carrot",
  tomatoes: "tomato",
  onions: "onion",
  potatoes: "potato",
  zucchinis: "zucchini",
  peppers: "pepper",
  bananas: "banana",
  apples: "apple",
  oranges: "orange",
  lemons: "lemon",
  limes: "lime",
  peaches: "peach",
  pears: "pear",
  fillets: "fillet",
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[.,\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export function stripLeadingQuantity(value: string): string {
  return normalizeText(value).replace(
    /^((\d+(?:[./]\d+)?)|half|quarter|one|two|three)\s*([a-z]+)?\s+/i,
    ""
  )
}

function parseNumberToken(token: string): number | null {
  if (token.includes("/")) {
    const [left, right] = token.split("/")
    const numerator = Number.parseFloat(left)
    const denominator = Number.parseFloat(right)
    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
      return numerator / denominator
    }
    return null
  }

  const parsed = Number.parseFloat(token)
  return Number.isFinite(parsed) ? parsed : null
}

function parseQuantity(input: string): { value: number; unit: string } | null {
  const normalized = normalizeText(input)
  const match = normalized.match(/^(\d+(?:[./]\d+)?)\s*([a-z]+)?/)
  if (!match) return null

  const value = parseNumberToken(match[1])
  if (value === null) return null

  const rawUnit = match[2] ?? ""
  return {
    value,
    unit: UNIT_NORMALIZE[rawUnit] ?? rawUnit ?? "",
  }
}

function convertToBaseUnits(
  quantityValue: number,
  quantityUnit: string,
  baseUnit: string
): number | null {
  if (!quantityUnit || quantityUnit === baseUnit) return quantityValue

  if (quantityUnit === "g" && baseUnit === "kg") return quantityValue / 1000
  if (quantityUnit === "kg" && baseUnit === "g") return quantityValue * 1000
  if (quantityUnit === "ml" && baseUnit === "l") return quantityValue / 1000
  if (quantityUnit === "l" && baseUnit === "ml") return quantityValue * 1000

  // 1 cl = 10 ml (UNIT_NORMALIZE keeps cl as "cl" rather than collapsing to ml)
  if (quantityUnit === "cl") {
    if (baseUnit === "ml") return quantityValue * 10
    if (baseUnit === "l") return quantityValue / 100
  }

  if (quantityUnit === "tbsp") {
    if (baseUnit === "l") return (quantityValue * 15) / 1000
    if (baseUnit === "ml") return quantityValue * 15
    if (baseUnit === "bag") return quantityValue * 0.18
    if (baseUnit === "jar") return quantityValue * 0.1
  }

  if (quantityUnit === "tsp") {
    if (baseUnit === "l") return (quantityValue * 5) / 1000
    if (baseUnit === "ml") return quantityValue * 5
    if (baseUnit === "bag") return quantityValue * 0.08
    if (baseUnit === "jar") return quantityValue * 0.04
  }

  if (quantityUnit === "cup") {
    if (baseUnit === "l") return (quantityValue * 240) / 1000
    if (baseUnit === "ml") return quantityValue * 240
    if (baseUnit === "kg") return quantityValue * 0.12
  }

  // Weight to bunch: ~250g per bunch of leafy herbs/veg (spinach, parsley, cilantro, mint)
  if (quantityUnit === "g" && baseUnit === "bunch") return quantityValue / 250
  if (quantityUnit === "kg" && baseUnit === "bunch") return (quantityValue * 1000) / 250

  if (quantityUnit === "pc" && baseUnit === "dozen") return quantityValue / 12
  if (quantityUnit === "slice" && baseUnit === "loaf") return quantityValue / 20  // ~20 slices per loaf

  return null
}

function estimatePurchaseCost(unitsNeeded: number, unitPrice: number, defaultUnit: string): number {
  if (unitsNeeded <= 0) return unitPrice * 0.35

  if (countUnits.has(defaultUnit)) {
    if (unitsNeeded >= 1) return Math.ceil(unitsNeeded) * unitPrice

    const floorShare = defaultUnit === "dozen" ? 0.2 : 0.35
    return Math.max(unitPrice * floorShare, unitPrice * unitsNeeded)
  }

  return unitPrice * unitsNeeded
}

function findCatalogEntry(catalog: CatalogEntry[], ingredientName: string): CatalogEntry | null {
  const normalizedName = stripLeadingQuantity(ingredientName)

  for (const entry of catalog) {
    if (entry.aliases.some((alias) => normalizedName === alias)) {
      return entry
    }
  }

  for (const entry of catalog) {
    if (entry.aliases.some((alias) => normalizedName.includes(alias) || alias.includes(normalizedName))) {
      return entry
    }
  }

  return null
}

function buildCuratedCatalog(tier: MarketTierValue): CatalogEntry[] {
  return (curatedCatalog as CuratedIngredient[]).map((ingredient) => ({
    slug: ingredient.slug,
    name: ingredient.name,
    category: ingredient.category,
    defaultUnit: ingredient.defaultUnit,
    aliases: [...new Set([ingredient.name, ingredient.slug, ...ingredient.aliases].map((alias) => normalizeText(alias)))],
    referencePriceMad: ingredient.tierPrices[tier],
    lowPriceMad: ingredient.tierPrices.souk,
    highPriceMad: ingredient.tierPrices.premium,
    confidence: 0.72,
    sourceName: "Soufra curated Moroccan market baseline",
    sourceType: "curated",
  }))
}


async function getDatabaseCatalog(city: string | null, tier: MarketTierValue): Promise<CatalogEntry[]> {
  // Load ingredient metadata (names, aliases, units) — no price data here
  const ingredients = await prisma.ingredient.findMany({
    include: { aliases: true },
  })

  if (ingredients.length === 0) return buildCuratedCatalog(tier)

  // Delegate ALL price resolution to resolvePriceBatch.
  // It checks (in priority order): PriceSnapshot → IngredientPriceSnapshot → BaselineIngredientPrice
  const resolvedPrices = await resolvePriceBatch(
    ingredients.map((i) => ({ id: i.id, slug: i.slug, defaultUnit: i.defaultUnit })),
    tier,
    city
  )

  return ingredients.map((ingredient) => {
    const resolved = resolvedPrices.get(ingredient.id)
    const fallback = (curatedCatalog as CuratedIngredient[]).find(
      (item) => item.slug === ingredient.slug
    )

    const referencePriceMad = resolved?.unitPrice ?? fallback?.tierPrices[tier] ?? 10
    const lowPriceMad = fallback?.tierPrices.souk ?? Math.round(referencePriceMad * 0.85 * 10) / 10
    const highPriceMad = fallback?.tierPrices.premium ?? Math.round(referencePriceMad * 1.15 * 10) / 10
    const confidence = resolved?.confidenceScore ?? (fallback ? 0.72 : 0.45)
    const sourceName = resolved
      ? (resolved.storeName ?? resolutionLabel(resolved.resolutionMethod, resolved.source))
      : "Soufra curated Moroccan market baseline"
    const sourceType: PriceSourceValue = resolved?.legacySource ?? "curated"

    return {
      ingredientId: ingredient.id,
      slug: ingredient.slug,
      name: ingredient.name,
      category: ingredient.category,
      defaultUnit: ingredient.defaultUnit,
      aliases: [
        normalizeText(ingredient.name),
        normalizeText(ingredient.slug),
        ...ingredient.aliases.map((a) => normalizeText(a.alias)),
      ],
      referencePriceMad,
      lowPriceMad,
      highPriceMad,
      confidence,
      sourceName,
      sourceType,
    } satisfies CatalogEntry
  })
}

function resolutionLabel(method: ResolutionMethod, source?: string): string {
  if (method === "exact_snapshot") {
    if (source === "aswak_shop" || source === "aswak_catalog_pdf") return "Recent store prices"
    if (source === "receipt") return "Recent receipt prices"
    return "Recent store prices"
  }
  if (method === "recent_receipt_avg") return "Recent receipt prices"
  if (method === "baseline") return "Soufra price snapshots"
  return "Soufra curated Moroccan market baseline"
}

export async function getPriceCatalog(city: string | null, tier: MarketTierValue): Promise<CatalogEntry[]> {
  try {
    const catalog = await getDatabaseCatalog(city, tier)
    if (catalog.length === 0) return buildCuratedCatalog(tier)
    return catalog
  } catch {
    return buildCuratedCatalog(tier)
  }
}

export async function estimateIngredientPrice(
  ingredientText: string,
  tier: MarketTierValue,
  city: string | null
): Promise<IngredientEstimate> {
  const catalog = await getPriceCatalog(city, tier)
  return estimateIngredientPriceWithCatalog(ingredientText, tier, catalog)
}

export function estimateIngredientPriceWithCatalog(
  ingredientText: string,
  tier: MarketTierValue,
  catalog: CatalogEntry[]
): IngredientEstimate {
  const entry = findCatalogEntry(catalog, ingredientText)

  if (!entry) {
    return {
      canonicalName: stripLeadingQuantity(ingredientText),
      displayName: ingredientText,
      quantity: parseQuantity(ingredientText)?.value?.toString() ?? "1",
      category: guessCategory(ingredientText),
      estimatedCost: 12,
      unitPrice: 12,
      priceConfidence: 0.3,
      priceSource: "curated",
      sourceLabel: "Generic fallback estimate",
      marketTier: tier,
    }
  }

  const parsedQuantity = parseQuantity(ingredientText)
  let unitsNeeded = parsedQuantity
    ? convertToBaseUnits(parsedQuantity.value, parsedQuantity.unit, entry.defaultUnit)
    : null

  // When the unit is a food name (e.g. "onion", "eggs", "bell") rather than a
  // standard unit, treat the number as a count. Guard: only apply when the parsed
  // unit is NOT a known standard unit — "500ml" must NOT be treated as 500 pieces.
  if (unitsNeeded === null && parsedQuantity) {
    const standardUnits = new Set(Object.values(UNIT_NORMALIZE))
    const isStandardUnit = standardUnits.has(parsedQuantity.unit) || parsedQuantity.unit === ""
    if (!isStandardUnit) {
      if (countUnits.has(entry.defaultUnit)) {
        unitsNeeded = parsedQuantity.value
      } else if (entry.defaultUnit === "kg") {
        unitsNeeded = parsedQuantity.value * 0.15
      }
    }
  }

  const estimatedCost = estimatePurchaseCost(unitsNeeded ?? 0.35, entry.referencePriceMad, entry.defaultUnit)

  return {
    ingredientId: entry.ingredientId,
    canonicalName: entry.name,
    displayName: ingredientText,
    quantity: formatDisplayQuantity(ingredientText),
    category: entry.category,
    estimatedCost: roundCurrency(estimatedCost),
    unitPrice: roundCurrency(entry.referencePriceMad),
    priceConfidence: entry.confidence,
    priceSource: entry.sourceType,
    sourceLabel: entry.sourceName,
    marketTier: tier,
  }
}

export function groupIngredients(ingredients: string[]): Map<string, string[]> {
  const groups = new Map<string, string[]>()

  for (const ingredient of ingredients) {
    const normalized = stripLeadingQuantity(ingredient)
    const match = Array.from(groups.keys()).find((existing) => {
      const baseExisting = stripLeadingQuantity(existing)
      return (
        normalized === baseExisting ||
        normalized.includes(baseExisting) ||
        baseExisting.includes(normalized)
      )
    })

    if (match) {
      groups.get(match)?.push(ingredient)
    } else {
      groups.set(ingredient, [ingredient])
    }
  }

  return groups
}

export function aggregateQuantity(instances: string[]): string {
  if (instances.length === 1) {
    return formatDisplayQuantity(instances[0])
  }

  const parsed = instances
    .map(parseQuantity)
    .filter((item): item is { value: number; unit: string } => item !== null)

  if (parsed.length === instances.length) {
    const units = [...new Set(parsed.map((item) => item.unit))]
    if (units.length === 1) {
      const total = parsed.reduce((sum, item) => sum + item.value, 0)
      const normalizedTotal = Number.isInteger(total) ? total.toString() : total.toFixed(1)
      const unit = units[0]
      return unit ? `${normalizedTotal}${unit}` : normalizedTotal
    }
  }

  return `x${instances.length}`
}


export function guessCategory(ingredientName: string): string {
  const lower = normalizeText(ingredientName)
  if (["chicken", "beef", "lamb", "fish", "egg", "tuna", "sardine"].some((token) => lower.includes(token))) {
    return "Meat & Protein"
  }
  if (["tomato", "onion", "garlic", "carrot", "zucchini", "spinach", "potato", "pepper", "eggplant", "lettuce", "cucumber", "parsley", "cilantro", "mint"].some((token) => lower.includes(token))) {
    return "Vegetables"
  }
  if (["banana", "apple", "orange", "date", "olive", "lemon"].some((token) => lower.includes(token))) {
    return "Fruits"
  }
  if (["milk", "yogurt", "cheese", "butter", "jben"].some((token) => lower.includes(token))) {
    return "Dairy"
  }
  if (["rice", "couscous", "pasta", "bread", "oats", "flour", "msemen"].some((token) => lower.includes(token))) {
    return "Grains"
  }
  return "Pantry & Spices"
}

function formatDisplayQuantity(ingredientText: string): string {
  const match = normalizeText(ingredientText).match(/^(\d+(?:[./]\d+)?)\s*([a-z]+)?/)
  if (!match) return "1"
  return `${match[1]}${match[2] ?? ""}`
}

function roundCurrency(value: number): number {
  return Number.parseFloat(value.toFixed(1))
}
