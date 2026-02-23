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

export default function MealCard({ recipe }: { recipe: Recipe }) {
  const total = recipe.protein + recipe.carbs + recipe.fats

  const cuisineFlag =
    recipe.cuisine === "moroccan" ? "🇲🇦" :
    recipe.cuisine === "french" ? "🇫🇷" :
    recipe.cuisine === "italian" ? "🇮🇹" :
    recipe.cuisine === "mediterranean" ? "🫒" :
    recipe.cuisine === "middle_eastern" ? "🧆" : "🥗"

  const difficultyStyle = {
    backgroundColor:
      recipe.difficulty === "easy" ? "#F0FFF4" :
      recipe.difficulty === "medium" ? "#FFF7F0" : "#FFF0F0",
    color:
      recipe.difficulty === "easy" ? "#27AE60" :
      recipe.difficulty === "medium" ? "#E67E22" : "#E74C3C",
  }

  return (
    <Link href={`/dashboard/recipe/${recipe.id}`}>
      <div
        className="p-3 rounded-xl cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1"
        style={{ backgroundColor: "#F0F7F7", border: "1px solid transparent" }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "#2D5F5D"
          ;(e.currentTarget as HTMLElement).style.backgroundColor = "white"
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "transparent"
          ;(e.currentTarget as HTMLElement).style.backgroundColor = "#F0F7F7"
        }}>

        <div className="flex items-center justify-between mb-1">
          <span className="text-xs">{cuisineFlag}</span>
          <span
            className="text-xs px-1.5 py-0.5 rounded-full font-medium"
            style={{ ...difficultyStyle, fontSize: "10px" }}>
            {recipe.difficulty}
          </span>
        </div>

        <p
          className="text-xs font-semibold leading-tight mb-2"
          style={{
            color: "#2C3E50",
            fontFamily: "var(--font-playfair)",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: "32px"
          }}>
          {recipe.name}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-xs" style={{ color: "#E67E22" }}>
            🔥 {recipe.calories}
          </span>
          <span className="text-xs" style={{ color: "#6B7280" }}>
            ⏱ {recipe.prepTime + recipe.cookTime}m
          </span>
        </div>

        <div className="mt-2 flex rounded-full overflow-hidden h-1">
          <div style={{ width: `${(recipe.protein / total) * 100}%`, backgroundColor: "#E67E22" }} />
          <div style={{ width: `${(recipe.carbs / total) * 100}%`, backgroundColor: "#2D5F5D" }} />
          <div style={{ width: `${(recipe.fats / total) * 100}%`, backgroundColor: "#D4A574" }} />
        </div>
      </div>
    </Link>
  )
}
