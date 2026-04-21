export const DIFFICULTY_LEVELS = ["easy", "medium", "hard"] as const

export type MacroFields = {
  calories: number
  protein: number
  carbs: number
  fats: number
}

function round1(value: number): number {
  return Number.parseFloat(value.toFixed(1))
}

export function extractJSON(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  return fenced ? fenced[1].trim() : raw.trim()
}

export function toFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = value.replace(/\s+/g, " ").trim()
  return normalized.length > 0 ? normalized : null
}

export function normalizeTextList(value: unknown, maxItems = 20): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeText(item))
    .filter((item): item is string => Boolean(item))
    .slice(0, maxItems)
}

export function getCalorieBounds(target: number) {
  return {
    min: Math.round(target * 0.9),
    max: Math.round(target * 1.1),
  }
}

export function normalizeDifficulty(value: unknown): string {
  const normalized = normalizeText(value)?.toLowerCase() ?? ""
  return DIFFICULTY_LEVELS.includes(normalized as (typeof DIFFICULTY_LEVELS)[number])
    ? normalized
    : "easy"
}

export function ingredientHasQuantity(ingredient: string): boolean {
  return /\d/.test(ingredient)
}

export function reconcileNutrition(meal: MacroFields, target: number) {
  let protein = meal.protein
  let carbs = meal.carbs
  let fats = meal.fats

  if (protein < 0) protein = 0
  if (carbs < 0) carbs = 0
  if (fats < 0) fats = 0

  let calories = Math.round(protein * 4 + carbs * 4 + fats * 9)
  if (calories <= 0) {
    meal.calories = target
    meal.protein = 20
    meal.carbs = 40
    meal.fats = 10
    return
  }

  const bounds = getCalorieBounds(target)
  if (calories < bounds.min || calories > bounds.max) {
    const scale = target / calories
    protein = round1(protein * scale)
    carbs = round1(carbs * scale)
    fats = round1(fats * scale)
    calories = Math.round(protein * 4 + carbs * 4 + fats * 9)
  }

  if (calories < bounds.min || calories > bounds.max) {
    calories = target
  }

  meal.protein = protein
  meal.carbs = carbs
  meal.fats = fats
  meal.calories = calories
}
