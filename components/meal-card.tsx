"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { RefreshCw, X, Flame, Loader2, Check, Sparkles, PackageCheck } from "lucide-react"
import { toast } from "sonner"

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

export default function MealCard({
  recipe,
  slotId,
  mealType,
  hasLeftovers: initialHasLeftovers = false,
  usesLeftovers = false,
}: {
  recipe: Recipe
  slotId: string
  mealType?: string
  hasLeftovers?: boolean
  usesLeftovers?: boolean
}) {
  const router = useRouter()
  const total  = recipe.protein + recipe.carbs + recipe.fats || 1

  const [open,           setOpen]           = useState(false)
  const [alternatives,   setAlternatives]   = useState<Recipe[]>([])
  const [fetching,       setFetching]       = useState(false)
  const [swapping,       setSwapping]       = useState<string | null>(null)
  const [aiLoading,      setAiLoading]      = useState(false)
  const [hasLeftovers,   setHasLeftovers]   = useState(initialHasLeftovers)
  const [leftoverSaving, setLeftoverSaving] = useState(false)

  const difficultyColor =
    recipe.difficulty === "easy"   ? { bg: "#F0FFF4", text: "#27AE60" } :
    recipe.difficulty === "medium" ? { bg: "#FFF7F0", text: "#E67E22" } :
                                     { bg: "#FFF0F0", text: "#E74C3C" }

  const openSwap = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(true)
    setFetching(true)
    try {
      const params = new URLSearchParams({
        cuisine:   recipe.cuisine,
        excludeId: recipe.id,
        ...(mealType ? { mealType } : {}),
      })
      const res = await fetch(`/api/meal-plans/alternatives?${params}`)
      const data = await res.json()
      setAlternatives(data.recipes ?? [])
    } catch {
      setAlternatives([])
    } finally {
      setFetching(false)
    }
  }

  const doSwap = async (newRecipeId: string) => {
    setSwapping(newRecipeId)
    try {
      const res = await fetch("/api/meal-plans/slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, recipeId: newRecipeId }),
      })
      if (!res.ok) throw new Error("swap failed")
      setOpen(false)
      toast.success("Recipe swapped!")
      router.refresh()
    } catch {
      toast.error("Couldn't swap recipe. Try again.")
    } finally {
      setSwapping(null)
    }
  }

  const doAIGenerate = async () => {
    setAiLoading(true)
    try {
      const res = await fetch("/api/meal-plans/generate-single", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId }),
      })
      if (res.ok) {
        setOpen(false)
        toast.success("Fresh meal generated!")
        router.refresh()
      } else {
        toast.error("Couldn't generate a meal. Try again.")
      }
    } catch {
      toast.error("Something went wrong.")
    } finally {
      setAiLoading(false)
    }
  }

  const toggleLeftovers = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const next = !hasLeftovers
    setHasLeftovers(next)
    setLeftoverSaving(true)
    try {
      await fetch("/api/meal-plans/slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, hasLeftovers: next }),
      })
      router.refresh()
    } catch {
      setHasLeftovers(!next) // revert
    } finally {
      setLeftoverSaving(false)
    }
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

            {/* Leftover badges */}
            {usesLeftovers && (
              <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit"
                style={{ backgroundColor: "#FFF7F0", color: "#E67E22" }}>
                🥡 Using yesterday&apos;s leftovers
              </div>
            )}
            {hasLeftovers && (
              <div className="mt-2 flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full w-fit"
                style={{ backgroundColor: "#F0FFF4", color: "#27AE60" }}>
                <PackageCheck size={9} /> Leftovers packed
              </div>
            )}
          </div>
        </Link>

        {/* Pack leftovers button — only for dinner slots */}
        {mealType === "dinner" && !usesLeftovers && (
          <button
            onClick={toggleLeftovers}
            title={hasLeftovers ? "Unmark leftovers" : "Pack leftovers for tomorrow's lunch"}
            className="absolute bottom-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-70 transition-all duration-150 hover:scale-110 active:scale-95"
            style={{
              backgroundColor: hasLeftovers ? "#27AE60" : "#E67E22",
              color: "white",
              opacity: leftoverSaving ? 0.6 : undefined,
            }}>
            {leftoverSaving ? <Loader2 size={10} className="animate-spin" /> : <PackageCheck size={11} />}
          </button>
        )}

        {/* Swap button — hover on desktop, always visible on touch devices */}
        <button
          onClick={openSwap}
          title="Swap recipe"
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-70 transition-all duration-150 hover:scale-110 hover:opacity-100 active:scale-95"
          style={{ backgroundColor: "#2D5F5D", color: "white" }}>
          <RefreshCw size={11} />
        </button>
      </div>

      {/* Swap modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
          onClick={() => setOpen(false)}>
          <div
            className="rounded-2xl w-full max-w-sm"
            style={{ backgroundColor: "white", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between p-5 pb-3">
              <div>
                <h3 className="font-bold" style={{ color: "#2C3E50" }}>Swap Recipe</h3>
                <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{recipe.name}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-gray-100">
                <X size={16} style={{ color: "#6B7280" }} />
              </button>
            </div>

            <div className="px-5 pb-5 space-y-3">
              {fetching ? (
                <div className="flex items-center justify-center py-8 gap-2" style={{ color: "#9CA3AF" }}>
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">Finding alternatives…</span>
                </div>
              ) : (
                <>
                  {/* DB alternatives */}
                  {alternatives.length > 0 && (
                    <div className="space-y-2">
                      {alternatives.map(alt => {
                        const isSwapping = swapping === alt.id
                        return (
                          <button
                            key={alt.id}
                            onClick={() => doSwap(alt.id)}
                            disabled={swapping !== null || aiLoading}
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
                            {isSwapping
                              ? <Loader2 size={14} className="animate-spin flex-shrink-0" style={{ color: "#2D5F5D" }} />
                              : <Check size={14} className="flex-shrink-0 opacity-0 group-hover:opacity-100" style={{ color: "#2D5F5D" }} />
                            }
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* Divider when both DB + AI are shown */}
                  {alternatives.length > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-px" style={{ backgroundColor: "#F3F4F6" }} />
                      <span className="text-xs" style={{ color: "#D1D5DB" }}>or</span>
                      <div className="flex-1 h-px" style={{ backgroundColor: "#F3F4F6" }} />
                    </div>
                  )}

                  {/* AI generate button — always shown */}
                  <button
                    onClick={doAIGenerate}
                    disabled={swapping !== null || aiLoading}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl font-semibold text-sm transition-all duration-150 disabled:opacity-50"
                    style={{ backgroundColor: "#F0F7F7", color: "#2D5F5D" }}
                    onMouseEnter={e => { if (!aiLoading) e.currentTarget.style.backgroundColor = "#E8F3F2" }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#F0F7F7" }}>
                    {aiLoading ? (
                      <><Loader2 size={15} className="animate-spin" /> Generating…</>
                    ) : (
                      <><Sparkles size={15} /> Generate a fresh meal with AI</>
                    )}
                  </button>

                  {alternatives.length === 0 && !aiLoading && (
                    <p className="text-center text-xs" style={{ color: "#9CA3AF" }}>
                      No saved alternatives yet — AI will create one just for you
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
