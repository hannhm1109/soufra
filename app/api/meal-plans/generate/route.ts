export const maxDuration = 120

import { auth } from "@/lib/auth"
import { assessBudgetFeasibility, type MarketTierValue } from "@/lib/budget-utils"
import {
  DIFFICULTY_LEVELS,
  getCalorieBounds,
  ingredientHasQuantity,
  normalizeDifficulty,
  normalizeText,
  normalizeTextList,
  reconcileNutrition as reconcileNutritionShared,
  toFiniteNumber,
} from "@/lib/meal-generation"
import { getWeeklyCuisineGuidanceBlock, requestMealJson } from "@/lib/meal-prompting"
import { sanitizeCuisinePreferences } from "@/lib/cuisines"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const REQUIRED_MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const
const REQUIRED_SLOT_COUNT = 7 * REQUIRED_MEAL_TYPES.length
const DEFAULT_CUISINE = "healthy"
const MAX_REPAIR_ATTEMPTS = 2

type MealType = (typeof REQUIRED_MEAL_TYPES)[number]

interface RawMeal {
  name?: string
  dayOfWeek?: number
  mealType?: string
  cuisine?: string
  prepTime?: number
  cookTime?: number
  servings?: number
  difficulty?: string
  calories?: number
  protein?: number
  carbs?: number
  fats?: number
  ingredients?: string[]
  instructions?: string[]
  tags?: string[]
  whyChosen?: string
  hasLeftovers?: boolean
  usesLeftovers?: boolean
  leftoverServings?: number
}

interface WeekStrategy {
  cuisineTargets: Record<string, number>
  breakfastAnchors: string[]
  lunchAnchors: string[]
  dinnerAnchors: string[]
  leftoverPairs: Array<{ dinnerDay: number; lunchDay: number; base: string }>
  budgetMoves: string[]
  varietyRules: string[]
}

interface CalorieTargets {
  breakfast: number
  lunch: number
  dinner: number
}

function normalizeRecipeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function getMealTarget(mealType: string, targets: CalorieTargets): number {
  if (mealType === "breakfast") return targets.breakfast
  if (mealType === "lunch") return targets.lunch
  return targets.dinner
}

function reconcileNutrition(meal: RawMeal, target: number) {
  const declaredCalories = toFiniteNumber(meal.calories) ?? 0
  const protein = toFiniteNumber(meal.protein) ?? 0
  const carbs = toFiniteNumber(meal.carbs) ?? 0
  const fats = toFiniteNumber(meal.fats) ?? 0

  const workingMeal = {
    calories: declaredCalories,
    protein,
    carbs,
    fats,
  }

  reconcileNutritionShared(workingMeal, target)

  meal.calories = workingMeal.calories
  meal.protein = workingMeal.protein
  meal.carbs = workingMeal.carbs
  meal.fats = workingMeal.fats
}

function normalizeMeal(meal: RawMeal, calorieTargets: CalorieTargets): RawMeal {
  const mealType = normalizeText(meal.mealType)?.toLowerCase() ?? "breakfast"
  const normalized: RawMeal = {
    name: normalizeText(meal.name) ?? undefined,
    dayOfWeek: Number.isInteger(meal.dayOfWeek) ? meal.dayOfWeek : undefined,
    mealType,
    cuisine: normalizeText(meal.cuisine)?.toLowerCase() ?? DEFAULT_CUISINE,
    prepTime: Math.max(5, Math.round(toFiniteNumber(meal.prepTime) ?? 10)),
    cookTime: Math.max(0, Math.round(toFiniteNumber(meal.cookTime) ?? 15)),
    servings: Math.max(1, Math.round(toFiniteNumber(meal.servings) ?? 2)),
    difficulty: normalizeDifficulty(meal.difficulty),
    ingredients: normalizeTextList(meal.ingredients, 20),
    instructions: normalizeTextList(meal.instructions, 8),
    tags: normalizeTextList(meal.tags, 8).map((tag) => tag.toLowerCase()),
    whyChosen: normalizeText(meal.whyChosen) ?? undefined,
    hasLeftovers: Boolean(meal.hasLeftovers),
    usesLeftovers: Boolean(meal.usesLeftovers),
    leftoverServings: Math.max(1, Math.round(toFiniteNumber(meal.leftoverServings) ?? 1)),
    protein: toFiniteNumber(meal.protein) ?? 0,
    carbs: toFiniteNumber(meal.carbs) ?? 0,
    fats: toFiniteNumber(meal.fats) ?? 0,
    calories: Math.round(toFiniteNumber(meal.calories) ?? 0),
  }

  if (normalized.mealType !== "lunch") normalized.usesLeftovers = false
  if (normalized.mealType !== "dinner") {
    normalized.hasLeftovers = false
    normalized.leftoverServings = undefined
  }

  if (!normalized.whyChosen) {
    normalized.whyChosen = "Chosen to match your goals, cuisine preferences, and weekly budget."
  }

  reconcileNutrition(normalized, getMealTarget(normalized.mealType ?? "breakfast", calorieTargets))
  return normalized
}

