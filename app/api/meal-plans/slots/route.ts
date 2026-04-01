import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { slotId, recipeId } = await req.json()

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify slot belongs to this user
  const slot = await prisma.mealPlanSlot.findUnique({
    where: { id: slotId },
    include: { mealPlan: { select: { userId: true } } },
  })

  if (!slot || slot.mealPlan.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.mealPlanSlot.update({
    where: { id: slotId },
    data: { recipeId },
  })

  return NextResponse.json({ success: true })
}
