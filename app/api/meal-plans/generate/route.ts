import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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
}

// Strip markdown code fences GPT sometimes wraps JSON in
function extractJSON(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  return fenced ? fenced[1].trim() : raw.trim()
}

async function analyzeUserFeedback(userId: string) {
  const feedback = await prisma.recipeFeedback.findMany({
    where: { userId },
    include: { recipe: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  })

  if (feedback.length < 3) return null

  const liked    = feedback.filter(f => f.liked)
  const disliked = feedback.filter(f => !f.liked)

  // ── Cuisine preferences ──────────────────────────────────
  const cuisineLikes: Record<string, number> = {}
  liked.forEach(f => { cuisineLikes[f.recipe.cuisine] = (cuisineLikes[f.recipe.cuisine] || 0) + 1 })
  const favoriteCuisines = Object.entries(cuisineLikes)
    .sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c]) => c)

  const cuisineDislikes: Record<string, number> = {}
  disliked.forEach(f => { cuisineDislikes[f.recipe.cuisine] = (cuisineDislikes[f.recipe.cuisine] || 0) + 1 })
  const avoidCuisines = Object.entries(cuisineDislikes)
    .filter(([, n]) => n >= 2).map(([c]) => c)

  // ── Prep time preference ─────────────────────────────────
  const avgLikedTime    = liked.length    > 0 ? liked.reduce((s, f)    => s + f.recipe.prepTime + f.recipe.cookTime, 0) / liked.length    : null
  const avgDislikedTime = disliked.length > 0 ? disliked.reduce((s, f) => s + f.recipe.prepTime + f.recipe.cookTime, 0) / disliked.length : null
  const prefersQuick    = avgLikedTime && avgDislikedTime ? avgLikedTime < avgDislikedTime - 15 : false

  // ── Difficulty preference ────────────────────────────────
  const diffLikes: Record<string, number> = {}
  liked.forEach(f => { diffLikes[f.recipe.difficulty] = (diffLikes[f.recipe.difficulty] || 0) + 1 })
  const preferredDifficulty = Object.entries(diffLikes).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

  // ── Tag preferences ──────────────────────────────────────
  const tagLikes: Record<string, number> = {}
  liked.forEach(f => f.recipe.tags.forEach((t: string) => { tagLikes[t] = (tagLikes[t] || 0) + 1 }))
  const preferredTags = Object.entries(tagLikes).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t]) => t)

  // ── Recipe name lists ────────────────────────────────────
  const likedNames    = liked.slice(0, 15).map(f => f.recipe.name)
  const dislikedNames = disliked.slice(0, 15).map(f => f.recipe.name)

  return {
    favoriteCuisines,
    avoidCuisines,
    prefersQuick,
    avgLikedTime,
    preferredDifficulty,
    preferredTags,
    likedNames,
    dislikedNames,
    totalLiked:    liked.length,
    totalDisliked: disliked.length,
    totalRatings:  feedback.length,
  }
}