function syncLeftoverFlags(meals: RawMeal[]) {
  const slotMap = new Map<string, RawMeal>()
  for (const meal of meals) {
    if (meal.dayOfWeek == null || !meal.mealType) continue
    slotMap.set(`${meal.dayOfWeek}:${meal.mealType}`, meal)
  }

  for (const meal of meals) {
    if (meal.dayOfWeek == null || !meal.mealType) continue

    if (meal.mealType === "dinner" && meal.hasLeftovers) {
      // Only link within the week — Sunday dinner (day 6) has no next-day lunch
      const nextDay = meal.dayOfWeek + 1
      if (nextDay <= 6) {
        const lunch = slotMap.get(`${nextDay}:lunch`)
        if (lunch) lunch.usesLeftovers = true
      }
      meal.leftoverServings = Math.max(1, meal.leftoverServings ?? 1)
    }

    if (meal.mealType === "lunch" && meal.usesLeftovers) {
      // Only link within the week — Monday lunch (day 0) has no previous dinner
      const prevDay = meal.dayOfWeek - 1
      if (prevDay >= 0) {
        const previousDinner = slotMap.get(`${prevDay}:dinner`)
        if (previousDinner) {
          previousDinner.hasLeftovers = true
          previousDinner.leftoverServings = Math.max(1, previousDinner.leftoverServings ?? 1)
        }
      }
    }
  }
}

function buildCuisineTargets(cuisines: string[]): Record<string, number> {
  const selected = cuisines.length > 0 ? cuisines : [DEFAULT_CUISINE]
  const counts: Record<string, number> = {}
  const base = Math.floor(REQUIRED_SLOT_COUNT / selected.length)
  let remainder = REQUIRED_SLOT_COUNT % selected.length

  for (const cuisine of selected) {
    counts[cuisine] = base + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder--
  }

  return counts
}

function formatCuisineTargets(cuisineTargets: Record<string, number>): string {
  return Object.entries(cuisineTargets)
    .map(([cuisine, count]) => `- ${cuisine}: about ${count} meals`)
    .join("\n")
}

function summarizeVarietyTargets(selectedCuisineCount: number): string {
  const plantForwardTarget = selectedCuisineCount > 3 ? 7 : 6
  return [
    "- Use 21 unique recipe names.",
    "- Repeat no breakfast base more than 2 times across the week.",
    "- Repeat no lunch/dinner main protein more than 3 times across the week.",
    `- Include at least ${plantForwardTarget} plant-forward meals.`,
    "- Include at least 8 distinct vegetables across the week.",
    "- Use at least 5 cooking methods across the week.",
    "- Plan 2 to 3 smart leftover pairings from dinner into the next day's lunch.",
  ].join("\n")
}

function sanitizeStrategy(raw: unknown, fallbackCuisineTargets: Record<string, number>): WeekStrategy | null {
  if (!raw || typeof raw !== "object") return null

  const data = raw as {
    cuisineTargets?: unknown
    breakfastAnchors?: unknown
    lunchAnchors?: unknown
    dinnerAnchors?: unknown
    leftoverPairs?: unknown
    budgetMoves?: unknown
    varietyRules?: unknown
  }

  const cuisineTargets = typeof data.cuisineTargets === "object" && data.cuisineTargets
    ? Object.fromEntries(
        Object.entries(data.cuisineTargets as Record<string, unknown>)
          .map(([key, value]) => [key, Math.max(0, Math.round(toFiniteNumber(value) ?? 0))] as [string, number])
          .filter(([, value]) => value > 0)
      )
    : fallbackCuisineTargets

  const leftoverPairs = Array.isArray(data.leftoverPairs)
    ? data.leftoverPairs
        .map((pair) => {
          if (!pair || typeof pair !== "object") return null
          const typedPair = pair as Record<string, unknown>
          const dinnerDay = Math.round(toFiniteNumber(typedPair.dinnerDay) ?? -1)
          const lunchDay = Math.round(toFiniteNumber(typedPair.lunchDay) ?? -1)
          const base = normalizeText(typedPair.base)
          if (dinnerDay < 0 || dinnerDay > 6 || lunchDay < 0 || lunchDay > 6 || !base) return null
          return { dinnerDay, lunchDay, base }
        })
        .filter((pair): pair is { dinnerDay: number; lunchDay: number; base: string } => Boolean(pair))
        .slice(0, 3)
    : []

  return {
    cuisineTargets: Object.keys(cuisineTargets).length > 0 ? cuisineTargets : fallbackCuisineTargets,
    breakfastAnchors: normalizeTextList(data.breakfastAnchors, 5),
    lunchAnchors: normalizeTextList(data.lunchAnchors, 5),
    dinnerAnchors: normalizeTextList(data.dinnerAnchors, 5),
    leftoverPairs,
    budgetMoves: normalizeTextList(data.budgetMoves, 5),
    varietyRules: normalizeTextList(data.varietyRules, 6),
  }
}

