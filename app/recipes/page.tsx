import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import RecipeSearch from "@/components/recipe-search"

export default async function RecipesPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) redirect("/login")

  const recipes = await prisma.recipe.findMany({
    where: {
      mealPlanSlots: {
        some: {
          mealPlan: { userId: user.id }
        }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  const feedback = await prisma.recipeFeedback.findMany({
    where: { userId: user.id }
  })

  const feedbackMap = feedback.reduce((acc, f) => ({
    ...acc,
    [f.recipeId]: f.liked
  }), {} as Record<string, boolean>)

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: "#2C3E50" }}>
          Browse Recipes
        </h1>
        <p className="text-sm lg:text-base" style={{ color: "#6B7280" }}>
          All recipes from your meal plans — search, filter and explore
        </p>
      </div>

      <RecipeSearch recipes={recipes} feedbackMap={feedbackMap} />
    </div>
  )
}
