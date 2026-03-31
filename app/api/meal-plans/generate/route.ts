import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function analyzeUserFeedback(userId: string) {
  const feedback = await prisma.recipeFeedback.findMany({
    where: { userId },
    include: { recipe: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  if (feedback.length < 3) return null

  const liked = feedback.filter(f => f.liked)
  const disliked = feedback.filter(f => !f.liked)

  // Cuisine preferences
  const cuisineLikes: Record<string, number> = {}
  liked.forEach(f => {
    cuisineLikes[f.recipe.cuisine] = (cuisineLikes[f.recipe.cuisine] || 0) + 1
  })
  const favoriteCuisines = Object.entries(cuisineLikes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cuisine]) => cuisine)

  // Disliked cuisines
  const cuisineDislikes: Record<string, number> = {}
  disliked.forEach(f => {
    cuisineDislikes[f.recipe.cuisine] = (cuisineDislikes[f.recipe.cuisine] || 0) + 1
  })
  const avoidCuisines = Object.entries(cuisineDislikes)
    .filter(([, count]) => count >= 2)
    .map(([cuisine]) => cuisine)

  // Prep time preference
  const avgLikedTime = liked.length > 0
    ? liked.reduce((sum, f) => sum + f.recipe.prepTime + f.recipe.cookTime, 0) / liked.length
    : null

  const avgDislikedTime = disliked.length > 0
    ? disliked.reduce((sum, f) => sum + f.recipe.prepTime + f.recipe.cookTime, 0) / disliked.length
    : null

  const prefersQuick = avgLikedTime && avgDislikedTime
    ? avgLikedTime < avgDislikedTime - 15
    : false

  // Disliked recipe names to avoid
  const dislikedNames = disliked.slice(0, 10).map(f => f.recipe.name)

  // Liked recipe names to inspire
  const likedNames = liked.slice(0, 10).map(f => f.recipe.name)

  return {
    favoriteCuisines,
    avoidCuisines,
    prefersQuick,
    avgLikedTime,
    dislikedNames,
    likedNames,
    totalRatings: feedback.length,
  }
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // Analyze feedback patterns
  const patterns = await analyzeUserFeedback(user.id)

  // Build adaptive prompt section
  let adaptiveSection = ""
  if (patterns && patterns.totalRatings >= 3) {
    adaptiveSection = `
LEARNING FROM USER FEEDBACK (${patterns.totalRatings} ratings analyzed):
${patterns.favoriteCuisines.length > 0 ? `- User LOVES: ${patterns.favoriteCuisines.join(", ")} cuisine → prioritize these` : ""}
${patterns.avoidCuisines.length > 0 ? `- User DISLIKES: ${patterns.avoidCuisines.join(", ")} cuisine → minimize or avoid` : ""}
${patterns.prefersQuick ? `- User prefers quick recipes (avg liked: ${Math.round(patterns.avgLikedTime!)}min) → keep meals under 40min` : ""}
${patterns.likedNames.length > 0 ? `- Recipes user loved: ${patterns.likedNames.join(", ")} → generate similar style` : ""}
${patterns.dislikedNames.length > 0 ? `- Recipes user disliked: ${patterns.dislikedNames.join(", ")} → avoid these exact recipes` : ""}
Apply these patterns to make this plan more personalized than the last one.`
  }

  const prompt = `You are a professional nutritionist specializing in Moroccan and Mediterranean cuisines, with deep knowledge of healthy everyday cooking.

Soufra's philosophy: Moroccan and Mediterranean cuisines share the same ingredients, the same warmth around food, and the same culture of eating together. "Healthy Essentials" means nourishing dishes built from common household ingredients (eggs, oats, chicken, rice, legumes, seasonal vegetables) — not exotic superfoods.

Generate a 7-day meal plan for this user:
- Cuisines: ${user.cuisines.join(", ")}
- Daily calorie target: ${user.calorieTarget} kcal
- Fitness goal: ${user.fitnessGoal}
- Allergies: ${user.allergies.length > 0 ? user.allergies.join(", ") : "none"}
- Weekly budget: ${user.weeklyBudget} DH
${adaptiveSection}

CUISINE GUIDANCE:
- "moroccan": Authentic Moroccan dishes — tagines, couscous, harira, msemen, bastilla, zaalouk, briouats, rfissa
- "mediterranean": Greek, Spanish, Lebanese, Turkish dishes — grilled fish, hummus, tabbouleh, shakshuka, stuffed vegetables, olive oil-based dishes
- "healthy": Cuisine-agnostic clean eating — oatmeal, egg dishes, grilled chicken, lentil soups, rice bowls, veggie stir-fries, smoothies. Use simple everyday ingredients.
- "french": Classic French — quiche, ratatouille, crêpes, soupe à l'oignon, salade niçoise
- "middle_eastern": Falafel, shawarma, mujaddara, fattoush, lentil dishes

RULES:
1. Generate exactly 21 meals (7 days x 3 meals: breakfast, lunch, dinner)
2. Respect allergies strictly - zero tolerance
3. Match cuisine preferences — if multiple cuisines selected, distribute proportionally
4. Keep daily calories within 10% of target
5. Use authentic, culturally accurate recipes
6. Never repeat the same recipe twice
7. Prefer budget-friendly ingredients that are accessible in Morocco

Respond ONLY with this exact JSON format, no other text:
{
  "meals": [
    {
      "dayOfWeek": 0,
      "mealType": "breakfast",
      "name": "Recipe name",
      "cuisine": "moroccan",
      "prepTime": 15,
      "cookTime": 10,
      "servings": 1,
      "difficulty": "easy",
      "calories": 400,
      "protein": 20,
      "carbs": 45,
      "fats": 12,
      "ingredients": ["200g oats", "1 banana", "250ml milk"],
      "instructions": ["Step 1", "Step 2", "Step 3"],
      "tags": ["quick", "healthy"]
    }
  ]
}`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 6000,
    })

    const content = completion.choices[0].message.content
    if (!content) throw new Error("No response from OpenAI")

    const parsed = JSON.parse(content)
    const meals = parsed.meals

    if (!meals || meals.length !== 21) {
      throw new Error("Invalid meal plan structure")
    }

    // Deactivate old plans
    await prisma.mealPlan.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false }
    })

    // Create new plan
    const mealPlan = await prisma.mealPlan.create({
      data: {
        userId: user.id,
        weekStart: new Date(),
        isActive: true,
      }
    })

    // Create recipes and slots
    for (const meal of meals) {
      const recipe = await prisma.recipe.create({
        data: {
          name: meal.name,
          cuisine: meal.cuisine,
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
          tags: meal.tags || [],
          imageUrl: null,
        }
      })

      await prisma.mealPlanSlot.create({
        data: {
          mealPlanId: mealPlan.id,
          recipeId: recipe.id,
          dayOfWeek: meal.dayOfWeek,
          mealType: meal.mealType,
        }
      })
    }

    // Save learned preferences back to user
    if (patterns) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          learnedPrefs: {
            favoriteCuisines: patterns.favoriteCuisines,
            avoidCuisines: patterns.avoidCuisines,
            prefersQuick: patterns.prefersQuick,
            totalRatings: patterns.totalRatings,
            lastAnalyzed: new Date().toISOString(),
          }
        }
      })
    }

    return NextResponse.json({
      success: true,
      planId: mealPlan.id,
      adapted: patterns !== null,
      patterns: patterns ? {
        totalRatings: patterns.totalRatings,
        favoriteCuisines: patterns.favoriteCuisines,
      } : null
    })

  } catch (error) {
    console.error("Generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate meal plan" },
      { status: 500 }
    )
  }
}