async function generateWeekStrategy(args: {
  cuisines: string[]
  calorieTargets: CalorieTargets
  isRamadan: boolean
  budgetSection: string
  adaptiveSection: string
  varietySection: string
  fallbackCuisineTargets: Record<string, number>
}) {
  const prompt = `Plan a 7-day meal strategy for Soufra.

Return only JSON with exactly this shape:
{
  "strategy": {
    "cuisineTargets": { "moroccan": 0 },
    "breakfastAnchors": ["short idea"],
    "lunchAnchors": ["short idea"],
    "dinnerAnchors": ["short idea"],
    "leftoverPairs": [{ "dinnerDay": 0, "lunchDay": 1, "base": "dish base" }],
    "budgetMoves": ["short sentence"],
    "varietyRules": ["short sentence"]
  }
}

USER CUISINES:
${args.cuisines.join(", ")}

CALORIE TARGETS:
- Breakfast: about ${args.calorieTargets.breakfast} kcal
- Lunch: about ${args.calorieTargets.lunch} kcal
- Dinner: about ${args.calorieTargets.dinner} kcal

${args.isRamadan ? "RAMADAN MODE: breakfast means Suhoor, lunch means Iftar, dinner means Post-Iftar." : ""}
${args.budgetSection}
${args.adaptiveSection}
${args.varietySection}

HARD RULES:
- Keep cuisineTargets totaling exactly 21 meals.
- Use only cuisines the user selected.
- Plan 2 to 3 dinner-to-next-lunch leftover pairings.
- Prioritize affordable household staples and ingredient reuse.
- Optimize for weekly variety, not just unique names.`

  try {
    const parsed = await requestMealJson(prompt, { maxTokens: 900, temperature: 0.35 })
    return sanitizeStrategy(parsed.strategy ?? parsed, args.fallbackCuisineTargets)
  } catch (error) {
    console.warn("Week strategy generation failed, continuing without it.", error)
    return null
  }
}

function buildAdaptiveSection(patterns: Awaited<ReturnType<typeof analyzeUserFeedback>>) {
  if (!patterns) return ""

  const lines: string[] = [
    `LEARNING FROM USER TASTE PROFILE (${patterns.totalRatings} ratings: ${patterns.totalLiked} liked, ${patterns.totalDisliked} disliked):`,
  ]

  if (patterns.favoriteCuisines.length) {
    lines.push(`- Favorite cuisines: ${patterns.favoriteCuisines.join(", ")}. Prioritize these more often.`)
  }
  if (patterns.avoidCuisines.length) {
    lines.push(`- Avoid cuisines: ${patterns.avoidCuisines.join(", ")}.`)
  }
  if (patterns.preferredDifficulty) {
    lines.push(`- Preferred difficulty: ${patterns.preferredDifficulty}.`)
  }
  if (patterns.preferredTags.length) {
    lines.push(`- Favorite recipe styles: ${patterns.preferredTags.join(", ")}.`)
  }
  if (patterns.prefersQuick && patterns.avgLikedTime) {
    lines.push(`- User prefers quicker meals. Keep most meals around ${Math.round(patterns.avgLikedTime)} total minutes or less.`)
  }
  if (patterns.likedNames.length) {
    lines.push(`- Use these as style inspiration only: ${patterns.likedNames.join(", ")}.`)
  }
  if (patterns.dislikedNames.length) {
    lines.push(`- Never regenerate these disliked recipes: ${patterns.dislikedNames.join(", ")}.`)
  }
  lines.push("The final plan should feel clearly personalized, not generic.")
  return lines.join("\n")
}

function buildVarietySection(previousNames: string[], cuisineTargets: Record<string, number>, selectedCuisineCount: number) {
  const previousRecipes = previousNames.length > 0
    ? `PREVIOUS PLAN AVOID LIST:\n${previousNames.map((name) => `- ${name}`).join("\n")}\nDo not repeat these names or obvious near-duplicates.`
    : "PREVIOUS PLAN AVOID LIST:\n- No recent recipes on file."

  return [
    "VARIETY TARGETS:",
    summarizeVarietyTargets(selectedCuisineCount),
    "CUISINE DISTRIBUTION TARGETS:",
    formatCuisineTargets(cuisineTargets),
    previousRecipes,
  ].join("\n")
}

