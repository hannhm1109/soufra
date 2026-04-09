import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Heart } from "lucide-react"
import Link from "next/link"
import FavoriteCard from "@/components/favorite-card"

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

  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1 flex items-center gap-3" style={{ color: "#2C3E50" }}>
          Your Favorites
          <Heart size={22} fill="#E74C3C" style={{ color: "#E74C3C" }} />
        </h1>
        <p style={{ color: "#6B7280" }}>
          Recipes you loved - the AI uses these to improve your meal plans
        </p>
      </div>

      {likedRecipes.length > 0 ? (
        <>
          {/* Stats */}
          <div
            className="rounded-2xl p-4 mb-6 flex flex-wrap items-center gap-x-5 gap-y-2"
            style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center gap-2">
              <Heart size={18} style={{ color: "#E74C3C" }} fill="#E74C3C" />
              <span className="font-semibold" style={{ color: "#2C3E50" }}>
                {likedRecipes.length} liked recipes
              </span>
            </div>
            <span className="text-sm" style={{ color: "#6B7280" }}>
              Avg. {Math.round(likedRecipes.reduce((s, r) => s + r.calories, 0) / likedRecipes.length)} cal per recipe
            </span>
            <span className="text-sm" style={{ color: "#6B7280" }}>
              Most loved:{" "}
              <span className="font-medium" style={{ color: "#2C3E50" }}>
                {Object.entries(
                  likedRecipes.reduce((acc, r) => ({
                    ...acc,
                    [r.cuisine]: (acc[r.cuisine] || 0) + 1
                  }), {} as Record<string, number>)
                ).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A"}
              </span> cuisine
            </span>
          </div>

          {/* Recipe Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {likedRecipes.map((recipe) => (
              <FavoriteCard key={recipe.id} recipe={recipe} />
            ))}
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
            Like recipes from your meal plan and they&apos;ll appear here
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