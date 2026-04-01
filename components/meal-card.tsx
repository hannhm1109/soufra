"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { RefreshCw, X, Flame, Loader2, Check } from "lucide-react"

type Recipe = {
  id: string
  name: string
  cuisine: string
  difficulty: string
  calories: number
  prepTime: number
  cookTime: number
  protein: number
  carbs: number
  fats: number
}

const cuisineEmoji: Record<string, string> = {
  moroccan:       "🇲🇦",
  french:         "🇫🇷",
  mediterranean:  "🫒",
  middle_eastern: "🧆",
  healthy:        "🥗",
  italian:        "🇮🇹",
}

export default function MealCard({ recipe, slotId }: { recipe: Recipe; slotId: string }) {
  const router = useRouter()
  const total  = recipe.protein + recipe.carbs + recipe.fats || 1

  const [open,         setOpen]         = useState(false)
  const [alternatives, setAlternatives] = useState<Recipe[]>([])
  const [fetching,     setFetching]     = useState(false)
  const [swapping,     setSwapping]     = useState<string | null>(null)

  const difficultyColor =
    recipe.difficulty === "easy"   ? { bg: "#F0FFF4", text: "#27AE60" } :
    recipe.difficulty === "medium" ? { bg: "#FFF7F0", text: "#E67E22" } :
                                     { bg: "#FFF0F0", text: "#E74C3C" }

  const openSwap = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
    setFetching(true)
    const res = await fetch(
      `/api/meal-plans/alternatives?cuisine=${recipe.cuisine}&excludeId=${recipe.id}`
    )
    const data = await res.json()
    setAlternatives(data.recipes ?? [])
    setFetching(false)
  }

  const doSwap = async (newRecipeId: string) => {
    setSwapping(newRecipeId)
    await fetch("/api/meal-plans/slots", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slotId, recipeId: newRecipeId }),
    })
    setOpen(false)
    setSwapping(null)
    router.refresh()
  }

  return (
    <>
      {/* Card */}
      <div className="relative group">
        <Link href={`/dashboard/recipe/${recipe.id}`}>
          <div className="p-3 rounded-xl border border-transparent bg-[#F0F7F7] cursor-pointer transition-all duration-200 hover:bg-white hover:border-[#2D5F5D] hover:shadow-lg hover:-translate-y-0.5">

            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm">{cuisineEmoji[recipe.cuisine] ?? "🍽️"}</span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: difficultyColor.bg, color: difficultyColor.text }}>
                {recipe.difficulty}
              </span>
            </div>

            <p
              className="text-xs font-semibold leading-tight mb-2 line-clamp-2 min-h-[32px]"
              style={{ color: "#2C3E50", fontFamily: "var(--font-playfair)" }}>
              {recipe.name}
            </p>

            <div className="flex items-center justify-between text-xs">
              <span style={{ color: "#E67E22" }}>🔥 {recipe.calories}</span>
              <span style={{ color: "#6B7280" }}>⏱ {recipe.prepTime + recipe.cookTime}m</span>
            </div>

            <div className="mt-2 flex rounded-full overflow-hidden h-1">
              <div style={{ width: `${(recipe.protein / total) * 100}%`, backgroundColor: "#E67E22" }} />
              <div style={{ width: `${(recipe.carbs   / total) * 100}%`, backgroundColor: "#2D5F5D" }} />
              <div style={{ width: `${(recipe.fats    / total) * 100}%`, backgroundColor: "#D4A574" }} />
            </div>
          </div>
        </Link>

        {/* Swap button — appears on card hover */}
        <button
          onClick={openSwap}
          title="Swap recipe"
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-150 hover:scale-110"
          style={{ backgroundColor: "#2D5F5D", color: "white" }}>
          <RefreshCw size={10} />
        </button>
      </div>

      {/* Swap modal — fixed overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setOpen(false)}>
          <div
            className="rounded-2xl w-full max-w-sm"
            style={{ backgroundColor: "white", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-center justify-between p-5 pb-3">
              <div>
                <h3 className="font-bold" style={{ color: "#2C3E50" }}>Swap Recipe</h3>
                <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                  {recipe.name}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100">
                <X size={16} style={{ color: "#6B7280" }} />
              </button>
            </div>

            <div className="px-5 pb-5">
              {fetching ? (
                <div className="flex items-center justify-center py-10 gap-2" style={{ color: "#9CA3AF" }}>
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">Finding alternatives…</span>
                </div>
              ) : alternatives.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm" style={{ color: "#9CA3AF" }}>
                    No alternatives found for this cuisine yet.
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#D1D5DB" }}>
                    Generate a new meal plan to get more recipes.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {alternatives.map(alt => {
                    const isSwapping = swapping === alt.id
                    return (
                      <button
                        key={alt.id}
                        onClick={() => doSwap(alt.id)}
                        disabled={swapping !== null}
                        className="w-full text-left p-3 rounded-xl transition-all duration-150 flex items-center gap-3"
                        style={{ backgroundColor: "#F8F9FA" }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#F0F7F7")}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#F8F9FA")}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: "#2C3E50" }}>
                            {alt.name}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <span className="text-xs flex items-center gap-1" style={{ color: "#E67E22" }}>
                              <Flame size={10} /> {alt.calories} kcal
                            </span>
                            <span className="text-xs" style={{ color: "#9CA3AF" }}>
                              {alt.prepTime + alt.cookTime}min
                            </span>
                          </div>
                        </div>
                        {isSwapping ? (
                          <Loader2 size={14} className="animate-spin flex-shrink-0" style={{ color: "#2D5F5D" }} />
                        ) : (
                          <Check size={14} className="flex-shrink-0 opacity-0 group-hover:opacity-100" style={{ color: "#2D5F5D" }} />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
