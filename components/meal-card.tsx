"use client"
import Link from "next/link"

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
  moroccan:      "🇲🇦",
  french:        "🇫🇷",
  mediterranean: "🫒",
  middle_eastern:"🧆",
  healthy:       "🥗",
  italian:       "🇮🇹",
}

export default function MealCard({ recipe }: { recipe: Recipe }) {
  const total = recipe.protein + recipe.carbs + recipe.fats || 1

  const difficultyColor =
    recipe.difficulty === "easy"   ? { bg: "#F0FFF4", text: "#27AE60" } :
    recipe.difficulty === "medium" ? { bg: "#FFF7F0", text: "#E67E22" } :
                                     { bg: "#FFF0F0", text: "#E74C3C" }

  return (
    <Link href={`/dashboard/recipe/${recipe.id}`}>
      <div className="group p-3 rounded-xl border border-transparent bg-[#F0F7F7] cursor-pointer transition-all duration-200 hover:bg-white hover:border-[#2D5F5D] hover:shadow-lg hover:-translate-y-0.5">

        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm">{cuisineEmoji[recipe.cuisine] ?? "🍽️"}</span>
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: difficultyColor.bg, color: difficultyColor.text }}
          >
            {recipe.difficulty}
          </span>
        </div>

        <p
          className="text-xs font-semibold leading-tight mb-2 line-clamp-2 min-h-[32px]"
          style={{ color: "#2C3E50", fontFamily: "var(--font-playfair)" }}
        >
          {recipe.name}
        </p>

        <div className="flex items-center justify-between text-xs">
          <span style={{ color: "#E67E22" }}>🔥 {recipe.calories}</span>
          <span style={{ color: "#6B7280" }}>⏱ {recipe.prepTime + recipe.cookTime}m</span>
        </div>

        {/* Macro bar */}
        <div className="mt-2 flex rounded-full overflow-hidden h-1">
          <div style={{ width: `${(recipe.protein / total) * 100}%`, backgroundColor: "#E67E22" }} />
          <div style={{ width: `${(recipe.carbs   / total) * 100}%`, backgroundColor: "#2D5F5D" }} />
          <div style={{ width: `${(recipe.fats    / total) * 100}%`, backgroundColor: "#D4A574" }} />
        </div>
      </div>
    </Link>
  )
}
