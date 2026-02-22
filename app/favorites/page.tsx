import { auth } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { redirect } from "next/navigation"
import { Heart, Clock, Flame, ChefHat } from "lucide-react"
import Link from "next/link"

const prisma = new PrismaClient()

export default async function FavoritesPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      feedback: {
        where: { liked: true },
        include: { recipe: true },
        orderBy: { createdAt: "desc" }
      }
    }
  })

  if (!user) redirect("/login")

  const likedRecipes = user.feedback.map(f => f.recipe)

  const cuisineColors: Record<string, { bg: string; color: string }> = {
    moroccan: { bg: "#FFF7F0", color: "#E67E22" },
    french: { bg: "#F0F7FF", color: "#3498DB" },
    mediterranean: { bg: "#F0FFF4", color: "#27AE60" },
    italian: { bg: "#FFF0F0", color: "#E74C3C" },
    healthy: { bg: "#F0F7F7", color: "#2D5F5D" },
  }

  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1" style={{ color: "#2C3E50" }}>
          Your Favorites ❤️
        </h1>
        <p style={{ color: "#6B7280" }}>
          Recipes you loved - the AI uses these to improve your meal plans
        </p>
      </div>

      {likedRecipes.length > 0 ? (
        <>
          {/* Stats */}
          <div
            className="rounded-2xl p-4 mb-6 flex items-center gap-6"
            style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center gap-2">
              <Heart size={18} style={{ color: "#E74C3C" }} fill="#E74C3C" />
              <span className="font-semibold" style={{ color: "#2C3E50" }}>
                {likedRecipes.length} liked recipes
              </span>
            </div>
            <div className="h-4 w-px" style={{ backgroundColor: "#E5E7EB" }} />
            <span className="text-sm" style={{ color: "#6B7280" }}>
              Avg. {Math.round(likedRecipes.reduce((s, r) => s + r.calories, 0) / likedRecipes.length)} cal per recipe
            </span>
            <div className="h-4 w-px" style={{ backgroundColor: "#E5E7EB" }} />
            <span className="text-sm" style={{ color: "#6B7280" }}>
              Most loved: {
                Object.entries(
                  likedRecipes.reduce((acc, r) => ({
                    ...acc,
                    [r.cuisine]: (acc[r.cuisine] || 0) + 1
                  }), {} as Record<string, number>)
                ).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A"
              } cuisine
            </span>
          </div>

          {/* Recipe Grid */}
          <div className="grid grid-cols-3 gap-6">
            {likedRecipes.map((recipe) => {
              const colors = cuisineColors[recipe.cuisine] || { bg: "#F0F7F7", color: "#2D5F5D" }
              return (
                <Link key={recipe.id} href={`/dashboard/recipe/${recipe.id}`}>
                  <div
                    className="rounded-2xl p-6 cursor-pointer transition-all hover:shadow-md hover:scale-105"
                    style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>

                    {/* Cuisine badge */}
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full"
                        style={{ backgroundColor: colors.bg, color: colors.color }}>
                        {recipe.cuisine}
                      </span>
                      <Heart size={16} style={{ color: "#E74C3C" }} fill="#E74C3C" />
                    </div>

                    {/* Recipe name */}
                    <h3
                      className="font-bold text-lg mb-3 leading-tight"
                      style={{ color: "#2C3E50", fontFamily: "var(--font-playfair)" }}>
                      {recipe.name}
                    </h3>

                    {/* Stats */}
                    <div className="flex items-center gap-3">
                      {[
                        { icon: Clock, label: `${recipe.prepTime + recipe.cookTime}min` },
                        { icon: Flame, label: `${recipe.calories}cal` },
                        { icon: ChefHat, label: recipe.difficulty },
                      ].map(({ icon: Icon, label }) => (
                        <div key={label} className="flex items-center gap-1">
                          <Icon size={12} style={{ color: "#9CA3AF" }} />
                          <span className="text-xs" style={{ color: "#6B7280" }}>{label}</span>
                        </div>
                      ))}
                    </div>

                    {/* Macros bar */}
                    <div className="mt-4">
                      <div className="flex rounded-full overflow-hidden h-2">
                        <div
                          style={{
                            width: `${(recipe.protein / (recipe.protein + recipe.carbs + recipe.fats)) * 100}%`,
                            backgroundColor: "#E67E22"
                          }}
                        />
                        <div
                          style={{
                            width: `${(recipe.carbs / (recipe.protein + recipe.carbs + recipe.fats)) * 100}%`,
                            backgroundColor: "#2D5F5D"
                          }}
                        />
                        <div
                          style={{
                            width: `${(recipe.fats / (recipe.protein + recipe.carbs + recipe.fats)) * 100}%`,
                            backgroundColor: "#D4A574"
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs" style={{ color: "#E67E22" }}>P {recipe.protein}g</span>
                        <span className="text-xs" style={{ color: "#2D5F5D" }}>C {recipe.carbs}g</span>
                        <span className="text-xs" style={{ color: "#D4A574" }}>F {recipe.fats}g</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </>
      ) : (
        /* Empty state */
        <div
          className="rounded-2xl p-16 text-center"
          style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "#FFF0F0" }}>
            <Heart size={40} style={{ color: "#E74C3C" }} />
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: "#2C3E50" }}>
            No favorites yet
          </h3>
          <p className="mb-6" style={{ color: "#6B7280" }}>
            Like recipes from your meal plan and they'll appear here
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
            style={{ backgroundColor: "#2D5F5D" }}>
            Go to meal plan
          </Link>
        </div>
      )}
    </div>
  )
}