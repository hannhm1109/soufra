import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Sparkles } from "lucide-react"
import Link from "next/link"
import HistoryPlanCard from "@/components/history-plan-card"
import NutritionTrendChart from "@/components/nutrition-trend-chart"

export default async function HistoryPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) redirect("/login")

  const mealPlans = await prisma.mealPlan.findMany({
    where: { userId: user.id },
    include: {
      slots: {
        include: { recipe: true }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold mb-1" style={{ color: "#2C3E50" }}>
          Meal Plan History
        </h1>
        <p className="text-sm lg:text-base" style={{ color: "#6B7280" }}>
          {mealPlans.length > 0
            ? `${mealPlans.length} plan${mealPlans.length > 1 ? "s" : ""} generated — see how your plans evolved over time`
            : "Your generated meal plans will appear here"}
        </p>
      </div>

      {mealPlans.length > 0 ? (
        <div className="space-y-6">
          <NutritionTrendChart
            plans={[...mealPlans].reverse().map((plan, index) => {
              const slots = plan.slots
              const avgDailyCalories = Math.round(slots.reduce((s, sl) => s + sl.recipe.calories, 0) / 7)
              const n = slots.length || 1
              return {
                planNumber: index + 1,
                isActive: plan.isActive,
                avgDailyCalories,
                avgProtein: Math.round(slots.reduce((s, sl) => s + sl.recipe.protein, 0) / n),
                avgCarbs:   Math.round(slots.reduce((s, sl) => s + sl.recipe.carbs,   0) / n),
                avgFats:    Math.round(slots.reduce((s, sl) => s + sl.recipe.fats,    0) / n),
                createdAt:  plan.createdAt.toISOString(),
              }
            })}
          />

          {mealPlans.map((plan, index) => (
            <HistoryPlanCard
              key={plan.id}
              plan={plan}
              planNumber={mealPlans.length - index}
            />
          ))}
        </div>
      ) : (
        <div
          className="rounded-2xl p-12 lg:p-16 text-center"
          style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: "#F0F7F7" }}>
            <Sparkles size={32} style={{ color: "#2D5F5D" }} />
          </div>
          <h3 className="text-xl font-bold mb-2" style={{ color: "#2C3E50" }}>
            No meal plans yet
          </h3>
          <p className="mb-6 text-sm" style={{ color: "#6B7280" }}>
            Generate your first meal plan to start building your history
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
            style={{ backgroundColor: "#E67E22" }}>
            <Sparkles size={18} />
            Generate first plan
          </Link>
        </div>
      )}
    </div>
  )
}
