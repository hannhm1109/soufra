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

export interface CatalogEntry {
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

interface ParsedQuantity {
  value: number
  unit: string
}

const countUnits = new Set(["pc", "bunch", "can", "jar", "pot", "dozen", "loaf", "bag", "bottle"])

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
  pc: "pc",
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
  bottle: "bottle",
  bottles: "bottle",
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
  breasts: "breast",
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  half: 0.5,
  quarter: 0.25,
}

const QUANTITY_DESCRIPTORS = new Set([
  "small",
  "medium",
  "large",
  "fresh",
  "ripe",
  "whole",
  "sweet",
  "boneless",
  "skinless",
  "raw",
  "cooked",
])

const FOOD_COUNT_UNITS = new Set([
  "apple",
  "banana",
  "orange",
  "lemon",
  "lime",
  "peach",
  "pear",
  "tomato",
  "onion",
  "potato",
  "carrot",
  "zucchini",
  "pepper",
  "bell",
  "eggplant",
  "cucumber",
  "garlic",
  "clove",
  "chicken",
  "breast",
  "fillet",
])

const MEASURE_UNIT_TOKENS = new Set([
  "g",
  "gr",
  "gram",
  "grams",
  "kg",
  "kilo",
  "kilogram",
  "kilograms",
  "ml",
  "cl",
  "l",
  "liter",
  "litre",
  "liters",
  "litres",
  "tbsp",
  "tablespoon",
  "tablespoons",
  "tsp",
  "teaspoon",
  "teaspoons",
  "cup",
  "cups",
  "clove",
  "cloves",
  "piece",
  "pieces",
  "pc",
  "pcs",
  "bunch",
  "bunches",
  "sprig",
  "sprigs",
  "can",
  "cans",
  "jar",
  "jars",
  "pot",
  "pots",
  "loaf",
  "loaves",
  "bag",
  "bags",
  "bottle",
  "bottles",
  "slice",
  "slices",
  "dozen",
  "pack",
  "packs",
  "sachet",
])

const PIECE_WEIGHT_KG_BY_SLUG: Record<string, number> = {
  bananas: 0.12,
  apples: 0.15,
  oranges: 0.15,
  lemons: 0.08,
  tomatoes: 0.12,
  onions: 0.11,
  potatoes: 0.18,
  carrots: 0.08,
  zucchini: 0.2,
  "bell-peppers": 0.16,
  eggplant: 0.3,
  cucumber: 0.25,
  garlic: 0.005,
  "chicken-breast": 0.2,
  "white-fish": 0.18,
}

const PIECE_WEIGHT_KG_BY_UNIT: Record<string, number> = {
  banana: 0.12,
  apple: 0.15,
  orange: 0.15,
  lemon: 0.08,
  lime: 0.06,
  peach: 0.15,
  pear: 0.16,
  tomato: 0.12,
  onion: 0.11,
  potato: 0.18,
  carrot: 0.08,
  zucchini: 0.2,
  pepper: 0.16,
  bell: 0.16,
  eggplant: 0.3,
  cucumber: 0.25,
  garlic: 0.005,
  clove: 0.005,
  chicken: 0.2,
  breast: 0.2,
  fillet: 0.18,
}

const POT_WEIGHT_KG_BY_SLUG: Record<string, number> = {
  yogurt: 0.25,
}

const GENERIC_FALLBACKS: Array<Omit<CatalogEntry, "ingredientId">> = [
  {
    slug: "pear",
    name: "Pear",
    category: "Fruits",
    defaultUnit: "pc",
    aliases: ["pear", "pears", "poire", "poires"],
    referencePriceMad: 3.5,
    confidence: 0.35,
    sourceName: "Generic fallback estimate",
    sourceType: "curated",
  },
  {
    slug: "peach",
    name: "Peach",
    category: "Fruits",
    defaultUnit: "pc",
    aliases: ["peach", "peaches", "peche", "peches"],
    referencePriceMad: 3.5,
    confidence: 0.35,
    sourceName: "Generic fallback estimate",
    sourceType: "curated",
  },
  {
    slug: "quinoa",
    name: "Quinoa",
    category: "Grains",
    defaultUnit: "kg",
    aliases: ["quinoa"],
    referencePriceMad: 120,
    confidence: 0.3,
    sourceName: "Generic fallback estimate",
    sourceType: "curated",
  },
  {
    slug: "soy-sauce",
    name: "Soy sauce",
    category: "Pantry & Spices",
    defaultUnit: "bottle",
    aliases: ["soy sauce", "sauce soja"],
    referencePriceMad: 18,
    confidence: 0.3,
    sourceName: "Generic fallback estimate",
    sourceType: "curated",
  },
  {
    slug: "water",
    name: "Water",
    category: "Pantry & Spices",
    defaultUnit: "l",
    aliases: ["water", "eau"],
    referencePriceMad: 0,
    confidence: 1,
    sourceName: "Free household staple",
    sourceType: "curated",
  },
]

