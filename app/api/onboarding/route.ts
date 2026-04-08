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
  const age = Number.parseInt(String(data.age ?? ""), 10)
  const weight = Number.parseFloat(String(data.weight ?? ""))
  const height = Number.parseFloat(String(data.height ?? ""))
  const weeklyBudget = Number.parseFloat(String(data.weeklyBudget ?? ""))

  if (
    !Number.isFinite(age) ||
    !Number.isFinite(weight) ||
    !Number.isFinite(height) ||
    !Number.isFinite(weeklyBudget) ||
    !data.gender ||
    !data.fitnessGoal ||
    !data.activityLevel
  ) {
    return NextResponse.json({ error: "Please complete your profile before continuing." }, { status: 400 })
  }

  await prisma.user.update({
    where: { email: session.user.email },
    data: {
      age,
      weight,
      height,
      gender: data.gender || null,
      city: data.city || "Casablanca",
      marketTier: data.marketTier || "supermarket",
      fitnessGoal: data.fitnessGoal,
      activityLevel: data.activityLevel,
      cuisines: data.cuisines,
      allergies: data.allergies,
      weeklyBudget,
      calorieTarget: calorieTarget ?? undefined,
    },
  })

  return NextResponse.json({ success: true })
}
