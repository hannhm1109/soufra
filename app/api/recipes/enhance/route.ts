import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { recipeId } = await req.json()

  const recipe = await prisma.recipe.findUnique({ where: { id: recipeId } })
  if (!recipe) return NextResponse.json({ error: "Recipe not found" }, { status: 404 })

  const ingredients  = recipe.ingredients  as string[]
  const instructions = recipe.instructions as string[]

  const prompt = `You are a professional chef writing a recipe for a beginner cook who has never made this dish before.

Recipe: "${recipe.name}" (${recipe.cuisine} cuisine)
Difficulty: ${recipe.difficulty}
Prep time: ${recipe.prepTime} min | Cook time: ${recipe.cookTime} min
Servings: ${recipe.servings}

Ingredients:
${ingredients.map(i => `- ${i}`).join("\n")}

Current instructions (too short, need expanding):
${instructions.map((s, i) => `${i + 1}. ${s}`).join("\n")}

Rewrite the instructions as clear, beginner-friendly steps. Each step should:
- Be a single action (don't combine multiple actions in one step)
- Include temperatures, times, visual cues ("until golden", "until fragrant")
- Mention specific tools when relevant ("in a large pan", "over medium heat")
- Be 1-3 sentences max per step
- Total: 5-8 steps

Respond ONLY with a JSON array of strings. No markdown, no explanation:
["Step 1...", "Step 2...", "Step 3..."]`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a professional chef. Respond ONLY with a valid JSON array of strings. No markdown, no extra text.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    })

    const raw = completion.choices[0].message.content
    if (!raw) throw new Error("No response")

    // GPT with json_object mode wraps arrays in an object — handle both
    const parsed = JSON.parse(raw)
    const steps: string[] = Array.isArray(parsed)
      ? parsed
      : parsed.steps ?? parsed.instructions ?? Object.values(parsed)[0]

    if (!Array.isArray(steps) || steps.length === 0) throw new Error("Invalid format")

    // Save enhanced instructions back to the recipe
    await prisma.recipe.update({
      where: { id: recipeId },
      data:  { instructions: steps },
    })

    return NextResponse.json({ success: true, instructions: steps })
  } catch (error) {
    console.error("Enhance error:", error)
    return NextResponse.json({ error: "Failed to enhance instructions" }, { status: 500 })
  }
}
