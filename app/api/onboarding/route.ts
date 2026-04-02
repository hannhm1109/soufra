import { auth } from "@/lib/auth"
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
      fitnessGoal: data.fitnessGoal,
      activityLevel: data.activityLevel,
      cuisines: data.cuisines,
      allergies: data.allergies,
      weeklyBudget: parseFloat(data.weeklyBudget),
      calorieTarget,
    },
  })

  return NextResponse.json({ success: true })
}

function calculateCalories(data: Record<string, string>) {
  const weight = parseFloat(data.weight)
  const height = parseFloat(data.height)
  const age = parseInt(data.age)

  // Mifflin-St Jeor formula (gender-aware)
  const offset = data.gender === "female" ? -161 : 5
  const bmr = 10 * weight + 6.25 * height - 5 * age + offset

  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
  }

  const multiplier = activityMultipliers[data.activityLevel] || 1.55
  let calories = Math.round(bmr * multiplier)

  if (data.fitnessGoal === "lose_weight") calories -= 500
  if (data.fitnessGoal === "gain_muscle") calories += 300

  return Math.min(3500, Math.max(1200, calories))
}