function buildBudgetSection(input: {
  weeklyBudget: number | null
  city: string
  marketTier: MarketTierValue
  budgetAssessment: ReturnType<typeof assessBudgetFeasibility>
}) {
  const perMealAverage = input.weeklyBudget ? Math.round(input.weeklyBudget / REQUIRED_SLOT_COUNT) : 30

  return [
    "BUDGET CONTEXT:",
    `- Weekly budget: ${input.weeklyBudget ?? "not set"} DH.`,
    `- Shopping context: ${input.marketTier} basket in ${input.city}.`,
    `- Target average cost per meal: about ${perMealAverage} DH.`,
    `- Budget status: ${input.budgetAssessment.status}. ${input.budgetAssessment.message}`,
    "- Reuse core ingredients across the week to reduce waste.",
    "- Prefer eggs, lentils, chickpeas, sardines, chicken thighs, couscous, rice, bread, seasonal produce, canned tomatoes, onions, yogurt, and herbs.",
    "- Avoid expensive imported seafood, large lamb cuts, premium cheese, and out-of-season produce.",
  ].join("\n")
}

function buildStrategySection(strategy: WeekStrategy | null) {
  if (!strategy) return ""

  const sections: string[] = ["WEEK STRATEGY TO FOLLOW:"]
  sections.push("Cuisine targets:")
  sections.push(formatCuisineTargets(strategy.cuisineTargets))

  if (strategy.breakfastAnchors.length) {
    sections.push(`Breakfast anchors: ${strategy.breakfastAnchors.join("; ")}`)
  }
  if (strategy.lunchAnchors.length) {
    sections.push(`Lunch anchors: ${strategy.lunchAnchors.join("; ")}`)
  }
  if (strategy.dinnerAnchors.length) {
    sections.push(`Dinner anchors: ${strategy.dinnerAnchors.join("; ")}`)
  }
  if (strategy.leftoverPairs.length) {
    sections.push(`Leftover pairs: ${strategy.leftoverPairs.map((pair) => `dinner day ${pair.dinnerDay} -> lunch day ${pair.lunchDay} (${pair.base})`).join("; ")}`)
  }
  if (strategy.budgetMoves.length) {
    sections.push(`Budget moves: ${strategy.budgetMoves.join("; ")}`)
  }
  if (strategy.varietyRules.length) {
    sections.push(`Extra variety rules: ${strategy.varietyRules.join("; ")}`)
  }

  return sections.join("\n")
}

function buildRamadanSection(isRamadan: boolean, calorieTargets: CalorieTargets) {
  if (!isRamadan) return ""

  return `RAMADAN MODE ACTIVE:
- "breakfast" means SUHOOR at about ${calorieTargets.breakfast} kcal. Keep it light but sustaining.
- "lunch" means IFTAR at about ${calorieTargets.lunch} kcal. Start with dates and a soup or beverage, then the main plate.
- "dinner" means POST-IFTAR at about ${calorieTargets.dinner} kcal. Keep it lighter than Iftar.
- Lean into familiar Moroccan Ramadan staples where they fit the calorie and budget limits.`
}

function buildMealPlanPrompt(args: {
  user: {
    cuisines: string[]
    calorieTarget: number | null
    fitnessGoal: string | null
    allergies: string[]
    weeklyBudget: number | null
    isRamadan: boolean
    city: string
    marketTier: MarketTierValue
  }
  calorieTargets: CalorieTargets
  adaptiveSection: string
  varietySection: string
  budgetSection: string
  strategySection: string
  ramadanSection: string
}) {
  const selectedCuisines = args.user.cuisines.length > 0 ? args.user.cuisines.join(", ") : DEFAULT_CUISINE

  return `ROLE:
You are a professional nutritionist and chef specializing in Moroccan and Mediterranean home cooking. You create meal plans that feel warm, realistic, affordable, and easy to cook during a normal week.

SOUFRA PHILOSOPHY:
Moroccan and Mediterranean food should feel nourishing, familiar, budget-aware, and made from common household staples rather than specialty ingredients.

USER PROFILE:
- Cuisines: ${selectedCuisines}
- Daily calorie target: ${args.user.calorieTarget ?? 2000} kcal
- Calorie split: breakfast about ${args.calorieTargets.breakfast} kcal, lunch about ${args.calorieTargets.lunch} kcal, dinner about ${args.calorieTargets.dinner} kcal
- Fitness goal: ${args.user.fitnessGoal ?? "maintain"}
- Allergies: ${args.user.allergies.length > 0 ? args.user.allergies.join(", ") : "none"}
- City: ${args.user.city}
- Market tier: ${args.user.marketTier}

${args.ramadanSection}

${args.budgetSection}

${args.adaptiveSection}

${args.varietySection}

${args.strategySection}

${getWeeklyCuisineGuidanceBlock()}

HARD CONSTRAINTS:
1. Generate exactly 21 meals: dayOfWeek 0 to 6 and mealType breakfast, lunch, dinner.
2. Every day must contain exactly one breakfast, one lunch, and one dinner.
3. Allergies are a hard block. Do not include any allergen ingredient.
4. Every meal must stay within 10 percent of its calorie target.
5. Calories must match macros using calories = protein * 4 + carbs * 4 + fats * 9.
6. Never repeat the same recipe name or a near-duplicate name in this plan.
7. Use ingredients commonly available in Moroccan markets and price the plan mentally in DH.
8. Instructions must be real cooking steps, minimum 4 steps.
9. Every ingredient must include a quantity.
10. difficulty must be one of: easy, medium, hard.
11. whyChosen must be one concise sentence, max 15 words.
12. Mark 2 to 3 dinners with hasLeftovers=true so the next day's lunch can use usesLeftovers=true.
13. If a lunch uses leftovers, make that lunch feel clearly like a transformed leftover meal, not a full duplicate plate.

OUTPUT:
Respond only with valid JSON. No markdown.
Use exactly this structure:
{
  "meals": [
    {
      "dayOfWeek": 0,
      "mealType": "breakfast",
      "name": "Recipe name",
      "cuisine": "moroccan",
      "prepTime": 10,
      "cookTime": 15,
      "servings": 2,
      "difficulty": "easy",
      "calories": ${args.calorieTargets.breakfast},
      "protein": 18,
      "carbs": 42,
      "fats": 8,
      "ingredients": ["200g oats", "1 banana", "250ml milk", "1 tbsp honey"],
      "instructions": ["Step 1", "Step 2", "Step 3", "Step 4"],
      "tags": ["quick", "high-protein"],
      "whyChosen": "Matches your goals and breakfast calorie target",
      "hasLeftovers": false,
      "usesLeftovers": false,
      "leftoverServings": 1
    }
  ]
}`
}

