import { prisma } from "@/lib/prisma"
import { sendWeeklyReport } from "@/lib/email"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (
    process.env.NODE_ENV === "production" &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const appUrl = process.env.NEXTAUTH_URL ?? "https://soufra.vercel.app"

  const users = await prisma.user.findMany({
    where: { mealPlans: { some: { isActive: true } } },
    include: {
      mealPlans: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { slots: { include: { recipe: true } } },
      },
      groceryLists: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      feedback: {
        where: { liked: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { recipe: { select: { name: true } } },
      },
    },
  })

  let sent = 0
  let failed = 0

  for (const user of users) {
    if (!user.email) continue

    const activePlan = user.mealPlans[0] ?? null
    if (!activePlan) continue

    const slots = activePlan.slots
    const mealsPlanned = slots.length

    const avgCalories = mealsPlanned > 0
      ? Math.round(slots.reduce((s: number, sl) => s + sl.recipe.calories, 0) / 7)
      : null

    const cuisineCounts: Record<string, number> = {}
    for (const slot of slots) {
      cuisineCounts[slot.recipe.cuisine] = (cuisineCounts[slot.recipe.cuisine] ?? 0) + 1
    }
    const topCuisine = Object.entries(cuisineCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

    const topRatedRecipe = user.feedback[0]?.recipe.name ?? null
    const grocery = user.groceryLists[0] ?? null

    try {
      await sendWeeklyReport({
        email:         user.email,
        firstName:     user.name?.split(" ")[0] ?? "there",
        avgCalories,
        calorieTarget: user.calorieTarget,
        mealsPlanned,
        topCuisine,
        topRatedRecipe,
        totalCost:     grocery?.totalCost ?? null,
        weeklyBudget:  user.weeklyBudget,
        fitnessGoal:   user.fitnessGoal,
        appUrl,
      })
      sent++
    } catch (err) {
      console.error(`Weekly report failed for ${user.email}:`, err)
      failed++
    }
  }

  return NextResponse.json({ success: true, sent, failed })
}
