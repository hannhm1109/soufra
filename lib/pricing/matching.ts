// 6-step ingredient matching algorithm.
//
// Step 1 — manual override   (ProductIngredientMatch.isManualOverride = true)
// Step 2 — exact alias match (IngredientAlias exact)
// Step 3 — exact slug/name   (Ingredient.slug or Ingredient.name exact)
// Step 4 — fuzzy alias match (Dice coefficient ≥ FUZZY_THRESHOLD, same category preferred)
// Step 5 — category fallback (lowest-cost ingredient in same category)
// Step 6 — no match          (resolver falls back to baseline)
//
// All DB reads are batched at call site; pass the pre-loaded lists to avoid N+1.

import { normalizeForMatch } from "./normalize"
import type { MatchResult, MatchType } from "./types"

const FUZZY_THRESHOLD = 0.6      // minimum Dice score to accept a fuzzy match
const FUZZY_CONFIDENCE = 0.75    // max confidence multiplier for fuzzy matches

// Bigram set for a string
function bigrams(s: string): Set<string> {
  const set = new Set<string>()
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2))
  return set
}

// Dice coefficient (0–1). Higher = more similar.
export function diceScore(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0
  const ag = bigrams(a)
  const bg = bigrams(b)
  let intersection = 0
  for (const g of ag) if (bg.has(g)) intersection++
  return (2 * intersection) / (ag.size + bg.size)
}

// Lightweight ingredient row shape expected by the matcher
export interface IngredientRow {
  id: string
  slug: string
  name: string
  category: string
  aliases: { alias: string }[]
}

// A pre-existing manual override stored in ProductIngredientMatch
export interface ManualOverride {
  sourceCatalogProductId: string
  ingredientId: string
  ingredientSlug: string
  matchType: MatchType
  confidenceScore: number
}

export interface MatchOptions {
  normalizedProductName: string
  productCategory?: string
  // Pre-loaded DB data — fetch once per batch, pass here
  ingredients: IngredientRow[]
  manualOverrides?: ManualOverride[]
  // sourceCatalogProductId of the product being matched (for manual-override lookup)
  sourceCatalogProductId?: string
}

export function matchIngredient(opts: MatchOptions): MatchResult | null {
  const {
    normalizedProductName,
    productCategory,
    ingredients,
    manualOverrides = [],
    sourceCatalogProductId,
  } = opts

  const needle = normalizeForMatch(normalizedProductName)

  // Step 1: manual override wins unconditionally
  if (sourceCatalogProductId) {
    const override = manualOverrides.find(
      (m) => m.sourceCatalogProductId === sourceCatalogProductId
    )
    if (override) {
      return {
        ingredientId: override.ingredientId,
        ingredientSlug: override.ingredientSlug,
        matchType: "manual",
        confidenceScore: override.confidenceScore,
      }
    }
  }

  // Pre-compute normalized forms for each ingredient once
  const normIngredients = ingredients.map((ing) => ({
    ...ing,
    normSlug: normalizeForMatch(ing.slug),
    normName: normalizeForMatch(ing.name),
    normAliases: ing.aliases.map((a) => normalizeForMatch(a.alias)),
  }))

  // Step 2: exact alias match
  for (const ing of normIngredients) {
    if (ing.normAliases.includes(needle)) {
      return { ingredientId: ing.id, ingredientSlug: ing.slug, matchType: "alias", confidenceScore: 0.95 }
    }
  }

  // Step 3: exact slug or name match
  for (const ing of normIngredients) {
    if (ing.normSlug === needle || ing.normName === needle) {
      return { ingredientId: ing.id, ingredientSlug: ing.slug, matchType: "exact", confidenceScore: 1.0 }
    }
  }

  // Step 4: fuzzy match — prefer same category, then best score overall
  let bestScore = 0
  let bestMatch: MatchResult | null = null

  const sameCategoryFirst = productCategory
    ? [
        ...normIngredients.filter((i) => i.category.toLowerCase() === productCategory.toLowerCase()),
        ...normIngredients.filter((i) => i.category.toLowerCase() !== productCategory.toLowerCase()),
      ]
    : normIngredients

  for (const ing of sameCategoryFirst) {
    const candidates = [ing.normSlug, ing.normName, ...ing.normAliases]
    for (const candidate of candidates) {
      const score = diceScore(needle, candidate)
      if (score > bestScore) {
        bestScore = score
        if (score >= FUZZY_THRESHOLD) {
          bestMatch = {
            ingredientId: ing.id,
            ingredientSlug: ing.slug,
            matchType: "fuzzy",
            // Cap fuzzy confidence so it never beats exact/alias
            confidenceScore: Math.min(score * FUZZY_CONFIDENCE, 0.84),
          }
        }
      }
    }
  }

  if (bestMatch) return bestMatch

  // Step 5: category fallback — return the most generic ingredient in the same category
  // (the resolver will use baseline pricing for it, marked as low confidence)
  if (productCategory) {
    const categoryMatch = normIngredients.find(
      (i) => i.category.toLowerCase() === productCategory.toLowerCase()
    )
    if (categoryMatch) {
      return {
        ingredientId: categoryMatch.id,
        ingredientSlug: categoryMatch.slug,
        matchType: "category_fallback",
        confidenceScore: 0.3,
      }
    }
  }

  // Step 6: no match
  return null
}
