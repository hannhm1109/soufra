import { auth } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"
import OpenAI from "openai"

const prisma = new PrismaClient()
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const prompt = `You are a professional nutritionist specializing in Moroccan, French and Mediterranean cuisines.

Generate a 7-day meal plan for this user:
- Cuisines: ${user.cuisines.join(", ")}
- Daily calorie target: ${user.calorieTarget} kcal
- Fitness goal: ${user.fitnessGoal}
- Allergies: ${user.allergies.length > 0 ? user.allergies.join(", ") : "none"}
- Weekly budget: ${user.weeklyBudget} DH

RULES:
1. Generate exactly 21 meals (7 days x 3 meals: breakfast, lunch, dinner)
2. Respect allergies strictly - zero tolerance
3. Match cuisine preferences
4. Keep daily calories within 10% of target
5. Use authentic Moroccan recipes when cuisine is moroccan (tagine, couscous, harira, msemen etc)

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
      "instructions": ["Step 1", "Step 2"],
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

    return NextResponse.json({ success: true, planId: mealPlan.id })

  } catch (error) {
    console.error("Generation error:", error)
    return NextResponse.json(
      { error: "Failed to generate meal plan" },
      { status: 500 }
    )
  }
}