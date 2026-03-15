import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { getRecipeImage } from "@/lib/unsplash"

export async function POST() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const recipes = await prisma.recipe.findMany({
    where: { imageUrl: null },
    select: { id: true, name: true, cuisine: true },
  })

  let updated = 0
  let failed = 0

  for (const recipe of recipes) {
    const imageUrl = await getRecipeImage(recipe.name, recipe.cuisine)
    if (imageUrl) {
      await prisma.recipe.update({
        where: { id: recipe.id },
        data: { imageUrl },
      })
      updated++
    } else {
      failed++
    }
  }

  return NextResponse.json({ total: recipes.length, updated, failed })
}
