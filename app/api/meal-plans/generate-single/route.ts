import { auth } from "@/lib/auth"
import { assessBudgetFeasibility, type MarketTierValue } from "@/lib/budget-utils"
import {
  getCalorieBounds,
  ingredientHasQuantity,
  normalizeDifficulty,
  normalizeText,
  normalizeTextList,
  reconcileNutrition,
  toFiniteNumber,
} from "@/lib/meal-generation"
import { getSingleCuisineGuide, requestMealJson } from "@/lib/meal-prompting"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const CALORIE_SPLIT: Record<string, number> = {
  breakfast: 0.25,
  lunch: 0.4,
  dinner: 0.35,
}

const MAX_REPAIR_ATTEMPTS = 2

type RawSingleMeal = {
  name?: unknown
  cuisine?: unknown
  prepTime?: unknown
  cookTime?: unknown
  servings?: unknown
  difficulty?: unknown
  calories?: unknown
  protein?: unknown
  carbs?: unknown
  fats?: unknown
  ingredients?: unknown
  instructions?: unknown
  tags?: unknown
  whyChosen?: unknown
}

function normalizeMeal(rawMeal: RawSingleMeal, fallback: {
  cuisine: string
  mealType: string
  mealCalories: number
}) {
  const meal = {
    name: normalizeText(rawMeal.name) ?? `${fallback.cuisine} ${fallback.mealType}`,
    cuisine: normalizeText(rawMeal.cuisine)?.toLowerCase() ?? fallback.cuisine,
    prepTime: Math.max(5, Math.round(toFiniteNumber(rawMeal.prepTime) ?? 10)),
    cookTime: Math.max(0, Math.round(toFiniteNumber(rawMeal.cookTime) ?? 20)),
    servings: Math.max(1, Math.round(toFiniteNumber(rawMeal.servings) ?? 2)),
    difficulty: normalizeDifficulty(rawMeal.difficulty),
    calories: Math.round(toFiniteNumber(rawMeal.calories) ?? fallback.mealCalories),
    protein: toFiniteNumber(rawMeal.protein) ?? 20,
    carbs: toFiniteNumber(rawMeal.carbs) ?? 40,
    fats: toFiniteNumber(rawMeal.fats) ?? 10,
    ingredients: normalizeTextList(rawMeal.ingredients, 20),
    instructions: normalizeTextList(rawMeal.instructions, 8),
    tags: normalizeTextList(rawMeal.tags, 8).map((tag) => tag.toLowerCase()),
    whyChosen: normalizeText(rawMeal.whyChosen) ?? "Fits your goals, cuisine preference, and calorie target.",
  }

  reconcileNutrition(meal, fallback.mealCalories)
  return meal
}

function validateMeal(meal: ReturnType<typeof normalizeMeal>, options: {
  mealType: string
  mealCalories: number
  currentName: string
  existingNames: string[]
  cuisine: string
}) {
  const issues: string[] = []
  const bounds = getCalorieBounds(options.mealCalories)

  if (!meal.name) {
    issues.push("Meal name is missing.")
  }

  if (meal.name.toLowerCase() === options.currentName.toLowerCase()) {
    issues.push("The replacement recipe name must be different from the current recipe.")
  }

  if (options.existingNames.some((name) => name.toLowerCase() === meal.name.toLowerCase())) {
    issues.push("The replacement recipe duplicates another recipe already in the active weekly plan.")
  }

  if (meal.cuisine !== options.cuisine) {
    issues.push("Cuisine must stay the same as the slot being replaced.")
  }

  if ((meal.instructions?.length ?? 0) < 4) {
    issues.push("Recipe needs at least 4 cooking steps.")
  }

  if ((meal.ingredients?.length ?? 0) < 3) {
    issues.push("Recipe needs at least 3 ingredients.")
  }

  if ((meal.ingredients ?? []).some((ingredient) => !ingredientHasQuantity(ingredient))) {
    issues.push("Every ingredient must include a quantity.")
  }

  if (meal.calories < bounds.min || meal.calories > bounds.max) {
    issues.push(`Calories must stay between ${bounds.min} and ${bounds.max}.`)
  }

  const macroCalories = Math.round(meal.protein * 4 + meal.carbs * 4 + meal.fats * 9)
  if (Math.abs(macroCalories - meal.calories) > 40) {
    issues.push("Calories must match the macros formula.")
  }

  if ((meal.whyChosen ?? "").split(/\s+/).filter(Boolean).length > 15) {
    issues.push("whyChosen must stay at 15 words or fewer.")
  }

  return issues
}

