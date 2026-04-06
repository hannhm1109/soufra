import curatedCatalog from "@/lib/data/moroccan-ingredient-prices.json"
import { prisma } from "@/lib/prisma"
import {
  type MarketTierValue,
  type BudgetAssessment,
  assessBudgetFeasibility,
  getConfidenceLabel,
} from "@/lib/budget-utils"

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
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  l: "l",
  liter: "l",
  litre: "l",
  liters: "l",
  litres: "l",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  cup: "cup",
  cups: "cup",
  clove: "pc",
  cloves: "pc",
  piece: "pc",
  pieces: "pc",
  pcs: "pc",
  bunch: "bunch",
  bunches: "bunch",
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
  slice: "slice",
  slices: "slice",
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function stripLeadingQuantity(value: string): string {
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

  if (quantityUnit === "pc" && baseUnit === "dozen") return quantityValue / 12
  if (quantityUnit === "slice" && baseUnit === "loaf") return quantityValue / 10

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

function selectBestSnapshot(
  snapshots: Array<{
    city: string | null
    tier: string
    referencePriceMad: number
    lowPriceMad: number | null
    highPriceMad: number | null
    confidence: number
  }>,
  city: string | null,
  tier: MarketTierValue
) {
  const exactCity = city ? snapshots.find((snapshot) => snapshot.tier === tier && snapshot.city === city) : null
  const national = snapshots.find((snapshot) => snapshot.tier === tier && snapshot.city === null)
  return exactCity ?? national ?? null
}

async function getDatabaseCatalog(city: string | null, tier: MarketTierValue): Promise<CatalogEntry[]> {
  const ingredients = await prisma.ingredient.findMany({
    include: {
      aliases: true,
      priceSnapshots: {
        orderBy: { computedAt: "desc" },
      },
    },
  })

  return ingredients.map((ingredient) => {
    const snapshot = selectBestSnapshot(ingredient.priceSnapshots, city, tier)
    const fallback = (curatedCatalog as CuratedIngredient[]).find((item) => item.slug === ingredient.slug)
    const referencePriceMad = snapshot?.referencePriceMad ?? fallback?.tierPrices[tier] ?? 10
    const lowPriceMad = snapshot?.lowPriceMad ?? fallback?.tierPrices.souk ?? referencePriceMad
    const highPriceMad = snapshot?.highPriceMad ?? fallback?.tierPrices.premium ?? referencePriceMad
    const confidence = snapshot?.confidence ?? (fallback ? 0.72 : 0.45)

    return {
      ingredientId: ingredient.id,
      slug: ingredient.slug,
      name: ingredient.name,
      category: ingredient.category,
      defaultUnit: ingredient.defaultUnit,
      aliases: [
        normalizeText(ingredient.name),
        normalizeText(ingredient.slug),
        ...ingredient.aliases.map((alias) => normalizeText(alias.alias)),
      ],
      referencePriceMad,
      lowPriceMad,
      highPriceMad,
      confidence,
      sourceName: snapshot ? "Soufra price snapshots" : "Soufra curated Moroccan market baseline",
      sourceType: snapshot ? "admin" : "curated",
    } satisfies CatalogEntry
  })
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
  const unitsNeeded = parsedQuantity
    ? convertToBaseUnits(parsedQuantity.value, parsedQuantity.unit, entry.defaultUnit)
    : null

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
