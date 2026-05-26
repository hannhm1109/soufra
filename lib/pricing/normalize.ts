// Text normalization utilities shared across the pricing system.
// Extracted and extended from lib/pricing.ts — the original functions
// in lib/pricing.ts are kept for backward compatibility.

export const UNIT_NORMALIZE: Record<string, string> = {
  g: "g",
  gram: "g",
  grams: "g",
  gr: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  kilo: "kg",
  ml: "ml",
  milliliter: "ml",
  milliliters: "ml",
  millilitre: "ml",
  cl: "cl", // 1cl = 10ml — keep as own unit, converted in convertToBaseUnits
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
  pc: "pc",
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
  dozen: "dozen",
  pack: "pack",
  sachet: "bag",
}

// Remove diacritics so é→e, ç→c, ô→o etc. (handles French and Arabic transliterations)
export function removeAccents(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "")
}

// Lowercase, collapse whitespace, strip common punctuation
export function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[()]/g, " ")
    .replace(/[.,\-_/]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// Full normalization for matching: remove accents + normalize text + naive plural strip
export function normalizeForMatch(value: string): string {
  // Decode HTML entities that appear in scraped product names before any other processing
  // e.g. "huile d&rsquo;olive" → "huile d olive", "&#8211;" → " "
  const decoded = value
    .replace(/&rsquo;|&#8217;|&#x2019;/g, " ")
    .replace(/&lsquo;|&#8216;|&#x2018;/g, " ")
    .replace(/&#8211;|&#x2013;|&ndash;/g, " ")
    .replace(/&#8212;|&#x2014;|&mdash;/g, " ")
    .replace(/&#038;|&amp;/g, " ")
  return removeAccents(normalizeText(decoded))
    .replace(/(?<=[a-z])s\b/g, "") // strip trailing -s plurals only after a letter
    .trim()
}

// Strip a leading quantity token like "2 cups", "500g", "half a", "one"
export function stripLeadingQuantity(value: string): string {
  return normalizeText(value).replace(
    /^((\d+(?:[./]\d+)?)|half|quarter|one|two|three|four|five)\s*([a-z]+)?\s+/i,
    ""
  )
}

function parseNumberToken(token: string): number | null {
  if (token.includes("/")) {
    const [left, right] = token.split("/")
    const n = Number.parseFloat(left)
    const d = Number.parseFloat(right)
    return Number.isFinite(n) && Number.isFinite(d) && d !== 0 ? n / d : null
  }
  const parsed = Number.parseFloat(token)
  return Number.isFinite(parsed) ? parsed : null
}

// Parse "500g", "1.5 kg", "2/3 cup", "12 pieces" → { value, unit }
export function parseQuantity(input: string): { value: number; unit: string } | null {
  const normalized = normalizeText(input)
  // Support patterns like "500g", "1.5 kg", "1/2 cup", "6x120g" (take first segment)
  const match = normalized.match(/(\d+(?:[./]\d+)?)\s*([a-z]+)?/)
  if (!match) return null
  const value = parseNumberToken(match[1])
  if (value === null) return null
  const rawUnit = match[2] ?? ""
  return { value, unit: UNIT_NORMALIZE[rawUnit] ?? rawUnit }
}

// Parse pack labels like "1kg", "500 g", "1L", "6x120g", "12 pièces"
// Returns the per-unit quantity after the x (if present), else the whole pack
export function parsePackLabel(label: string): { value: number; unit: string } | null {
  const normalized = normalizeForMatch(label)
  // "6x120g" → take the per-unit 120g
  const multi = normalized.match(/\d+\s*x\s*(\d+(?:\.\d+)?)\s*([a-z]+)?/)
  if (multi) {
    const value = Number.parseFloat(multi[1])
    const unit = UNIT_NORMALIZE[multi[2] ?? ""] ?? multi[2] ?? ""
    return Number.isFinite(value) ? { value, unit } : null
  }
  return parseQuantity(label)
}

// Separate "Danone Yaourt Naturel 1kg" → { brand: "Danone", generic: "Yaourt Naturel 1kg" }
// Heuristic: first capitalised token that looks like a brand name
const KNOWN_BRANDS = new Set([
  "danone", "lesieur", "huilor", "centrale", "jaouda", "holmarcom",
  "olivia", "afia", "president", "kiri", "philadelphia", "heinz",
  "coca", "pepsi", "schweppes", "nestle", "nesquik", "minute",
  "delmonte", "skippy", "nutella", "activia",
])

export function extractBrand(rawName: string): { brand: string | null; generic: string } {
  const tokens = rawName.trim().split(/\s+/)
  const first = tokens[0].toLowerCase()
  if (KNOWN_BRANDS.has(first)) {
    return { brand: tokens[0], generic: tokens.slice(1).join(" ") }
  }
  return { brand: null, generic: rawName }
}

// Convert a quantity from one unit into the ingredient's defaultUnit
// Returns null if conversion is not known
export function convertToBaseUnits(
  quantityValue: number,
  quantityUnit: string,
  baseUnit: string
): number | null {
  if (!quantityUnit || quantityUnit === baseUnit) return quantityValue

  if (quantityUnit === "g" && baseUnit === "kg") return quantityValue / 1000
  if (quantityUnit === "kg" && baseUnit === "g") return quantityValue * 1000
  if (quantityUnit === "ml" && baseUnit === "l") return quantityValue / 1000
  if (quantityUnit === "l" && baseUnit === "ml") return quantityValue * 1000
  if (quantityUnit === "cl" && baseUnit === "l") return quantityValue / 100
  if (quantityUnit === "cl" && baseUnit === "ml") return quantityValue * 10

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
    if (baseUnit === "g") return quantityValue * 120
  }
  if (quantityUnit === "pc" && baseUnit === "dozen") return quantityValue / 12
  if (quantityUnit === "dozen" && baseUnit === "pc") return quantityValue * 12
  if (quantityUnit === "slice" && baseUnit === "loaf") return quantityValue / 20

  return null
}
