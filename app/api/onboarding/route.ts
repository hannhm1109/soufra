import { auth } from "@/lib/auth"
import { calculateCalories } from "@/lib/nutrition"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const data = await req.json()
  const calorieTarget = calculateCalories(data)

  await prisma.user.update({
    where: { email: session.user.email },
    data: {
      age: parseInt(data.age),
      weight: parseFloat(data.weight),
      height: parseFloat(data.height),
      gender: data.gender || null,
      city: data.city || "Casablanca",
      marketTier: data.marketTier || "supermarket",
      fitnessGoal: data.fitnessGoal,
      activityLevel: data.activityLevel,
      cuisines: data.cuisines,
      allergies: data.allergies,
      weeklyBudget: parseFloat(data.weeklyBudget),
      calorieTarget: calorieTarget ?? undefined,
    },
  })

  return NextResponse.json({ success: true })
}
