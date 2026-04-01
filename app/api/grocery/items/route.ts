import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id, checked } = await req.json()

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // Verify the item belongs to this user before updating
  const item = await prisma.groceryItem.findUnique({
    where: { id },
    include: { groceryList: { select: { userId: true } } },
  })

  if (!item || item.groceryList.userId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await prisma.groceryItem.update({ where: { id }, data: { checked } })

  return NextResponse.json({ success: true })
}