interface ValidationResult {
  critical: string[]
  soft: string[]
}

function validateMeals(meals: RawMeal[], calorieTargets: CalorieTargets): ValidationResult {
  const critical: string[] = []
  const soft: string[] = []
  const seenSlots = new Set<string>()
  const seenNames = new Set<string>()
  const breakfastBases: Record<string, number> = {}
  const proteins: Record<string, number> = {}
  const vegetables = new Set<string>()
  let plantForwardMeals = 0
  let leftoverDinnerCount = 0
  const cookingMethods = new Set<string>()

  if (meals.length !== REQUIRED_SLOT_COUNT) {
    critical.push(`Expected ${REQUIRED_SLOT_COUNT} meals but received ${meals.length}.`)
  }

  for (const meal of meals) {
    if (!meal.name || meal.dayOfWeek == null || !meal.mealType) {
      critical.push("Every meal must include name, dayOfWeek, and mealType.")
      continue
    }

    const slotKey = `${meal.dayOfWeek}:${meal.mealType}`
    if (seenSlots.has(slotKey)) critical.push(`Duplicate slot found for ${slotKey}.`)
    seenSlots.add(slotKey)

    const normalizedName = normalizeRecipeName(meal.name)
    if (seenNames.has(normalizedName)) soft.push(`Duplicate recipe name found: ${meal.name}.`)
    seenNames.add(normalizedName)

    if (!Number.isInteger(meal.dayOfWeek) || meal.dayOfWeek < 0 || meal.dayOfWeek > 6) {
      critical.push(`Invalid dayOfWeek for ${meal.name}.`)
    }

    if (!REQUIRED_MEAL_TYPES.includes(meal.mealType as MealType)) {
      critical.push(`Invalid mealType for ${meal.name}.`)
    }

    if ((meal.instructions?.length ?? 0) < 4) {
      soft.push(`${meal.name} needs at least 4 cooking steps.`)
    }

    if ((meal.ingredients?.length ?? 0) < 3) {
      soft.push(`${meal.name} needs at least 3 ingredients.`)
    }

    if ((meal.ingredients ?? []).some((ingredient) => !ingredientHasQuantity(ingredient))) {
      soft.push(`${meal.name} has ingredients without quantities.`)
    }

    const target = getMealTarget(meal.mealType, calorieTargets)
    const bounds = getCalorieBounds(target)
    if ((meal.calories ?? 0) < bounds.min || (meal.calories ?? 0) > bounds.max) {
      critical.push(`${meal.name} is outside the calorie range for ${meal.mealType}.`)
    }

    const macroCalories = Math.round((meal.protein ?? 0) * 4 + (meal.carbs ?? 0) * 4 + (meal.fats ?? 0) * 9)
    if (Math.abs(macroCalories - (meal.calories ?? 0)) > 40) {
      critical.push(`${meal.name} has calories that do not match its macros.`)
    }

    if (meal.mealType === "dinner" && meal.hasLeftovers) leftoverDinnerCount++

    if (meal.mealType === "breakfast") {
      const lowerName = meal.name.toLowerCase()
      const breakfastBase =
        lowerName.includes("egg") ? "egg" :
        lowerName.includes("oat") ? "oat" :
        lowerName.includes("yogurt") ? "yogurt" :
        lowerName.includes("bread") || lowerName.includes("msemen") || lowerName.includes("baghrir") || lowerName.includes("batbout") ? "bread" :
        "other"
      breakfastBases[breakfastBase] = (breakfastBases[breakfastBase] ?? 0) + 1
    }

    const ingredientText = (meal.ingredients ?? []).join(" ").toLowerCase()
    const proteinKey =
      ingredientText.includes("chicken") ? "chicken" :
      ingredientText.includes("beef") ? "beef" :
      ingredientText.includes("lamb") ? "lamb" :
      ingredientText.includes("sardine") || ingredientText.includes("fish") ? "fish" :
      ingredientText.includes("egg") ? "egg" :
      ingredientText.includes("lentil") || ingredientText.includes("chickpea") || ingredientText.includes("bean") ? "legume" :
      "other"
    proteins[proteinKey] = (proteins[proteinKey] ?? 0) + 1

    for (const vegetable of ["tomato", "pepper", "zucchini", "eggplant", "carrot", "onion", "spinach", "cucumber", "potato", "olive", "chickpea", "lentil", "beans", "lettuce"]) {
      if (ingredientText.includes(vegetable)) vegetables.add(vegetable)
    }

    if (["lentil", "chickpea", "bean", "beans", "egg", "yogurt", "vegetable"].some((word) => ingredientText.includes(word)) &&
      !["chicken", "beef", "lamb", "fish"].some((word) => ingredientText.includes(word))) {
      plantForwardMeals++
    }

    for (const method of ["roast", "grill", "stew", "bake", "saute", "braise", "simmer", "toast", "scramble"]) {
      if ((meal.instructions ?? []).join(" ").toLowerCase().includes(method)) {
        cookingMethods.add(method)
      }
    }
  }

  for (let day = 0; day < 7; day++) {
    for (const mealType of REQUIRED_MEAL_TYPES) {
      if (!seenSlots.has(`${day}:${mealType}`)) {
        critical.push(`Missing slot for day ${day} ${mealType}.`)
      }
    }
  }

  // Variety guidelines — used to guide repairs but don't block a structurally valid plan
  if ((breakfastBases.egg ?? 0) > 2) soft.push("Too many egg-based breakfasts.")
  if ((breakfastBases.oat ?? 0) > 2) soft.push("Too many oat-based breakfasts.")
  if ((breakfastBases.bread ?? 0) > 2) soft.push("Too many bread-based breakfasts.")
  if ((proteins.chicken ?? 0) > 3) soft.push("Too many chicken-based meals.")
  if ((proteins.beef ?? 0) + (proteins.lamb ?? 0) > 2) soft.push("Too many red-meat meals.")
  if (plantForwardMeals < 4) soft.push("Not enough plant-forward meals.")
  if (vegetables.size < 6) soft.push("Not enough vegetable variety across the week.")
  if (cookingMethods.size < 4) soft.push("Not enough cooking-method variety.")
  if (leftoverDinnerCount > 4) soft.push("Too many leftover dinners — cap at 3 or 4.")

  return { critical, soft }
}