async function analyzeUserFeedback(userId: string) {
  const feedback = await prisma.recipeFeedback.findMany({
    where: { userId },
    include: { recipe: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  if (feedback.length < 3) return null

  const liked = feedback.filter((item) => item.liked)
  const disliked = feedback.filter((item) => !item.liked)

  const favoriteTags = new Map<string, number>()
  liked.forEach((item) => item.recipe.tags.forEach((tag: string) => {
    favoriteTags.set(tag, (favoriteTags.get(tag) ?? 0) + 1)
  }))

  const avoidNames = disliked.slice(0, 10).map((item) => item.recipe.name)
  const lovedNames = liked.slice(0, 10).map((item) => item.recipe.name)
  const preferredDifficulty = liked.length > 0
    ? Object.entries(liked.reduce<Record<string, number>>((acc, item) => {
        acc[item.recipe.difficulty] = (acc[item.recipe.difficulty] ?? 0) + 1
        return acc
      }, {})).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
    : null

  return {
    lovedNames,
    avoidNames,
    preferredDifficulty,
    favoriteTags: Array.from(favoriteTags.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([tag]) => tag),
  }
}

function buildPrompt(args: {
  cuisine: string
  mealType: string
  mealCalories: number
  user: {
    fitnessGoal: string | null
    allergies: string[]
    weeklyBudget: number | null
    city: string
    marketTier: MarketTierValue
    isRamadan: boolean
  }
  currentRecipeName: string
  otherRecipeNames: string[]
  feedback: Awaited<ReturnType<typeof analyzeUserFeedback>>
  usesLeftovers: boolean
  hasLeftovers: boolean
  budgetMessage: string
}) {
  const bounds = getCalorieBounds(args.mealCalories)
  const leftoversNote = args.usesLeftovers
    ? `- This slot already uses leftovers. Create a transformed leftover-style ${args.mealType} that clearly remixes a prior dinner with only minimal pantry additions.`
    : args.hasLeftovers
      ? `- This slot should produce tasty leftovers for the next day's lunch. Make it suitable for reheating or repurposing.`
      : ""

  const feedbackLines = args.feedback ? [
    "PERSONALIZATION:",
    args.feedback.preferredDifficulty ? `- Preferred difficulty: ${args.feedback.preferredDifficulty}.` : "",
    args.feedback.favoriteTags.length ? `- Favorite styles: ${args.feedback.favoriteTags.join(", ")}.` : "",
    args.feedback.lovedNames.length ? `- Style inspiration only: ${args.feedback.lovedNames.join(", ")}.` : "",
    args.feedback.avoidNames.length ? `- Never regenerate disliked recipes: ${args.feedback.avoidNames.join(", ")}.` : "",
  ].filter(Boolean).join("\n") : ""

  return `ROLE:
You create one replacement recipe for an existing Soufra meal-plan slot. The new recipe must feel fresh, realistic, and easy to cook while staying compatible with the rest of the user's week.

USER + SLOT:
- Meal type: ${args.mealType}
- Cuisine: ${args.cuisine}
- Calorie target: ${args.mealCalories} kcal
- Allowed calorie range: ${bounds.min} to ${bounds.max} kcal
- Fitness goal: ${args.user.fitnessGoal ?? "maintain"}
- Allergies: ${args.user.allergies.length > 0 ? args.user.allergies.join(", ") : "none"}
- Shopping context: ${args.user.marketTier} basket in ${args.user.city}
- Weekly budget: ${args.user.weeklyBudget ?? "not set"} DH
- Budget message: ${args.budgetMessage}
- Current recipe to replace: "${args.currentRecipeName}"
- Other recipe names already in this active weekly plan: ${args.otherRecipeNames.length > 0 ? args.otherRecipeNames.join(", ") : "none"}
${args.user.isRamadan ? `- Ramadan mode is active. Use ${args.mealType === "breakfast" ? "Suhoor" : args.mealType === "lunch" ? "Iftar" : "Post-Iftar"} context.` : ""}
${leftoversNote}

${getSingleCuisineGuide(args.cuisine)}

${feedbackLines}

HARD RULES:
1. Keep the cuisine exactly "${args.cuisine}".
2. The new recipe must have a different name from "${args.currentRecipeName}".
3. The new recipe must not duplicate any other recipe already in the active weekly plan.
4. Stay within the calorie range.
5. Calories must match macros using calories = protein * 4 + carbs * 4 + fats * 9.
6. Use ingredients available in Moroccan markets and mentally price in DH.
7. Every ingredient must include a quantity.
8. Instructions must be real cooking steps with at least 4 steps.
9. difficulty must be easy, medium, or hard.
10. whyChosen must be one short sentence with at most 15 words.

OUTPUT:
Respond only with valid JSON:
{
  "meal": {
    "name": "string",
    "cuisine": "${args.cuisine}",
    "prepTime": 10,
    "cookTime": 20,
    "servings": 2,
    "difficulty": "easy",
    "calories": ${args.mealCalories},
    "protein": 25,
    "carbs": 40,
    "fats": 10,
    "ingredients": ["200g chicken", "1 tbsp olive oil", "1 tomato"],
    "instructions": ["Step 1", "Step 2", "Step 3", "Step 4"],
    "tags": ["quick", "high-protein"],
    "whyChosen": "Fits your goals and brings variety"
  }
}`
}

async function repairMeal(args: {
  prompt: string
  meal: ReturnType<typeof normalizeMeal>
  issues: string[]
}) {
  const repairPrompt = `Fix this single recipe JSON for Soufra.

Return only valid JSON with exactly this shape:
{
  "meal": { ... corrected meal object ... }
}

ISSUES TO FIX:
${args.issues.map((issue) => `- ${issue}`).join("\n")}

ORIGINAL INSTRUCTIONS:
${args.prompt}

CURRENT JSON:
${JSON.stringify({ meal: args.meal })}`

  const parsed = await requestMealJson(repairPrompt, { maxTokens: 1400, temperature: 0.2 })
  return parsed.meal ?? parsed
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { slotId } = await req.json()
  if (!slotId) return NextResponse.json({ error: "slotId required" }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const slot = await prisma.mealPlanSlot.findUnique({
    where: { id: slotId },
    include: {
      mealPlan: {
        include: {
          slots: {
            include: {
              recipe: {
                select: { name: true },
              },
            },
          },
        },
      },
      recipe: true,
    },
  })

  if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 })
  if (slot.mealPlan.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const calorieTarget = user.calorieTarget ?? 2000
  const mealCalories = Math.round(calorieTarget * (CALORIE_SPLIT[slot.mealType] ?? 0.33))
  const cuisine = slot.recipe.cuisine
  const city = user.city ?? "Casablanca"
  const marketTier = (user.marketTier ?? "supermarket") as MarketTierValue
  const budgetAssessment = assessBudgetFeasibility({
    calorieTarget: user.calorieTarget,
    weeklyBudget: user.weeklyBudget,
    marketTier,
    cuisineCount: user.cuisines.length,
  })
  const feedback = await analyzeUserFeedback(user.id)

  const otherRecipeNames = slot.mealPlan.slots
    .filter((planSlot) => planSlot.id !== slot.id)
    .map((planSlot) => planSlot.recipe.name)

  const prompt = buildPrompt({
    cuisine,
    mealType: slot.mealType,
    mealCalories,
    user: {
      fitnessGoal: user.fitnessGoal,
      allergies: user.allergies,
      weeklyBudget: user.weeklyBudget,
      city,
      marketTier,
      isRamadan: user.isRamadan ?? false,
    },
    currentRecipeName: slot.recipe.name,
    otherRecipeNames,
    feedback,
    usesLeftovers: slot.usesLeftovers,
    hasLeftovers: slot.hasLeftovers,
    budgetMessage: budgetAssessment.message,
  })

  try {
    const parsed = await requestMealJson(prompt, { maxTokens: 1400, temperature: 0.5 })
    let meal = normalizeMeal(parsed.meal ?? parsed, {
      cuisine,
      mealType: slot.mealType,
      mealCalories,
    })

    let issues = validateMeal(meal, {
      mealType: slot.mealType,
      mealCalories,
      currentName: slot.recipe.name,
      existingNames: otherRecipeNames,
      cuisine,
    })

    for (let attempt = 0; attempt < MAX_REPAIR_ATTEMPTS && issues.length > 0; attempt++) {
      const repaired = await repairMeal({ prompt, meal, issues })
      meal = normalizeMeal(repaired, {
        cuisine,
        mealType: slot.mealType,
        mealCalories,
      })
      issues = validateMeal(meal, {
        mealType: slot.mealType,
        mealCalories,
        currentName: slot.recipe.name,
        existingNames: otherRecipeNames,
        cuisine,
      })
    }

    if (issues.length > 0) {
      throw new Error(`Single meal failed validation: ${issues.join(" | ")}`)
    }

    const recipe = await prisma.recipe.create({
      data: {
        name: meal.name,
        cuisine,
        prepTime: meal.prepTime,
        cookTime: meal.cookTime,
        servings: meal.servings,
        difficulty: meal.difficulty,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fats: meal.fats,
        ingredients: meal.ingredients,
        instructions: meal.instructions,
        tags: meal.tags,
        imageUrl: null,
      },
    })

    await prisma.mealPlanSlot.update({
      where: { id: slotId },
      data: {
        recipeId: recipe.id,
        whyChosen: meal.whyChosen,
      },
    })

    return NextResponse.json({ success: true, recipe })
  } catch (error) {
    console.error("generate-single error:", error)
    return NextResponse.json({ error: "Failed to generate meal" }, { status: 500 })
  }
}