async function getPreviousRecipeNames(userId: string): Promise<string[]> {
  const plans = await prisma.mealPlan.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 3,
    include: { slots: { include: { recipe: { select: { name: true } } } } },
  })
  return [...new Set(plans.flatMap(p => p.slots.map(s => s.recipe.name)))]
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

  // ── Calorie split per meal ───────────────────────────────
  const target    = user.calorieTarget ?? 2000
  const isRamadan = user.isRamadan ?? false
  // Ramadan: Suhoor 30% / Iftar 50% / Post-Iftar 20%
  const breakfast = Math.round(target * (isRamadan ? 0.30 : 0.25))
  const lunch     = Math.round(target * (isRamadan ? 0.50 : 0.40))
  const dinner    = Math.round(target * (isRamadan ? 0.20 : 0.35))

  // ── Adaptive learning block ──────────────────────────────
  let adaptiveSection = ""
  if (patterns) {
    const lines: string[] = [
      `\nLEARNING FROM USER TASTE PROFILE (${patterns.totalRatings} ratings — ${patterns.totalLiked} liked, ${patterns.totalDisliked} disliked):`,
    ]
    if (patterns.favoriteCuisines.length)
      lines.push(`• Loved cuisines: ${patterns.favoriteCuisines.join(", ")} → prioritize these heavily`)
    if (patterns.avoidCuisines.length)
      lines.push(`• Disliked cuisines: ${patterns.avoidCuisines.join(", ")} → avoid entirely`)
    if (patterns.preferredDifficulty)
      lines.push(`• Preferred difficulty: ${patterns.preferredDifficulty} → match this level`)
    if (patterns.preferredTags.length)
      lines.push(`• Loved recipe styles: ${patterns.preferredTags.join(", ")} → lean into these`)
    if (patterns.prefersQuick)
      lines.push(`• Prefers quick meals (avg liked: ${Math.round(patterns.avgLikedTime!)}min) → keep total time under 40min`)
    if (patterns.likedNames.length)
      lines.push(`• Recipes user loved — use as style inspiration: ${patterns.likedNames.join(", ")}`)
    if (patterns.dislikedNames.length)
      lines.push(`• Recipes user disliked — DO NOT regenerate these: ${patterns.dislikedNames.join(", ")}`)
    lines.push(`This plan must feel noticeably more personalized than generic suggestions.`)
    adaptiveSection = lines.join("\n")
  }

  // ── Cross-plan variety ───────────────────────────────────
  const varietySection = previousNames.length > 0
    ? `\nCROSS-PLAN VARIETY — avoid repeating recipes from previous plans:\n${previousNames.map(n => `• ${n}`).join("\n")}\nGenerate fresh recipes the user hasn't seen before.`
    : ""

  const ramadanSection = isRamadan ? `
RAMADAN MODE ACTIVE — this plan is for the holy month of Ramadan:
- "breakfast" slot = SUHOOR (pre-dawn meal eaten before Fajr prayer, ~${breakfast} kcal)
  → Light but sustaining: oats, eggs, dates, labneh, msemen, whole grains, nuts, fruit
  → Must keep the person full and energized throughout the fasting day
- "lunch" slot = IFTAR (break-fast at Maghrib, ~${lunch} kcal)
  → Start with dates (sunnah), harira soup or chilled beverages, then main course
  → Traditional Ramadan foods: harira, chebakia, briouat, sellou, msemen, bastilla, couscous, tagine
  → This is the main meal — hearty, traditional, celebratory
- "dinner" slot = POST-IFTAR / Isha meal (~${dinner} kcal)
  → Lighter meal 2-3 hours after Iftar: salads, light soups, light proteins, fruits
  → Should not be too heavy as people are already full from Iftar
Include as many traditional Moroccan Ramadan staples as possible (harira, chebakia, sellou, dates, briouat, etc.)
` : ""

  const prompt = `You are a professional nutritionist and chef specializing in Moroccan and Mediterranean cuisines, with deep knowledge of healthy, budget-friendly everyday cooking.

SOUFRA PHILOSOPHY: Moroccan and Mediterranean cuisines share the same warmth, the same ingredients, the same culture of eating together. "Healthy Essentials" means nourishing dishes from common household staples (eggs, oats, chicken, rice, legumes, seasonal vegetables) — not exotic superfoods.
${ramadanSection}
USER PROFILE:
- Cuisines: ${user.cuisines.join(", ")}
- Daily calorie target: ${target} kcal
- Calorie split: ${isRamadan ? `Suhoor ~${breakfast} kcal | Iftar ~${lunch} kcal | Post-Iftar ~${dinner} kcal` : `breakfast ~${breakfast} kcal | lunch ~${lunch} kcal | dinner ~${dinner} kcal`}
- Fitness goal: ${user.fitnessGoal}
- Allergies: ${user.allergies.length > 0 ? user.allergies.join(", ") : "none"}
- Weekly budget: ${user.weeklyBudget} DH (Morocco — use ingredients priced in MAD)
${adaptiveSection}
${varietySection}

CUISINE GUIDANCE:
- "moroccan": Authentic dishes — tagines, couscous, harira, msemen, bastilla, zaalouk, briouats, rfissa, batbout, sellou, chebakia
- "mediterranean": Greek, Spanish, Lebanese, Turkish — grilled fish, hummus, tabbouleh, shakshuka, stuffed vegetables, labneh, pita dishes, olive oil-based
- "healthy": Clean everyday eating — oatmeal bowls, egg dishes, grilled chicken, lentil soups, grain bowls, veggie stir-fries. Simple, accessible ingredients.
- "french": Quiche, ratatouille, crêpes, soupe à l'oignon, salade niçoise, omelettes
- "middle_eastern": Falafel, shawarma, mujaddara, fattoush, mansaf, kibbeh

STRICT RULES:
1. Generate exactly 21 meals — 7 days (dayOfWeek 0=Monday to 6=Sunday) × 3 meal types: breakfast, lunch, dinner
2. ALLERGIES: zero tolerance — check every ingredient
3. Distribute cuisines proportionally across the week based on user preferences
4. Each meal's calories must be close to its target: breakfast ~${breakfast}, lunch ~${lunch}, dinner ~${dinner}
5. Macros must be realistic and add up: protein + carbs + fats should roughly equal calories ÷ 4
6. Never repeat the same recipe name in this plan
7. Use ingredients available in Moroccan markets (souks), priced in DH
8. Instructions must be real, actionable cooking steps (minimum 4 steps)
9. Ingredients must include quantities (e.g. "200g chicken breast", "2 tbsp olive oil")
10. difficulty must be one of: "easy", "medium", "hard"
11. whyChosen: one concise sentence (max 15 words) explaining why this specific meal was chosen for this user based on their profile and preferences

Respond ONLY with valid JSON — no markdown, no explanation, no code fences. Exactly this structure:
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
      "calories": ${breakfast},
      "protein": 18,
      "carbs": 42,
      "fats": 8,
      "ingredients": ["200g oats", "1 banana", "250ml milk", "1 tbsp honey"],
      "instructions": ["Step 1...", "Step 2...", "Step 3...", "Step 4..."],
      "tags": ["quick", "high-protein"],
      "whyChosen": "Matches your Moroccan preference and fits your breakfast calorie target"
    }
  ]
}`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a nutrition expert. You ALWAYS respond with valid JSON only — no markdown, no code blocks, no extra text. Your JSON must be complete and parseable.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.75,
      max_tokens: 12000,
      response_format: { type: "json_object" },
    })

    const raw = completion.choices[0].message.content
    if (!raw) throw new Error("No response from OpenAI")

    const parsed = JSON.parse(extractJSON(raw))
    const meals = parsed.meals as RawMeal[]

    if (!Array.isArray(meals) || meals.length === 0) {
      throw new Error("Invalid meal plan structure")
    }

    // ── Pre-validate and deduplicate before touching the DB ─────────────────
    const seen = new Set<string>()
    const validMeals = meals.filter(meal => {
      if (!meal.name || meal.dayOfWeek == null || !meal.mealType) return false
      const key = `${meal.dayOfWeek}:${meal.mealType}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Require at least 18/21 slots before committing anything
    const MIN_SLOTS = 18
    if (validMeals.length < MIN_SLOTS) {
      throw new Error(`Insufficient meal plan: only ${validMeals.length} valid slots (need ${MIN_SLOTS})`)
    }

    // ── Atomic transaction: deactivate old → create new ──────────────────────
    let mealPlan!: { id: string }
    let created = 0

    await prisma.$transaction(async (tx) => {
      // Deactivate existing active plans
      await tx.mealPlan.updateMany({
        where: { userId: user.id, isActive: true },
        data: { isActive: false },
      })

      // Create the new plan
      mealPlan = await tx.mealPlan.create({
        data: { userId: user.id, weekStart: new Date(), isActive: true },
      })

      // Create all recipes and slots inside the transaction
      for (const meal of validMeals) {
        const recipe = await tx.recipe.create({
          data: {
            name:         meal.name!,
            cuisine:      meal.cuisine      ?? "healthy",
            prepTime:     meal.prepTime     ?? 10,
            cookTime:     meal.cookTime     ?? 15,
            servings:     meal.servings     ?? 2,
            difficulty:   ["easy","medium","hard"].includes(meal.difficulty ?? "") ? meal.difficulty! : "easy",
            calories:     meal.calories     ?? 400,
            protein:      meal.protein      ?? 20,
            carbs:        meal.carbs        ?? 40,
            fats:         meal.fats         ?? 10,
            ingredients:  Array.isArray(meal.ingredients)  ? meal.ingredients  : [],
            instructions: Array.isArray(meal.instructions) ? meal.instructions : [],
            tags:         Array.isArray(meal.tags)         ? meal.tags         : [],
            imageUrl:     null,
          },
        })

        await tx.mealPlanSlot.create({
          data: {
            mealPlanId: mealPlan!.id,
            recipeId:   recipe.id,
            dayOfWeek:  meal.dayOfWeek!,
            mealType:   meal.mealType!,
            whyChosen:  typeof meal.whyChosen === "string" && meal.whyChosen.length > 0
              ? meal.whyChosen
              : null,
          },
        })
        created++
      }
    }, { timeout: 30000 })

    // Persist learned preferences
    if (patterns) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          learnedPrefs: {
            favoriteCuisines:    patterns.favoriteCuisines,
            avoidCuisines:       patterns.avoidCuisines,
            preferredDifficulty: patterns.preferredDifficulty,
            preferredTags:       patterns.preferredTags,
            prefersQuick:        patterns.prefersQuick,
            totalRatings:        patterns.totalRatings,
            lastAnalyzed:        new Date().toISOString(),
          },
        },
      })
    }

    return NextResponse.json({
      success:  true,
      planId:   mealPlan.id,
      created,
      adapted:  patterns !== null,
      insights: patterns ? {
        totalRatings:        patterns.totalRatings,
        totalLiked:          patterns.totalLiked,
        totalDisliked:       patterns.totalDisliked,
        favoriteCuisines:    patterns.favoriteCuisines,
        preferredDifficulty: patterns.preferredDifficulty,
        preferredTags:       patterns.preferredTags,
      } : null,
    })

  } catch (error) {
    console.error("Generation error:", error)
    return NextResponse.json({ error: "Failed to generate meal plan" }, { status: 500 })
  }
}
