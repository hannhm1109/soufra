import { auth } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { NextResponse } from "next/server"

const prisma = new PrismaClient()

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { recipeId, liked } = await req.json()

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  // Upsert - update if exists, create if not
  const feedback = await prisma.recipeFeedback.upsert({
    where: {
      userId_recipeId: {
        userId: user.id,
        recipeId,
      }
    },
    update: { liked },
    create: {
      userId: user.id,
      recipeId,
      liked,
    }
  })

  return NextResponse.json({ success: true, feedback })
}

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const recipeId = searchParams.get("recipeId")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const feedback = await prisma.recipeFeedback.findUnique({
    where: {
      userId_recipeId: {
        userId: user.id,
        recipeId: recipeId!,
      }
    }
  })

  return NextResponse.json({ liked: feedback?.liked ?? null })
}