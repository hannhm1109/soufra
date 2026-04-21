import OpenAI from "openai"

import { extractJSON } from "@/lib/meal-generation"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SYSTEM_JSON_ONLY = "You are a nutrition expert. Respond only with valid JSON. No markdown, no code fences, no extra text."

const CUISINE_GUIDES = {
  moroccan: {
    single: "Authentic Moroccan home cooking. Breakfasts: msemen, baghrir, batbout, harcha, egg dishes. Mains: tagines, couscous, harira, rfissa, bastilla, zaalouk, taktouka, briouats, chermoula chicken or fish, bissara. Flavors: cumin, ras el hanout, saffron, preserved lemon, cinnamon, olives.",
    weekly: `"moroccan":
  Breakfasts: msemen with honey or amlou, baghrir with butter and honey, batbout, hard-boiled eggs with argan oil, harcha.
  Lunches and dinners: chicken tagine with olives and preserved lemon, kefta tagine with eggs, vegetable tagine, couscous, harira, rfissa, bastilla au poulet, zaalouk, taktouka, briouats, chermoula grilled fish or chicken, bissara.
  Flavors: cumin, coriander, saffron, ras el hanout, preserved lemon, olives, ginger, turmeric, cinnamon.`,
  },
  mediterranean: {
    single: "Draw from Greek, Lebanese, Spanish, and Turkish home cooking such as moussaka, spanakopita, souvlaki, fattoush, tabbouleh, labneh, tortilla espanola, arroz con pollo, menemen, mercimek corbasi, borek, shakshuka, roasted vegetables, and olive-oil based dishes.",
    weekly: `"mediterranean":
  Draw from Greek, Lebanese, Spanish, and Turkish home cooking such as moussaka, spanakopita, souvlaki, Greek salad, fattoush, tabbouleh, labneh, tortilla espanola, arroz con pollo, menemen, mercimek corbasi, borek, shakshuka, roasted vegetables, and whole grain salads.
  Flavors: olive oil, lemon, garlic, oregano, mint, parsley, dill, sumac, za'atar.`,
  },
  healthy: {
    single: "Everyday household staples only. Focus on affordable high-protein, high-fiber, balanced meals using oats, eggs, legumes, rice, couscous, yogurt, sardines, chicken thighs, and seasonal vegetables.",
    weekly: `"healthy":
  Focus on affordable, high-protein, high-fiber, balanced dishes using household staples only: oats, eggs, canned legumes, chicken thighs, sardines, rice, couscous, yogurt, onions, tomatoes, carrots, zucchini, peppers, and seasonal produce.`,
  },
  middle_eastern: {
    single: "Breakfasts: ful medames, labneh with za'atar, eggs with sumac, manakish. Mains: falafel, shawarma, mujaddara, kibbeh, stuffed vine leaves, shorbat adas, baba ganoush, fatteh, musakhan.",
    weekly: `"middle_eastern":
  Breakfasts: ful medames, labneh with olive oil and za'atar, eggs with sumac and tomatoes, manakish.
  Lunches and dinners: falafel, chicken or beef shawarma wraps, mujaddara, kibbeh, stuffed vine leaves, shorbat adas, baba ganoush, fatteh, musakhan.
  Flavors: cumin, allspice, sumac, za'atar, cinnamon, tahini, parsley, lemon.`,
  },
  italian: {
    single: "Breakfasts: vegetable frittata, yogurt with honey, bruschetta, uova in purgatorio. Mains: pasta al pomodoro, penne arrabbiata, pasta e fagioli, beef ragu, chicken cacciatore, minestrone, caponata, ribollita. Never include pork.",
    weekly: `"italian":
  Breakfasts: vegetable frittata, yogurt with granola and honey, bruschetta al pomodoro, uova in purgatorio.
  Lunches and dinners: pasta al pomodoro, penne arrabbiata, pasta e fagioli, beef ragu, chicken cacciatore, minestrone, caponata, ribollita, pasta primavera.
  Halal note: never include pork.
  Pantry: dry pasta, canned tomatoes, olive oil, garlic, onion, eggs, parmesan, zucchini, eggplant, canned beans.`,
  },
} as const

export function getSingleCuisineGuide(cuisine: string): string {
  const guide = CUISINE_GUIDES[cuisine as keyof typeof CUISINE_GUIDES]?.single
  return guide ? `Cuisine style guide: ${guide}` : ""
}

export function getWeeklyCuisineGuidanceBlock(): string {
  return [
    "CUISINE GUIDANCE:",
    CUISINE_GUIDES.moroccan.weekly,
    "",
    CUISINE_GUIDES.mediterranean.weekly,
    "",
    CUISINE_GUIDES.healthy.weekly,
    "",
    CUISINE_GUIDES.middle_eastern.weekly,
    "",
    CUISINE_GUIDES.italian.weekly,
  ].join("\n")
}

export async function requestMealJson(prompt: string, options?: { maxTokens?: number; temperature?: number }) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: SYSTEM_JSON_ONLY },
      { role: "user", content: prompt },
    ],
    temperature: options?.temperature ?? 0.55,
    max_tokens: options?.maxTokens ?? 12000,
    response_format: { type: "json_object" },
  })

  const raw = completion.choices[0].message.content
  if (!raw) throw new Error("No response from OpenAI")
  return JSON.parse(extractJSON(raw))
}
