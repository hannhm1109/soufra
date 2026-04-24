"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Heart, Clock, Flame, ChefHat, X, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface Recipe {
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

const cuisineColors: Record<string, { bg: string; color: string }> = {
  moroccan:       { bg: "#FFF7F0", color: "#E67E22" },
  mediterranean:  { bg: "#F0FFF4", color: "#27AE60" },
  middle_eastern: { bg: "#F5F3FF", color: "#6366F1" },
  healthy:        { bg: "#F0F7F7", color: "#2D5F5D" },
  italian:        { bg: "#FFF0F0", color: "#E74C3C" },
}

export default function FavoriteCard({ recipe }: { recipe: Recipe }) {
  const router = useRouter()
  const [removing, setRemoving] = useState(false)

  const handleRemove = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setRemoving(true)
    try {
      const res = await fetch("/api/feedback", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: recipe.id }),
      })
      if (res.ok) {
        toast("Removed from favorites")
        router.refresh()
      } else {
        toast.error("Couldn't remove. Try again.")
        setRemoving(false)
      }
    } catch {
      toast.error("Something went wrong.")
      setRemoving(false)
    }
  }

  const colors = cuisineColors[recipe.cuisine] ?? { bg: "#F0F7F7", color: "#2D5F5D" }
  const total = recipe.protein + recipe.carbs + recipe.fats || 1

  return (
    <div className="relative group">
      <Link href={`/dashboard/recipe/${recipe.id}`}>
        <div
          className="rounded-2xl p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
          style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>

          {/* Cuisine badge + heart */}
          <div className="flex items-center justify-between mb-3">
            <span
              className="text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full"
              style={{ backgroundColor: colors.bg, color: colors.color }}>
              {recipe.cuisine.replace("_", " ")}
            </span>
            <Heart size={16} style={{ color: "#E74C3C" }} fill="#E74C3C" />
          </div>

          {/* Recipe name */}
          <h3
            className="font-bold text-lg mb-3 leading-tight"
            style={{ color: "#2C3E50", fontFamily: "var(--font-playfair)" }}>
            {recipe.name}
          </h3>

          {/* Stats row */}
          <div className="flex items-center gap-3">
            {[
              { icon: Clock,   label: `${recipe.prepTime + recipe.cookTime}min` },
              { icon: Flame,   label: `${recipe.calories} kcal` },
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
              <div style={{ width: `${(recipe.protein / total) * 100}%`, backgroundColor: "#E67E22" }} />
              <div style={{ width: `${(recipe.carbs   / total) * 100}%`, backgroundColor: "#2D5F5D" }} />
              <div style={{ width: `${(recipe.fats    / total) * 100}%`, backgroundColor: "#D4A574" }} />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-xs" style={{ color: "#E67E22" }}>P {recipe.protein}g</span>
              <span className="text-xs" style={{ color: "#2D5F5D" }}>C {recipe.carbs}g</span>
              <span className="text-xs" style={{ color: "#D4A574" }}>F {recipe.fats}g</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Remove button — visible on hover (desktop) or always on touch */}
      <button
        onClick={handleRemove}
        disabled={removing}
        title="Remove from favorites"
        className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-60 hover:scale-110 active:scale-95"
        style={{ backgroundColor: "#FFF0F0", color: "#E74C3C" }}>
        {removing
          ? <Loader2 size={13} className="animate-spin" />
          : <X size={13} strokeWidth={2.5} />}
      </button>
    </div>
  )
}
