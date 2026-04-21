export const SUPPORTED_CUISINES = [
  "moroccan",
  "mediterranean",
  "healthy",
  "middle_eastern",
  "italian",
] as const

export type SupportedCuisine = (typeof SUPPORTED_CUISINES)[number]

export function sanitizeCuisinePreferences(input: unknown): SupportedCuisine[] {
  if (!Array.isArray(input)) return []

  const allowed = new Set<string>(SUPPORTED_CUISINES)
  const seen = new Set<string>()

  return input.filter((value): value is SupportedCuisine => {
    if (typeof value !== "string") return false
    if (!allowed.has(value) || seen.has(value)) return false
    seen.add(value)
    return true
  })
}