async function repairMeals(args: {
  meals: RawMeal[]
  issues: string[]
  basePrompt: string
}) {
  const prompt = `Fix this weekly meal plan for Soufra.

Return only valid JSON with this exact shape:
{
  "meals": [ ... 21 corrected meal objects ... ]
}

Preserve the overall spirit of the plan. Fix every issue listed below.

ISSUES TO FIX:
${args.issues.map((issue) => `- ${issue}`).join("\n")}

KEY CONSTRAINTS (from original instructions):
- Generate exactly 21 meals covering dayOfWeek 0–6 × breakfast, lunch, dinner.
- No duplicate recipe names or slot combinations.
- Calories must stay within ±10% of each meal type's target.
- Calories = protein × 4 + carbs × 4 + fats × 9 (within 40 kcal).
- Every ingredient must include a quantity.
- At least 4 cooking steps and 3 ingredients per meal.
- difficulty must be easy, medium, or hard.
- whyChosen must be ≤15 words.

CURRENT JSON TO REPAIR:
${JSON.stringify({ meals: args.meals })}`

  try {
    const parsed = await requestMealJson(prompt, { maxTokens: 12000, temperature: 0.2 })
    const repaired = Array.isArray(parsed.meals) ? (parsed.meals as RawMeal[]) : null
    return repaired && repaired.length > 0 ? repaired : args.meals
  } catch {
    return args.meals
  }
}