function normalizeUnit(unit: string): string {
  return UNIT_NORMALIZE[unit] ?? unit
}

function isMeasureToken(rawToken: string, normalizedUnit: string): boolean {
  if (!rawToken) return false
  if (rawToken === "egg" || rawToken === "eggs") return false
  return MEASURE_UNIT_TOKENS.has(rawToken) || MEASURE_UNIT_TOKENS.has(normalizedUnit)
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
  const normalized = normalizeText(value)
  const match = normalized.match(/^(\d+(?:[./]\d+)?|half|quarter|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*([a-z]+)?\s*(.*)$/i)
  if (!match) return normalized

  const rawToken = normalizeText(match[2] ?? "")
  const rawUnit = normalizeUnit(rawToken)
  const remainder = (match[3] ?? "").trim()

  if (QUANTITY_DESCRIPTORS.has(rawUnit)) {
    const parts = remainder.split(/\s+/).filter(Boolean)
    while (parts.length > 0 && QUANTITY_DESCRIPTORS.has(parts[0])) {
      parts.shift()
    }
    return parts.join(" ").trim()
  }

  if (!rawToken || isMeasureToken(rawToken, rawUnit)) {
    return remainder
  }

  const ingredientUnit = rawToken === "egg" || rawToken === "eggs" ? rawToken : rawUnit
  return [ingredientUnit, remainder].filter(Boolean).join(" ").trim()
}

function parseNumberToken(token: string): number | null {
  const wordValue = NUMBER_WORDS[token.toLowerCase()]
  if (wordValue != null) return wordValue

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

function parseQuantity(input: string): ParsedQuantity | null {
  const normalized = normalizeText(input)
  const match = normalized.match(/^(\d+(?:[./]\d+)?|half|quarter|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s*([a-z]+)?\s*(.*)$/i)
  if (!match) return null

  const value = parseNumberToken(match[1])
  if (value === null) return null

  let rawUnit = normalizeUnit(match[2] ?? "")
  const remainderWords = (match[3] ?? "").split(/\s+/).filter(Boolean)

  while (QUANTITY_DESCRIPTORS.has(rawUnit) && remainderWords.length > 0) {
    rawUnit = normalizeUnit(remainderWords.shift() ?? "")
  }

  const nextWord = normalizeUnit(remainderWords[0] ?? "")
  if (rawUnit === "chicken" && (nextWord === "breast" || nextWord === "fillet")) {
    rawUnit = nextWord
  }

  return { value, unit: rawUnit }
}

function convertToBaseUnits(
  quantityValue: number,
  quantityUnit: string,
  baseUnit: string
): number | null {
  if (!quantityUnit || quantityUnit === baseUnit) return quantityValue

  const packMatch = baseUnit.match(/^(\d+(?:\.\d+)?)\s*(g|kg|ml|l)$/)
  if (packMatch) {
    const packValue = Number.parseFloat(packMatch[1])
    const packUnit = packMatch[2]
    const quantityInPackUnit = convertToBaseUnits(quantityValue, quantityUnit, packUnit)
    if (quantityInPackUnit != null && packValue > 0) return quantityInPackUnit / packValue
  }

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
  if (quantityUnit === "g" && baseUnit === "pot") return quantityValue / 250
  if (quantityUnit === "kg" && baseUnit === "pot") return (quantityValue * 1000) / 250
  if (quantityUnit === "ml" && baseUnit === "pot") return quantityValue / 250
  if (quantityUnit === "l" && baseUnit === "pot") return (quantityValue * 1000) / 250

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

function defaultUnitsNeeded(entry: CatalogEntry): number {
  return countUnits.has(entry.defaultUnit) ? 1 : 0.35
}

function isStandardUnit(unit: string): boolean {
  return unit === "" || new Set(Object.values(UNIT_NORMALIZE)).has(unit)
}

function volumeToKg(value: number, unit: string): number | null {
  if (unit === "ml") return value / 1000
  if (unit === "cl") return value / 100
  if (unit === "l") return value
  return null
}

function pieceWeightFor(entry: CatalogEntry, unit: string): number | null {
  if (unit === "pc") {
    // "pc" is too generic (could mean a clove or a head of garlic, etc.).
    // Only use the per-unit table — not the slug-specific table — to avoid
    // treating 6 "pc" garlic as 6 cloves × 5g = 30g.
    return PIECE_WEIGHT_KG_BY_UNIT[unit] ?? null
  }
  return PIECE_WEIGHT_KG_BY_SLUG[entry.slug] ?? PIECE_WEIGHT_KG_BY_UNIT[unit] ?? null
}

function convertIngredientQuantity(
  parsed: ParsedQuantity,
  entry: CatalogEntry
): number | null {
  const direct = convertToBaseUnits(parsed.value, parsed.unit, entry.defaultUnit)
  if (direct !== null) return direct

  if (entry.defaultUnit === "kg") {
    if (parsed.unit === "pc" || FOOD_COUNT_UNITS.has(parsed.unit)) {
      const pieceWeight = pieceWeightFor(entry, parsed.unit)
      // Enforce minimum 20g per piece so recipe-level garlic/ginger amounts
      // don't produce near-zero prices (e.g. 6 cloves ≥ 0.12 kg, not 0.03 kg).
      if (pieceWeight !== null) return parsed.value * Math.max(pieceWeight, 0.02)
    }

    // Common AI typo: solid foods occasionally arrive as "500ml chicken".
    // Treat volume as water-density mass for kg-based solid ingredients.
    const kgFromVolume = volumeToKg(parsed.value, parsed.unit)
    if (kgFromVolume !== null) return kgFromVolume
  }

  if (entry.defaultUnit === "dozen" && (parsed.unit === "pc" || parsed.unit === "egg")) {
    return parsed.value / 12
  }

  const potWeight = POT_WEIGHT_KG_BY_SLUG[entry.slug]
  if (entry.defaultUnit === "pot" && potWeight) {
    if (parsed.unit === "g") return parsed.value / (potWeight * 1000)
    if (parsed.unit === "kg") return parsed.value / potWeight
    if (parsed.unit === "ml") return parsed.value / (potWeight * 1000)
    if (parsed.unit === "l") return parsed.value / potWeight
  }

  if (!isStandardUnit(parsed.unit)) {
    if (countUnits.has(entry.defaultUnit)) return parsed.value
    if (entry.defaultUnit === "kg") {
      const pieceWeight = pieceWeightFor(entry, parsed.unit) ?? 0.15
      return parsed.value * pieceWeight
    }
  }

  return null
}

function findGenericFallback(ingredientName: string): CatalogEntry | null {
  const normalizedName = stripLeadingQuantity(ingredientName)
  if (!normalizedName) return null

  for (const entry of GENERIC_FALLBACKS) {
    if (entry.aliases.some((alias) => normalizedName === normalizeText(alias))) {
      return entry
    }
  }
  for (const entry of GENERIC_FALLBACKS) {
    if (entry.aliases.some((alias) => {
      const normalizedAlias = normalizeText(alias)
      return normalizedAlias.length >= 4 && normalizedName.includes(normalizedAlias)
    })) {
      return entry
    }
  }
  return null
}

function catalogAliases(entry: CatalogEntry): string[] {
  return [...new Set([entry.name, entry.slug, ...entry.aliases].map(normalizeText).filter(Boolean))]
}

function containsWholePhrase(haystack: string, needle: string): boolean {
  return ` ${haystack} `.includes(` ${needle} `)
}

function findCatalogEntry(catalog: CatalogEntry[], ingredientName: string): CatalogEntry | null {
  const normalizedName = stripLeadingQuantity(ingredientName)
  if (!normalizedName) return null

  for (const entry of catalog) {
    const aliases = catalogAliases(entry)
    if (aliases.some((alias) => normalizedName === alias)) {
      return entry
    }
  }

  for (const entry of catalog) {
    const aliases = catalogAliases(entry)
    if (aliases.some((alias) => {
      if (alias.length < 4 || normalizedName.length < 4) return false
      return containsWholePhrase(normalizedName, alias) || containsWholePhrase(alias, normalizedName)
    })) {
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
  const entry = findCatalogEntry(catalog, ingredientText) ?? findGenericFallback(ingredientText)

  if (!entry) {
    return {
      canonicalName: stripLeadingQuantity(ingredientText),
      displayName: ingredientText,
      quantity: formatDisplayQuantity(ingredientText),
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
  const unitsNeeded = parsedQuantity ? convertIngredientQuantity(parsedQuantity, entry) : null

  // When the unit is a food name (e.g. "onion", "eggs", "bell") rather than a
  // standard unit, treat the number as a count. Guard: only apply when the parsed
  // unit is NOT a known standard unit — "500ml" must NOT be treated as 500 pieces.
  // Ingredient-aware conversion above handles food-name units and AI unit typos.

  const estimatedCost = estimatePurchaseCost(
    unitsNeeded ?? defaultUnitsNeeded(entry),
    entry.referencePriceMad,
    entry.defaultUnit
  )

  return {
    ingredientId: entry.ingredientId,
    canonicalName: entry.name,
    displayName: ingredientText,
    quantity: formatDisplayQuantity(ingredientText, entry, unitsNeeded),
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
    const normalized = canonicalIngredientKey(stripLeadingQuantity(ingredient))
    const match = Array.from(groups.keys()).find((existing) => {
      const baseExisting = canonicalIngredientKey(stripLeadingQuantity(existing))
      if (!normalized || !baseExisting) return false
      // Whole-word containment, not raw substring: prevents "pea" matching "peach"
      // or "pepper" swallowing "black pepper".
      return (
        normalized === baseExisting ||
        containsWholePhrase(normalized, baseExisting) ||
        containsWholePhrase(baseExisting, normalized)
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
    .filter((item): item is ParsedQuantity => item !== null)

  if (parsed.length === instances.length) {
    const units = [...new Set(parsed.map((item) => item.unit))]
    if (units.length === 1) {
      const total = parsed.reduce((sum, item) => sum + item.value, 0)
      return formatQuantity(total, units[0])
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

function canonicalIngredientKey(value: string): string {
  // Normalize plurals to singular so "2 carrots" groups with "1 carrot".
  // IMPORTANT: do NOT collapse "bell pepper" to bare "pepper" — that makes it
  // a substring of "black pepper" (a spice) and merges the two into one line.
  // Keep multi-word produce names intact; only singularize the head noun.
  return normalizeText(value)
    .replace(/\bsweet\s+potatoes\b/g, "sweet potato")
    .replace(/\bbell\s+peppers\b/g, "bell pepper")
    .replace(/\bcarrots\b/g, "carrot")
    .replace(/\btomatoes\b/g, "tomato")
    .replace(/\bonions\b/g, "onion")
    .replace(/\bpotatoes\b/g, "potato")
    .replace(/\bzucchinis\b/g, "zucchini")
    .replace(/\bpeppers\b/g, "pepper")
    .replace(/\bbananas\b/g, "banana")
    .replace(/\bapples\b/g, "apple")
    .replace(/\boranges\b/g, "orange")
    .replace(/\blemons\b/g, "lemon")
    .replace(/\bpeaches\b/g, "peach")
    .replace(/\bpears\b/g, "pear")
}

function pluralizeCountUnit(unit: string, value: number): string {
  if (value === 1) return unit
  const irregular: Record<string, string> = {
    pc: "pc",
    bunch: "bunches",
    loaf: "loaves",
    bell: "bell peppers",
    breast: "breasts",
    fillet: "fillets",
    garlic: "garlic",
    peach: "peaches",
    tomato: "tomatoes",
    potato: "potatoes",
    zucchini: "zucchini",
  }
  return irregular[unit] ?? `${unit}s`
}

function formatQuantity(value: number, unit: string): string {
  const normalizedValue = Number.isInteger(value) ? String(value) : value.toFixed(1)
  if (!unit) return normalizedValue

  if (["g", "kg", "ml", "cl", "l"].includes(unit)) return `${normalizedValue}${unit}`
  if (["tsp", "tbsp", "cup"].includes(unit)) return `${normalizedValue} ${unit}`
  return `${normalizedValue} ${pluralizeCountUnit(unit, value)}`
}

function formatDisplayQuantity(
  ingredientText: string,
  entry?: CatalogEntry,
  unitsNeeded?: number | null
): string {
  const parsed = parseQuantity(ingredientText)
  if (!parsed) return "1"

  // Eggs are priced per dozen but counted individually — show "8 eggs", not "8 pc".
  if (entry?.slug === "eggs" && (parsed.unit === "pc" || parsed.unit === "egg" || parsed.unit === "")) {
    return `${Number.isInteger(parsed.value) ? parsed.value : parsed.value.toFixed(1)} ${parsed.value === 1 ? "egg" : "eggs"}`
  }

  if (
    entry?.defaultUnit === "kg" &&
    unitsNeeded != null &&
    ["ml", "cl", "l"].includes(parsed.unit)
  ) {
    const grams = Math.round(unitsNeeded * 1000)
    return `${grams}g`
  }

  return formatQuantity(parsed.value, parsed.unit)
}

function roundCurrency(value: number): number {
  return Number.parseFloat(value.toFixed(1))
}
