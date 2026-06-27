"use client"
import { useState } from "react"
import { Sunrise, Sun, Moon } from "lucide-react"
import MealCard from "@/components/meal-card"

interface MealSlot {
  id: string
  dayOfWeek: number
  mealType: string
  hasLeftovers: boolean
  usesLeftovers: boolean
  recipe: {
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
}

const MEAL_TYPES = [
  { key: "breakfast", label: "Breakfast", Icon: Sunrise, color: "#F59E0B", bg: "#FFFBEB" },
  { key: "lunch",     label: "Lunch",     Icon: Sun,     color: "#E67E22", bg: "#FFF7F0" },
  { key: "dinner",    label: "Dinner",    Icon: Moon,    color: "#6366F1", bg: "#F5F3FF" },
]

export default function MobileMealPlanView({
  slots,
  todayIndex,
  days,
  isRamadan = false,
}: {
  slots: MealSlot[]
  todayIndex: number
  days: string[]
  isRamadan?: boolean
}) {
  const [selected, setSelected] = useState(todayIndex)

  const getMeal = (mealType: string) =>
    slots.find(s => s.dayOfWeek === selected && s.mealType === mealType) ?? null

  return (
    <div>
      {/* Day selector — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {days.map((day, i) => {
          const isToday   = i === todayIndex
          const isSelected = i === selected
          return (
            <button
              key={day}
              onClick={() => setSelected(i)}
              className="flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-xl transition-all duration-200"
              style={{
                backgroundColor: isSelected ? "#2D5F5D" : isToday ? "#F0F7F7" : "transparent",
                minWidth: "48px",
              }}
            >
              <span
                className="text-xs font-bold"
                style={{ color: isSelected ? "white" : isToday ? "#2D5F5D" : "#9CA3AF" }}
              >
                {day}
              </span>
              {isToday && (
                <span
                  className="text-[9px] font-semibold mt-0.5"
                  style={{ color: isSelected ? "rgba(255,255,255,0.7)" : "#2D5F5D" }}
                >
                  Today
                </span>
              )}
              {!isToday && isSelected && (
                <div className="w-1 h-1 rounded-full mt-1" style={{ backgroundColor: "#D4A574" }} />
              )}
            </button>
          )
        })}
      </div>

      {/* 3 meal cards for selected day */}
      <div className="space-y-3">
        {MEAL_TYPES.map(({ key, label, Icon, color, bg }) => {
          const slot = getMeal(key)
          const displayLabel =
            isRamadan && key === "breakfast" ? "Suhoor" :
            isRamadan && key === "lunch" ? "Iftar" :
            isRamadan && key === "dinner" ? "Post-Iftar" :
            label
          return (
            <div key={key}>
              {/* Meal type label */}
              <div className="flex items-center gap-1.5 mb-1.5 px-1">
                <Icon size={12} style={{ color }} />
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
                  {displayLabel}
                </span>
              </div>

              {slot ? (
                <MealCard
                  recipe={slot.recipe}
                  slotId={slot.id}
                  mealType={slot.mealType}
                  hasLeftovers={slot.hasLeftovers}
                  usesLeftovers={slot.usesLeftovers}
                />
              ) : (
                <div
                  className="rounded-xl border-2 border-dashed flex items-center justify-center py-4"
                  style={{ borderColor: "#E5E7EB", backgroundColor: bg }}
                >
                  <span className="text-xs" style={{ color: "#D1D5DB" }}>No {displayLabel.toLowerCase()} planned</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
