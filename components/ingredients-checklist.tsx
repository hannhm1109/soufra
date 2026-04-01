"use client"
import { useState } from "react"
import { ShoppingBasket, Check } from "lucide-react"

function scaleIngredient(text: string, factor: number): string {
  if (factor === 1) return text
  return text.replace(/(\d+(?:[.,]\d+)?)/, (match) => {
    const scaled = parseFloat(match.replace(",", ".")) * factor
    return Number.isInteger(scaled) ? scaled.toString() : scaled.toFixed(1)
  })
}

export default function IngredientsChecklist({ ingredients }: { ingredients: string[] }) {
  const [checked,  setChecked]  = useState<Record<number, boolean>>({})
  const [servings, setServings] = useState(1)

  const toggle = (i: number) =>
    setChecked(prev => ({ ...prev, [i]: !prev[i] }))

  const checkedCount = Object.values(checked).filter(Boolean).length

  return (
    <div className="rounded-2xl p-6" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold flex items-center gap-2" style={{ color: "#2C3E50" }}>
          <ShoppingBasket size={16} style={{ color: "#2D5F5D" }} />
          Ingredients
          {checkedCount > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium ml-1"
              style={{ backgroundColor: "#F0FFF4", color: "#27AE60" }}>
              {checkedCount}/{ingredients.length}
            </span>
          )}
        </h2>

        {/* Servings selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl" style={{ backgroundColor: "#F3F4F6" }}>
          {[1, 2, 3].map(n => (
            <button
              key={n}
              onClick={() => setServings(n)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150"
              style={{
                backgroundColor: servings === n ? "#2D5F5D" : "transparent",
                color: servings === n ? "white" : "#6B7280",
              }}>
              ×{n}
            </button>
          ))}
        </div>
      </div>

      {servings > 1 && (
        <p className="text-xs mb-3 px-3 py-1.5 rounded-lg" style={{ backgroundColor: "#FFF7F0", color: "#E67E22" }}>
          Quantities scaled for {servings} servings
        </p>
      )}

      {/* Ingredient list */}
      <ul className="space-y-2">
        {ingredients.map((ingredient, i) => {
          const isChecked = checked[i]
          return (
            <li
              key={i}
              onClick={() => toggle(i)}
              className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-150 group"
              style={{ backgroundColor: isChecked ? "#F0FFF4" : "transparent" }}
              onMouseEnter={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.backgroundColor = "#F8F9FA" }}
              onMouseLeave={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent" }}>

              {/* Checkbox */}
              <div
                className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200"
                style={{
                  borderColor: isChecked ? "#27AE60" : "#D1D5DB",
                  backgroundColor: isChecked ? "#27AE60" : "white",
                }}>
                {isChecked && <Check size={11} color="white" strokeWidth={3} />}
              </div>

              <span
                className="text-sm transition-all"
                style={{
                  color: isChecked ? "#9CA3AF" : "#2C3E50",
                  textDecoration: isChecked ? "line-through" : "none",
                }}>
                {scaleIngredient(ingredient, servings)}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
