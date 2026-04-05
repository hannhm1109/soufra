"use client"
import { useState } from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface PlanSummary {
  planNumber: number
  isActive: boolean
  avgDailyCalories: number
  avgProtein: number
  avgCarbs: number
  avgFats: number
  createdAt: string
}

type Metric = "calories" | "protein" | "carbs" | "fats"

const METRIC_CONFIG: Record<Metric, { label: string; unit: string; color: string; bg: string }> = {
  calories: { label: "Avg daily calories", unit: "kcal", color: "#E67E22", bg: "#FFF7F0" },
  protein:  { label: "Avg protein/day",    unit: "g",    color: "#2D5F5D", bg: "#F0F7F7" },
  carbs:    { label: "Avg carbs/day",      unit: "g",    color: "#3498DB", bg: "#EFF6FF" },
  fats:     { label: "Avg fats/day",       unit: "g",    color: "#D4A574", bg: "#FFFBEB" },
}

export default function NutritionTrendChart({ plans }: { plans: PlanSummary[] }) {
  const [metric, setMetric] = useState<Metric>("calories")
  if (plans.length < 2) return null

  const cfg = METRIC_CONFIG[metric]
  const values = plans.map(p => p[metric === "calories" ? "avgDailyCalories" : metric === "protein" ? "avgProtein" : metric === "carbs" ? "avgCarbs" : "avgFats"])
  const max = Math.max(...values)
  const min = Math.min(...values)

  const first = values[0]
  const last  = values[values.length - 1]
  const delta = last - first
  const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus
  const trendColor = metric === "calories"
    ? (delta < 0 ? "#27AE60" : delta > 0 ? "#E74C3C" : "#6B7280")
    : (delta > 0 ? "#27AE60" : delta < 0 ? "#E74C3C" : "#6B7280")

  return (
    <div
      className="rounded-2xl p-5 sm:p-6 mb-6"
      style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-bold" style={{ color: "#2C3E50" }}>Nutrition Trends</h2>
          <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
            How your plans evolved over {plans.length} generations
          </p>
        </div>

        {/* Trend badge */}
        <div
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ backgroundColor: `${trendColor}18`, color: trendColor }}
        >
          <TrendIcon size={13} />
          {Math.abs(delta).toFixed(metric === "calories" ? 0 : 1)}{cfg.unit} vs first plan
        </div>
      </div>

      {/* Metric selector */}
      <div className="flex gap-2 flex-wrap mb-5">
        {(Object.keys(METRIC_CONFIG) as Metric[]).map(m => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{
              backgroundColor: metric === m ? METRIC_CONFIG[m].color : METRIC_CONFIG[m].bg,
              color: metric === m ? "white" : METRIC_CONFIG[m].color,
            }}
          >
            {METRIC_CONFIG[m].label}
          </button>
        ))}
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-2 sm:gap-3 h-32">
        {plans.map((plan, i) => {
          const value = values[i]
          const heightPct = max === min ? 70 : ((value - min) / (max - min)) * 60 + 30
          return (
            <div key={plan.planNumber} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
              {/* Value label */}
              <span className="text-[10px] font-bold" style={{ color: cfg.color }}>
                {value.toFixed(metric === "calories" ? 0 : 1)}{cfg.unit}
              </span>
              {/* Bar */}
              <div
                className="w-full rounded-t-lg transition-all duration-500"
                style={{
                  height: `${heightPct}%`,
                  backgroundColor: plan.isActive ? cfg.color : `${cfg.color}50`,
                  minHeight: "8px",
                }}
              />
              {/* Plan label */}
              <span className="text-[10px] font-medium truncate w-full text-center" style={{ color: plan.isActive ? cfg.color : "#9CA3AF" }}>
                {plan.isActive ? "Current" : `#${plan.planNumber}`}
              </span>
            </div>
          )
        })}
      </div>

      {/* Footer insight */}
      <p className="text-xs mt-4 pt-4" style={{ color: "#9CA3AF", borderTop: "1px solid #F3F4F6" }}>
        {metric === "calories" && delta < -50 && "Your calorie intake is trending down — great for weight loss goals."}
        {metric === "calories" && delta > 50 && "Your calorie intake is increasing — good if you're building muscle."}
        {metric === "protein" && delta > 5 && "Nice progress — your protein intake is improving across plans."}
        {metric === "protein" && delta <= 5 && "Keep rating meals to help the AI optimize your protein targets."}
        {metric === "carbs" && "Carb distribution reflects your cuisine preferences and fitness goal."}
        {metric === "fats" && "Healthy fats are key to Mediterranean and Moroccan cuisine balance."}
        {metric === "calories" && Math.abs(delta) <= 50 && "Your calorie targets are staying consistent across plans."}
      </p>
    </div>
  )
}
