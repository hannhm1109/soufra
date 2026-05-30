import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ChefHat, Clock, Flame, Heart, Search } from "lucide-react"
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
  const avgCalories = likedRecipes.length
    ? Math.round(likedRecipes.reduce((sum, recipe) => sum + recipe.calories, 0) / likedRecipes.length)
    : 0
  const avgTime = likedRecipes.length
    ? Math.round(likedRecipes.reduce((sum, recipe) => sum + recipe.prepTime + recipe.cookTime, 0) / likedRecipes.length)
    : 0
  const topCuisine = Object.entries(
    likedRecipes.reduce((acc, recipe) => {
      acc[recipe.cuisine] = (acc[recipe.cuisine] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).sort((a, b) => b[1] - a[1])[0]?.[0]
  const topTags = Object.entries(
    likedRecipes.flatMap((recipe) => recipe.tags).reduce((acc, tag) => {
      acc[tag] = (acc[tag] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)

  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-3" style={{ color: "#2C3E50" }}>
            Your Favorites
            <Heart size={22} fill="#E74C3C" style={{ color: "#E74C3C" }} />
          </h1>
          <p style={{ color: "#6B7280" }}>
            Recipes you loved, collected in one place for faster meal-plan inspiration.
          </p>
        </div>
        <Link
          href="/recipes"
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all hover:shadow-md"
          style={{ backgroundColor: "#F0F7F7", color: "#2D5F5D" }}>
          <Search size={16} />
          Browse recipes
        </Link>
      </div>

      {likedRecipes.length > 0 ? (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Liked recipes", value: likedRecipes.length, icon: Heart, color: "#E74C3C", fill: true },
              { label: "Avg. calories", value: `${avgCalories} cal`, icon: Flame, color: "#E67E22" },
              { label: "Avg. time", value: `${avgTime} min`, icon: Clock, color: "#2D5F5D" },
              { label: "Top cuisine", value: topCuisine?.replace("_", " ") ?? "N/A", icon: ChefHat, color: "#6366F1" },
            ].map(({ label, value, icon: Icon, color, fill }) => (
              <div
                key={label}
                className="rounded-xl p-4"
                style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: "#F8F4EE" }}>
                  <Icon size={17} style={{ color }} fill={fill ? color : "none"} />
                </div>
                <p className="text-xs uppercase tracking-wide" style={{ color: "#9CA3AF" }}>{label}</p>
                <p className="text-lg font-bold capitalize" style={{ color: "#2C3E50" }}>{value}</p>
              </div>
            ))}
          </div>

          {topTags.length > 0 && (
            <div
              className="rounded-2xl px-5 py-3 mb-6 flex flex-wrap items-center gap-2"
              style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <span className="text-sm font-semibold mr-1" style={{ color: "#2C3E50" }}>
                Favorite patterns
              </span>
              {topTags.map(([tag, count]) => (
                <span
                  key={tag}
                  className="rounded-full px-3 py-1 text-xs font-medium"
                  style={{ backgroundColor: "#F0F7F7", color: "#2D5F5D" }}>
                  {tag} {count > 1 ? `x${count}` : ""}
                </span>
              ))}
            </div>
          )}

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
