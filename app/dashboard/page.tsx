import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import Link from "next/link"
import GenerateButton from "@/components/generate-button"
import {
  Flame, Wallet, UtensilsCrossed,
  ShoppingCart, TrendingUp
} from "lucide-react"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      mealPlans: {
        where: { isActive: true },
        include: {
          slots: {
            include: { recipe: true }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      groceryLists: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: { items: true }
      }
    }
  })

  if (!user) redirect("/login")

  // If user hasn't done onboarding yet
  if (!user.fitnessGoal) redirect("/onboarding")

  const activePlan = user.mealPlans[0] || null
  const activeGrocery = user.groceryLists[0] || null
  const firstName = user.name?.split(" ")[0] || "there"

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
  const mealTypes = ["breakfast", "lunch", "dinner"]

  const getMealForSlot = (dayIndex: number, mealType: string) => {
    if (!activePlan) return null
    return activePlan.slots.find(
      (s) => s.dayOfWeek === dayIndex && s.mealType === mealType
    )
  }

  return (
    <div className="max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "#2C3E50" }}>
            Good morning, {firstName} 👋
          </h1>
          <p style={{ color: "#6B7280" }}>
            Here's your nutrition overview for this week
          </p>
        </div>

        {/* Generate button */}
          <GenerateButton />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        {[
          {
            label: "Daily Calories",
            value: user.calorieTarget ? `${user.calorieTarget} kcal` : "Not set",
            icon: Flame,
            color: "#E67E22",
            bg: "#FFF7F0",
          },
          {
            label: "Weekly Budget",
            value: user.weeklyBudget ? `${user.weeklyBudget} DH` : "Not set",
            icon: Wallet,
            color: "#27AE60",
            bg: "#F0FFF4",
          },
          {
            label: "Meals Planned",
            value: activePlan ? `${activePlan.slots.length} meals` : "No plan yet",
            icon: UtensilsCrossed,
            color: "#2D5F5D",
            bg: "#F0F7F7",
          },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div
            key={label}
            className="p-6 rounded-2xl flex items-center gap-4"
            style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: bg }}>
              <Icon size={24} style={{ color }} />
            </div>
            <div>
              <p className="text-sm" style={{ color: "#6B7280" }}>{label}</p>
              <p className="text-xl font-bold" style={{ color: "#2C3E50" }}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Meal Plan Grid */}
      <div
        className="rounded-2xl p-6 mb-8"
        style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: "#2C3E50" }}>
            This Week's Meal Plan
          </h2>
          {!activePlan && (
            <span className="text-sm px-3 py-1 rounded-full"
              style={{ backgroundColor: "#FFF7F0", color: "#E67E22" }}>
              No plan generated yet
            </span>
          )}
        </div>

        {activePlan ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="text-left pb-4 w-24">
                    <span className="text-sm font-medium" style={{ color: "#6B7280" }}>Meal</span>
                  </th>
                  {days.map((day) => (
                    <th key={day} className="pb-4 text-center">
                      <span className="text-sm font-medium" style={{ color: "#2C3E50" }}>
                        {day.slice(0, 3)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mealTypes.map((mealType) => (
                  <tr key={mealType}>
                    <td className="py-2 pr-4">
                      <span className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: "#6B7280" }}>
                        {mealType === "breakfast" ? "🌅" : mealType === "lunch" ? "☀️" : "🌙"}{" "}
                        {mealType}
                      </span>
                    </td>
                    {days.map((_, dayIndex) => {
                      const slot = getMealForSlot(dayIndex, mealType)
                      return (
                        <td key={dayIndex} className="py-2 px-1">
                          {slot ? (
                            <Link href={`/dashboard/recipe/${slot.recipe.id}`}>
                              <div
                                className="p-2 rounded-xl text-center cursor-pointer transition-all hover:shadow-md hover:scale-105"
                                style={{ backgroundColor: "#F0F7F7" }}>
                                <p className="text-xs font-medium leading-tight"
                                  style={{ color: "#2D5F5D" }}>
                                  {slot.recipe.name}
                                </p>
                                <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
                                  {slot.recipe.calories} cal
                                </p>
                              </div>
                            </Link>
                          ) : (
                            <div
                              className="p-2 rounded-xl text-center border-2 border-dashed"
                              style={{ borderColor: "#E5E7EB" }}>
                              <p className="text-xs" style={{ color: "#D1D5DB" }}>Empty</p>
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Empty state */
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: "#F0F7F7" }}>
              <UtensilsCrossed size={40} style={{ color: "#2D5F5D" }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: "#2C3E50" }}>
              No meal plan yet
            </h3>
            <p className="mb-6" style={{ color: "#6B7280" }}>
              Click "Generate New Plan" to create your personalized weekly meal plan
            </p>
            <GenerateButton />
          </div>
        )}
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-2 gap-6">

        {/* Grocery Preview */}
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart size={20} style={{ color: "#2D5F5D" }} />
            <h3 className="font-bold" style={{ color: "#2C3E50" }}>Grocery List</h3>
          </div>

          {activeGrocery ? (
            <>
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: "#6B7280" }}>Budget used</span>
                  <span style={{ color: "#2C3E50", fontWeight: 600 }}>
                    {activeGrocery.totalCost} / {user.weeklyBudget} DH
                  </span>
                </div>
                <div className="h-2 rounded-full" style={{ backgroundColor: "#E5E7EB" }}>
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min(((activeGrocery.totalCost || 0) / (user.weeklyBudget || 1)) * 100, 100)}%`,
                      backgroundColor: "#27AE60"
                    }}
                  />
                </div>
              </div>
              <p className="text-sm" style={{ color: "#6B7280" }}>
                {activeGrocery.items.length} items
              </p>
            </>
          ) : (
            <div className="text-center py-8">
              <ShoppingCart size={32} className="mx-auto mb-2" style={{ color: "#D1D5DB" }} />
              <p className="text-sm" style={{ color: "#6B7280" }}>
                Generate a meal plan first
              </p>
            </div>
          )}
        </div>

        {/* Progress/Tips */}
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: "#2D5F5D" }}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={20} color="#D4A574" />
            <h3 className="font-bold text-white">Your Goal</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                Target
              </span>
              <span className="font-semibold text-white">
                {user.fitnessGoal?.replace("_", " ").toUpperCase()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                Calories/day
              </span>
              <span className="font-semibold" style={{ color: "#D4A574" }}>
                {user.calorieTarget} kcal
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                Cuisines
              </span>
              <span className="font-semibold text-white">
                {user.cuisines.join(", ")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}