async function analyzeUserFeedback(userId: string) {
  const feedback = await prisma.recipeFeedback.findMany({
    where: { userId },
    include: { recipe: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  if (feedback.length < 3) return null

  const liked = feedback.filter((item) => item.liked)
  const disliked = feedback.filter((item) => !item.liked)

  const cuisineLikes: Record<string, number> = {}
  liked.forEach((item) => {
    cuisineLikes[item.recipe.cuisine] = (cuisineLikes[item.recipe.cuisine] || 0) + 1
  })
  const favoriteCuisines = Object.entries(cuisineLikes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cuisine]) => cuisine)

  const cuisineDislikes: Record<string, number> = {}
  disliked.forEach((item) => {
    cuisineDislikes[item.recipe.cuisine] = (cuisineDislikes[item.recipe.cuisine] || 0) + 1
  })
  const avoidCuisines = Object.entries(cuisineDislikes)
    .filter(([, count]) => count >= 2)
    .map(([cuisine]) => cuisine)

  const avgLikedTime = liked.length > 0
    ? liked.reduce((sum, item) => sum + item.recipe.prepTime + item.recipe.cookTime, 0) / liked.length
    : null
  const avgDislikedTime = disliked.length > 0
    ? disliked.reduce((sum, item) => sum + item.recipe.prepTime + item.recipe.cookTime, 0) / disliked.length
    : null
  const prefersQuick = avgLikedTime && avgDislikedTime ? avgLikedTime < avgDislikedTime - 15 : false

  const difficultyLikes: Record<string, number> = {}
  liked.forEach((item) => {
    difficultyLikes[item.recipe.difficulty] = (difficultyLikes[item.recipe.difficulty] || 0) + 1
  })
  const preferredDifficulty = Object.entries(difficultyLikes)
    .sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  const tagLikes: Record<string, number> = {}
  liked.forEach((item) => item.recipe.tags.forEach((tag: string) => {
    tagLikes[tag] = (tagLikes[tag] || 0) + 1
  }))
  const preferredTags = Object.entries(tagLikes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag)

  return {
    favoriteCuisines,
    avoidCuisines,
    prefersQuick,
    avgLikedTime,
    preferredDifficulty,
    preferredTags,
    likedNames: liked.slice(0, 15).map((item) => item.recipe.name),
    dislikedNames: disliked.slice(0, 15).map((item) => item.recipe.name),
    totalLiked: liked.length,
    totalDisliked: disliked.length,
    totalRatings: feedback.length,
  }
}

async function getPreviousRecipeNames(userId: string): Promise<string[]> {
  const plans = await prisma.mealPlan.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { slots: { include: { recipe: { select: { name: true } } } } },
  })

  return [...new Set(plans.flatMap((plan) => plan.slots.map((slot) => slot.recipe.name)))]
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const [patterns, previousNames] = await Promise.all([
    analyzeUserFeedback(user.id),
    getPreviousRecipeNames(user.id),
  ])

  const target = user.calorieTarget ?? 2000
  const isRamadan = user.isRamadan ?? false
  const calorieTargets: CalorieTargets = {
    breakfast: Math.round(target * (isRamadan ? 0.3 : 0.25)),
    lunch: Math.round(target * (isRamadan ? 0.5 : 0.4)),
    dinner: Math.round(target * (isRamadan ? 0.2 : 0.35)),
  }

  const sanitized = sanitizeCuisinePreferences(user.cuisines)
  const selectedCuisines = sanitized.length > 0 ? sanitized : [DEFAULT_CUISINE]
  const city = user.city ?? "Casablanca"
  const marketTier = (user.marketTier ?? "supermarket") as MarketTierValue
  const budgetAssessment = assessBudgetFeasibility({
    calorieTarget: user.calorieTarget,
    weeklyBudget: user.weeklyBudget,
    marketTier,
    cuisineCount: selectedCuisines.length,
  })

  const cuisineTargets = buildCuisineTargets(selectedCuisines)
  const adaptiveSection = buildAdaptiveSection(patterns)
  const varietySection = buildVarietySection(previousNames, cuisineTargets, selectedCuisines.length)
  const budgetSection = buildBudgetSection({
    weeklyBudget: user.weeklyBudget ?? null,
    city,
    marketTier,
    budgetAssessment,
  })
  const ramadanSection = buildRamadanSection(isRamadan, calorieTargets)

  const strategy = await generateWeekStrategy({
    cuisines: selectedCuisines,
    calorieTargets,
    isRamadan,
    budgetSection,
    adaptiveSection,
    varietySection,
    fallbackCuisineTargets: cuisineTargets,
  })

  const prompt = buildMealPlanPrompt({
    user: {
      cuisines: selectedCuisines,
      calorieTarget: user.calorieTarget,
      fitnessGoal: user.fitnessGoal,
      allergies: user.allergies,
      weeklyBudget: user.weeklyBudget,
      isRamadan,
      city,
      marketTier,
    },
    calorieTargets,
    adaptiveSection,
    varietySection,
    budgetSection,
    strategySection: buildStrategySection(strategy),
    ramadanSection,
  })

  try {
    const parsed = await requestMealJson(prompt, { maxTokens: 12000, temperature: 0.55 })
    let meals = Array.isArray(parsed.meals) ? (parsed.meals as RawMeal[]) : []

    meals = meals.map((meal) => normalizeMeal(meal, calorieTargets))
    syncLeftoverFlags(meals)

    let validation = validateMeals(meals, calorieTargets)
    for (let attempt = 0; attempt < MAX_REPAIR_ATTEMPTS && validation.critical.length > 0; attempt++) {
      const allIssues = [...validation.critical, ...validation.soft]
      const repairedMeals = await repairMeals({ meals, issues: allIssues, basePrompt: prompt })
      meals = repairedMeals.map((meal) => normalizeMeal(meal, calorieTargets))
      syncLeftoverFlags(meals)
      validation = validateMeals(meals, calorieTargets)
    }

    if (validation.critical.length > 0) {
      throw new Error(`Meal plan failed validation: ${validation.critical.join(" | ")}`)
    }
    if (validation.soft.length > 0) {
      console.warn("Meal plan has soft issues (serving anyway):", validation.soft.join(" | "))
    }

    const seenSlots = new Set<string>()
    const validMeals = meals.filter((meal) => {
      if (!meal.name || meal.dayOfWeek == null || !meal.mealType) return false
      if (!Number.isInteger(meal.dayOfWeek) || meal.dayOfWeek < 0 || meal.dayOfWeek > 6) return false
      if (!REQUIRED_MEAL_TYPES.includes(meal.mealType as MealType)) return false
      const key = `${meal.dayOfWeek}:${meal.mealType}`
      if (seenSlots.has(key)) return false
      seenSlots.add(key)
      return true
    })

    if (validMeals.length !== REQUIRED_SLOT_COUNT) {
      throw new Error(`Insufficient meal plan: only ${validMeals.length} valid slots (need ${REQUIRED_SLOT_COUNT})`)
    }

    let mealPlan!: { id: string }
    let created = 0

    await prisma.$transaction(async (tx) => {
      await tx.mealPlan.updateMany({
        where: { userId: user.id, isActive: true },
        data: { isActive: false },
      })

      mealPlan = await tx.mealPlan.create({
        data: { userId: user.id, weekStart: new Date(), isActive: true },
      })

      for (const meal of validMeals) {
        const recipe = await tx.recipe.create({
          data: {
            name: meal.name!,
            cuisine: meal.cuisine ?? DEFAULT_CUISINE,
            prepTime: meal.prepTime ?? 10,
            cookTime: meal.cookTime ?? 15,
            servings: meal.servings ?? 2,
            difficulty: normalizeDifficulty(meal.difficulty),
            calories: Math.round(meal.calories ?? getMealTarget(meal.mealType ?? "breakfast", calorieTargets)),
            protein: meal.protein ?? 20,
            carbs: meal.carbs ?? 40,
            fats: meal.fats ?? 10,
            ingredients: Array.isArray(meal.ingredients) ? meal.ingredients : [],
            instructions: Array.isArray(meal.instructions) ? meal.instructions : [],
            tags: Array.isArray(meal.tags) ? meal.tags : [],
            imageUrl: null,
          },
        })

        await tx.mealPlanSlot.create({
          data: {
            mealPlanId: mealPlan.id,
            recipeId: recipe.id,
            dayOfWeek: meal.dayOfWeek!,
            mealType: meal.mealType!,
            whyChosen: typeof meal.whyChosen === "string" && meal.whyChosen.length > 0
              ? meal.whyChosen
              : null,
            hasLeftovers: Boolean(meal.hasLeftovers),
            usesLeftovers: Boolean(meal.usesLeftovers),
            leftoverServings: meal.hasLeftovers ? Math.max(1, meal.leftoverServings ?? 1) : null,
          },
        })
        created++
      }
    }, { timeout: 30000 })

    if (patterns) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          learnedPrefs: {
            favoriteCuisines: patterns.favoriteCuisines,
            avoidCuisines: patterns.avoidCuisines,
            preferredDifficulty: patterns.preferredDifficulty,
            preferredTags: patterns.preferredTags,
            prefersQuick: patterns.prefersQuick,
            totalRatings: patterns.totalRatings,
            lastAnalyzed: new Date().toISOString(),
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      planId: mealPlan.id,
      created,
      adapted: patterns !== null,
      insights: patterns ? {
        totalRatings: patterns.totalRatings,
        totalLiked: patterns.totalLiked,
        totalDisliked: patterns.totalDisliked,
        favoriteCuisines: patterns.favoriteCuisines,
        preferredDifficulty: patterns.preferredDifficulty,
        preferredTags: patterns.preferredTags,
      } : null,
    })
  } catch (error) {
    console.error("Generation error:", error)
    return NextResponse.json({ error: "Failed to generate meal plan" }, { status: 500 })
  }
}
