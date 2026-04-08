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
  const parsedAge = Number.parseInt(String(data.age ?? ""), 10)
  const parsedWeight = Number.parseFloat(String(data.weight ?? ""))
  const parsedHeight = Number.parseFloat(String(data.height ?? ""))
  const parsedBudget = Number.parseFloat(String(data.weeklyBudget ?? ""))

  try {
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        name: data.name,
        age: Number.isFinite(parsedAge) ? parsedAge : null,
        weight: Number.isFinite(parsedWeight) ? parsedWeight : null,
        height: Number.isFinite(parsedHeight) ? parsedHeight : null,
        gender: data.gender || null,
        city: data.city || "Casablanca",
        marketTier: data.marketTier || "supermarket",
        fitnessGoal: data.fitnessGoal,
        activityLevel: data.activityLevel,
        cuisines: data.cuisines,
        allergies: data.allergies,
        weeklyBudget: Number.isFinite(parsedBudget) ? parsedBudget : null,
        ...(typeof data.isRamadan === "boolean" ? { isRamadan: data.isRamadan } : {}),
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
