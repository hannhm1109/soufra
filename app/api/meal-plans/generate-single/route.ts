import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const CALORIE_SPLIT: Record<string, number> = {
  breakfast: 0.25,
  lunch: 0.40,
  dinner: 0.35,
}

function enforceCalorieTarget(meal: Record<string, unknown>, target: number) {
  const raw = Number(meal.calories)
  if (!raw || raw <= 0) {
    meal.calories = target
    return
  }
  // Allow up to 10% variance; beyond that, scale macros down proportionally
  if (raw > target * 1.10) {
    const scale = target / raw
    meal.calories = target
    meal.protein  = Math.round(Number(meal.protein  ?? 0) * scale)
    meal.carbs    = Math.round(Number(meal.carbs    ?? 0) * scale)
    meal.fats     = Math.round(Number(meal.fats     ?? 0) * scale)
  }
}

function extractJSON(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  return fenced ? fenced[1].trim() : raw.trim()
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
    include: { mealPlan: true, recipe: true },
  })
  if (!slot) return NextResponse.json({ error: "Slot not found" }, { status: 404 })
  if (slot.mealPlan.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const calorieTarget = user.calorieTarget ?? 2000
  const mealCalories = Math.round(calorieTarget * (CALORIE_SPLIT[slot.mealType] ?? 0.33))
  const cuisine = slot.recipe.cuisine

  const prompt = `Generate ONE ${slot.mealType} recipe with these constraints:
- Cuisine: ${cuisine}
- STRICT calorie target: ${mealCalories} kcal (MUST be within 10% — between ${Math.round(mealCalories * 0.9)} and ${Math.round(mealCalories * 1.10)} kcal). This is a hard limit. If a recipe naturally has more calories, reduce the serving size or simplify ingredients until it fits. Do NOT exceed ${Math.round(mealCalories * 1.10)} kcal under any circumstances.
- Fitness goal: ${user.fitnessGoal ?? "maintain"}
- Allergies to avoid: ${user.allergies.length > 0 ? user.allergies.join(", ") : "none"}
- Different from: "${slot.recipe.name}" (do NOT regenerate this)
- Ingredients must be available in Moroccan markets, priced in DH

Respond ONLY with valid JSON (no markdown). Use exactly this structure:
{
  "meal": {
    "name": "string",
    "cuisine": "${cuisine}",
    "prepTime": 10,
    "cookTime": 20,
    "servings": 2,
    "difficulty": "easy",
    "calories": ${mealCalories},
    "protein": 25,
    "carbs": 40,
    "fats": 10,
    "ingredients": ["200g chicken", "1 tbsp olive oil"],
    "instructions": ["Step 1...", "Step 2...", "Step 3...", "Step 4..."],
    "tags": ["quick", "high-protein"],
    "whyChosen": "One sentence max 15 words why this fits the user"
  }
}`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a nutrition expert. Respond ONLY with valid JSON, no extra text." },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 1200,
      response_format: { type: "json_object" },
    })

    const raw = completion.choices[0].message.content
    if (!raw) throw new Error("No response from OpenAI")

    const parsed = JSON.parse(extractJSON(raw))
    const meal = parsed.meal ?? parsed

    enforceCalorieTarget(meal, mealCalories)

    const recipe = await prisma.recipe.create({
      data: {
        name:         meal.name        ?? `${cuisine} ${slot.mealType}`,
        cuisine,
        prepTime:     meal.prepTime    ?? 10,
        cookTime:     meal.cookTime    ?? 20,
        servings:     meal.servings    ?? 2,
        difficulty:   ["easy","medium","hard"].includes(meal.difficulty ?? "") ? meal.difficulty : "easy",
        calories:     meal.calories    ?? mealCalories,
        protein:      meal.protein     ?? 20,
        carbs:        meal.carbs       ?? 40,
        fats:         meal.fats        ?? 10,
        ingredients:  Array.isArray(meal.ingredients)  ? meal.ingredients  : [],
        instructions: Array.isArray(meal.instructions) ? meal.instructions : [],
        tags:         Array.isArray(meal.tags)         ? meal.tags         : [],
        imageUrl:     null,
      },
    })

    await prisma.mealPlanSlot.update({
      where: { id: slotId },
      data: {
        recipeId: recipe.id,
        whyChosen: typeof meal.whyChosen === "string" && meal.whyChosen.length > 0
          ? meal.whyChosen : null,
      },
    })

    return NextResponse.json({ success: true, recipe })
  } catch (error) {
    console.error("generate-single error:", error)
    return NextResponse.json({ error: "Failed to generate meal" }, { status: 500 })
  }
}
