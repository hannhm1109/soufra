import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const cuisine   = searchParams.get("cuisine")   ?? ""
  const excludeId = searchParams.get("excludeId") ?? ""

  const recipes = await prisma.recipe.findMany({
    where: {
      cuisine,
      id: { not: excludeId },
    },
    take: 4,
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ recipes })
}
