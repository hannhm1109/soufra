import { auth } from "@/lib/auth"
import { calculateCalories } from "@/lib/nutrition"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { revalidatePath } from "next/cache"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const data = await req.json()
  const calorieTarget = calculateCalories(data)

  try {
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: data.name,
        age: parseInt(data.age) || null,
        weight: parseFloat(data.weight) || null,
        height: parseFloat(data.height) || null,
        gender: data.gender || null,
        city: data.city || "Casablanca",
        marketTier: data.marketTier || "supermarket",
        fitnessGoal: data.fitnessGoal,
        activityLevel: data.activityLevel,
        cuisines: data.cuisines,
        allergies: data.allergies,
        weeklyBudget: parseFloat(data.weeklyBudget) || null,
        isRamadan: Boolean(data.isRamadan),
        calorieTarget,
      }
    })

    revalidatePath("/", "layout")
    revalidatePath("/dashboard")
    revalidatePath("/settings")

    return NextResponse.json({ success: true, calorieTarget })
  } catch {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}
