import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()
  const { slotId } = body

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify slot belongs to this user
  const slot = await prisma.mealPlanSlot.findUnique({
    where: { id: slotId },
    include: { mealPlan: { select: { userId: true, id: true } } },
  })

  if (!slot || slot.mealPlan.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // ── Recipe swap ──────────────────────────────────────────────
  if (body.recipeId !== undefined) {
    await prisma.mealPlanSlot.update({
      where: { id: slotId },
      data: { recipeId: body.recipeId },
    })
    return NextResponse.json({ success: true })
  }

  // ── Leftover toggle (dinner → next day lunch) ────────────────
  if (body.hasLeftovers !== undefined) {
    const next = Boolean(body.hasLeftovers)
    const nextDayIndex = (slot.dayOfWeek + 1) % 7
    const mealPlanId = slot.mealPlan.id

    // Find next day's lunch slot in the same plan
    const lunchSlot = await prisma.mealPlanSlot.findUnique({
      where: { mealPlanId_dayOfWeek_mealType: { mealPlanId, dayOfWeek: nextDayIndex, mealType: "lunch" } },
    })

    await prisma.$transaction([
      prisma.mealPlanSlot.update({ where: { id: slotId }, data: { hasLeftovers: next } }),
      ...(lunchSlot
        ? [prisma.mealPlanSlot.update({ where: { id: lunchSlot.id }, data: { usesLeftovers: next } })]
        : []),
    ])

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
}
