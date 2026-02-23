"use client"
import { useState } from "react"
import Link from "next/link"
import { Calendar, ChevronDown, ChevronUp } from "lucide-react"

const cuisineEmojis: Record<string, string> = {
  moroccan: "🇲🇦",
  french: "🇫🇷",
  italian: "🇮🇹",
  mediterranean: "🫒",
  middle_eastern: "🧆",
  healthy: "🥗",
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const MEAL_TYPES = ["breakfast", "lunch", "dinner"] as const
type MealType = typeof MEAL_TYPES[number]

const mealTypeLabel: Record<MealType, string> = {
  breakfast: "🌅 Breakfast",
  lunch: "☀️ Lunch",
  dinner: "🌙 Dinner",
}

type Slot = {
  id: string
  dayOfWeek: number
  mealType: string
  recipe: {
    id: string
    name: string
    cuisine: string
    calories: number
    protein: number
    carbs: number
    fats: number
    difficulty: string
  }
}

type Plan = {
  id: string
  createdAt: Date
  isActive: boolean
  slots: Slot[]
}

export default function HistoryPlanCard({
  plan,
  planNumber,
}: {
  plan: Plan
  planNumber: number
}) {
  const [activeMeal, setActiveMeal] = useState<MealType>("breakfast")
  const [expanded, setExpanded] = useState(plan.isActive)

  const totalCalories = plan.slots.reduce((sum, s) => sum + s.recipe.calories, 0)
  const avgCaloriesPerDay = Math.round(totalCalories / 7)
  const avgProtein = Math.round(plan.slots.reduce((s, sl) => s + sl.recipe.protein, 0) / plan.slots.length)
  const cuisines = [...new Set(plan.slots.map(s => s.recipe.cuisine))]

  const slotsForMeal = plan.slots.filter(s => s.mealType === activeMeal)

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>

      {/* Header */}
      <div
        className="p-5 lg:p-6"
        style={{ backgroundColor: plan.isActive ? "#2D5F5D" : "#F8F9FA" }}>

        <div className="flex items-start justify-between gap-4">
          {/* Left: icon + info */}
          <div className="flex items-center gap-3 lg:gap-4 min-w-0">
            <div
              className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex-shrink-0 flex items-center justify-center"
              style={{ backgroundColor: plan.isActive ? "rgba(212,165,116,0.3)" : "#E5E7EB" }}>
              <Calendar size={20} style={{ color: plan.isActive ? "#D4A574" : "#6B7280" }} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className="font-bold text-base lg:text-lg"
                  style={{ color: plan.isActive ? "white" : "#2C3E50" }}>
                  Plan #{planNumber}
                </h3>
                {plan.isActive && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                    style={{ backgroundColor: "#D4A574", color: "#2D5F5D" }}>
                    Current
                  </span>
                )}
              </div>
              <p
                className="text-xs lg:text-sm mt-0.5"
                style={{ color: plan.isActive ? "rgba(255,255,255,0.7)" : "#6B7280" }}>
                {new Date(plan.createdAt).toLocaleDateString("en-US", {
                  weekday: "short",
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Right: stats + toggle */}
          <div className="flex items-center gap-3 lg:gap-6 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-4 lg:gap-6">
              {[
                { label: "meals", value: plan.slots.length },
                { label: "avg cal/day", value: avgCaloriesPerDay },
                { label: "avg protein", value: `${avgProtein}g` },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <p className="font-bold text-sm lg:text-base" style={{ color: plan.isActive ? "#D4A574" : "#2D5F5D" }}>
                    {value}
                  </p>
                  <p className="text-xs" style={{ color: plan.isActive ? "rgba(255,255,255,0.6)" : "#6B7280" }}>
                    {label}
                  </p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 rounded-xl transition-all flex-shrink-0"
              style={{
                backgroundColor: plan.isActive ? "rgba(255,255,255,0.15)" : "#E5E7EB",
                color: plan.isActive ? "white" : "#6B7280",
              }}>
              {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile stats */}
        <div className="flex items-center gap-4 mt-4 sm:hidden">
          {[
            { label: "meals", value: plan.slots.length },
            { label: "avg cal/day", value: avgCaloriesPerDay },
            { label: "avg protein", value: `${avgProtein}g` },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="font-bold text-sm" style={{ color: plan.isActive ? "#D4A574" : "#2D5F5D" }}>
                {value}
              </p>
              <p className="text-xs" style={{ color: plan.isActive ? "rgba(255,255,255,0.6)" : "#6B7280" }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Cuisine tags */}
      <div className="px-5 lg:px-6 pt-4 flex gap-2 flex-wrap">
        {cuisines.map(cuisine => (
          <span
            key={cuisine}
            className="text-xs px-3 py-1 rounded-full font-medium capitalize"
            style={{ backgroundColor: "#F0F7F7", color: "#2D5F5D" }}>
            {cuisineEmojis[cuisine] || "🥗"} {cuisine}
          </span>
        ))}
      </div>

      {/* Expandable meal preview */}
      {expanded && (
        <div className="p-5 lg:p-6">

          {/* Meal type tabs */}
          <div className="flex gap-2 mb-4 border-b pb-3" style={{ borderColor: "#F0F0F0" }}>
            {MEAL_TYPES.map(meal => (
              <button
                key={meal}
                onClick={() => setActiveMeal(meal)}
                className="px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                style={{
                  backgroundColor: activeMeal === meal ? "#2D5F5D" : "transparent",
                  color: activeMeal === meal ? "white" : "#6B7280",
                }}>
                {mealTypeLabel[meal]}
              </button>
            ))}
          </div>

          {/* Week grid — scrollable on mobile */}
          <div className="overflow-x-auto -mx-2 px-2">
            <div className="grid min-w-[560px]" style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
              {DAYS.map((day, i) => {
                const slot = slotsForMeal.find(s => s.dayOfWeek === i)
                return (
                  <div key={day}>
                    <p className="text-xs text-center mb-1.5 font-semibold" style={{ color: "#9CA3AF" }}>
                      {day}
                    </p>
                    {slot ? (
                      <Link href={`/dashboard/recipe/${slot.recipe.id}`}>
                        <div
                          className="p-2 rounded-xl transition-all hover:shadow-md cursor-pointer"
                          style={{ backgroundColor: "#F0F7F7", minHeight: "72px" }}>
                          <p
                            className="leading-tight mb-1.5"
                            style={{
                              color: "#2C3E50",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              fontSize: "11px",
                              fontWeight: 600,
                            }}>
                            {slot.recipe.name}
                          </p>
                          <p style={{ color: "#E67E22", fontSize: "10px" }}>
                            🔥 {slot.recipe.calories}
                          </p>
                        </div>
                      </Link>
                    ) : (
                      <div
                        className="rounded-xl border-2 border-dashed"
                        style={{ borderColor: "#E5E7EB", minHeight: "72px" }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
