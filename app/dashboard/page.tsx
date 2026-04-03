import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import GenerateButton from "@/components/generate-button"
import MealCard from "@/components/meal-card"
import Link from "next/link"
import {
  Flame, Wallet, UtensilsCrossed,
  ShoppingCart, TrendingUp, ChevronRight,
  Sunrise, Sun, Moon, Zap, BarChart2
} from "lucide-react"

export const dynamic = "force-dynamic"

const cuisineLabel: Record<string, string> = {
  moroccan:       "🇲🇦 Moroccan",
  mediterranean:  "🫒 Mediterranean",
  healthy:        "🥗 Healthy",
  french:         "🇫🇷 French",
  middle_eastern: "🧆 Middle Eastern",
  italian:        "🇮🇹 Italian",
}

const goalLabel: Record<string, string> = {
  lose_weight: "Lose Weight",
  gain_muscle: "Gain Muscle",
  maintain:    "Stay Healthy",
  eat_better:  "Eat Better",
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return "Good morning"
  if (h < 17) return "Good afternoon"
  return "Good evening"
}

function getWeekRange() {
  const today = new Date()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7))
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) => d.toLocaleDateString("en", { month: "short", day: "numeric" })
  return `${fmt(monday)} – ${fmt(sunday)}`
}

function getTodayIndex() {
  // 0 = Monday … 6 = Sunday
  return (new Date().getDay() + 6) % 7
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const [user, ratingCount] = await Promise.all([
    prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        mealPlans: {
          where: { isActive: true },
          include: { slots: { include: { recipe: true } } },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        groceryLists: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { items: { take: 5, orderBy: { createdAt: "asc" } } },
        },
      },
    }),
    prisma.recipeFeedback.count({ where: { user: { email: session.user.email } } }),
  ])

  if (!user) redirect("/login")
  if (!user.fitnessGoal) redirect("/onboarding")

  const activePlan    = user.mealPlans[0]    ?? null
  const activeGrocery = user.groceryLists[0] ?? null
  const firstName     = user.name?.split(" ")[0] ?? "there"
  const todayIndex    = getTodayIndex()
  const weekRange     = getWeekRange()
  const greeting      = getGreeting()

  const days      = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const mealTypes = ["breakfast", "lunch", "dinner"]
  const mealEmoji = { breakfast: "🌅", lunch: "☀️", dinner: "🌙" }

  const getMeal = (dayIndex: number, mealType: string) =>
    activePlan?.slots.find(s => s.dayOfWeek === dayIndex && s.mealType === mealType) ?? null

  const todayMeals = {
    breakfast: getMeal(todayIndex, "breakfast"),
    lunch:     getMeal(todayIndex, "lunch"),
    dinner:    getMeal(todayIndex, "dinner"),
  }
  const todayCalories = Object.values(todayMeals).reduce(
    (sum, slot) => sum + (slot?.recipe.calories ?? 0), 0
  )
  const caloriePct = user.calorieTarget
    ? Math.min((todayCalories / user.calorieTarget) * 100, 100)
    : 0
  // SVG ring math
  const R = 28
  const CIRC = 2 * Math.PI * R
  const todayLabel = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })

  // Nutrition averages
  const allSlots   = activePlan?.slots ?? []
  const avgProtein = Math.round(allSlots.reduce((s, sl) => s + sl.recipe.protein, 0) / 7)
  const avgCarbs   = Math.round(allSlots.reduce((s, sl) => s + sl.recipe.carbs,   0) / 7)
  const avgFats    = Math.round(allSlots.reduce((s, sl) => s + sl.recipe.fats,    0) / 7)
  const macroTotal = avgProtein + avgCarbs + avgFats || 1

  const budgetPct = activeGrocery && user.weeklyBudget
    ? Math.min(((activeGrocery.totalCost ?? 0) / user.weeklyBudget) * 100, 100)
    : 0

  return (
    <div className="max-w-7xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="fade-in-up flex flex-wrap items-start justify-between gap-4 mb-8" style={{ animationDelay: "0ms" }}>
        <div>
          <h1 className="text-3xl font-bold mb-1" style={{ color: "#2C3E50" }}>
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>
            Week of {weekRange}
          </p>
        </div>
        <GenerateButton ratingCount={ratingCount} />
      </div>

      {/* ── Stat cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 mb-8">
        {[
          {
            label: "Daily Calories",
            value: user.calorieTarget ? `${user.calorieTarget} kcal` : "—",
            sub: "Your daily target",
            icon: Flame,
            color: "#E67E22",
            bg: "#FFF7F0",
            delay: "60ms",
          },
          {
            label: "Weekly Budget",
            value: user.weeklyBudget ? `${user.weeklyBudget} DH` : "—",
            sub: activeGrocery ? `${activeGrocery.totalCost ?? 0} DH spent` : "No list yet",
            icon: Wallet,
            color: "#27AE60",
            bg: "#F0FFF4",
            delay: "120ms",
          },
          {
            label: "Meals Planned",
            value: activePlan ? `${activePlan.slots.length}` : "0",
            sub: activePlan ? "meals this week" : "Generate a plan",
            icon: UtensilsCrossed,
            color: "#2D5F5D",
            bg: "#F0F7F7",
            delay: "180ms",
          },
        ].map(({ label, value, sub, icon: Icon, color, bg, delay }) => (
          <div
            key={label}
            className="fade-in-up p-4 sm:p-5 rounded-2xl flex items-center gap-3 sm:gap-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default"
            style={{
              backgroundColor: "white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
              animationDelay: delay,
            }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: bg }}>
              <Icon size={22} style={{ color }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium mb-0.5" style={{ color: "#9CA3AF" }}>{label}</p>
              <p className="text-2xl font-bold leading-none" style={{ color: "#2C3E50" }}>{value}</p>
              <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Today's Focus ──────────────────────────────────────── */}
      <div
        className="fade-in-up rounded-2xl p-6 mb-6"
        style={{
          backgroundColor: "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          animationDelay: "200ms",
        }}
      >
        {/* Row: title + date on left, calorie ring on right */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <Zap size={16} style={{ color: "#D4A574" }} />
              <h2 className="text-xl font-bold" style={{ color: "#2C3E50" }}>Today&apos;s Focus</h2>
            </div>
            <p className="text-sm" style={{ color: "#9CA3AF" }}>{todayLabel}</p>
          </div>

          {/* Calorie ring */}
          {user.calorieTarget && activePlan && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs" style={{ color: "#9CA3AF" }}>Today&apos;s calories</p>
                <p className="font-bold text-lg leading-tight" style={{ color: "#2C3E50" }}>
                  {todayCalories}
                  <span className="text-xs font-normal ml-1" style={{ color: "#9CA3AF" }}>
                    / {user.calorieTarget} kcal
                  </span>
                </p>
              </div>
              <svg width="68" height="68" viewBox="0 0 68 68" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="34" cy="34" r={R} fill="none" stroke="#F3F4F6" strokeWidth="6" />
                <circle
                  cx="34" cy="34" r={R} fill="none"
                  stroke={caloriePct >= 100 ? "#E74C3C" : caloriePct >= 80 ? "#E67E22" : "#2D5F5D"}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={CIRC - (CIRC * caloriePct) / 100}
                  style={{ transition: "stroke-dashoffset 0.6s ease" }}
                />
              </svg>
            </div>
          )}
        </div>

        {/* 3 meal columns */}
        {activePlan ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {(
              [
                { key: "breakfast", label: "Breakfast", Icon: Sunrise, color: "#F59E0B", bg: "#FFFBEB" },
                { key: "lunch",     label: "Lunch",     Icon: Sun,     color: "#E67E22", bg: "#FFF7F0" },
                { key: "dinner",    label: "Dinner",    Icon: Moon,    color: "#6366F1", bg: "#F5F3FF" },
              ] as const
            ).map(({ key, label, Icon, color, bg }) => {
              const slot = todayMeals[key]
              return slot ? (
                <Link key={key} href={`/dashboard/recipe/${slot.recipe.id}`}>
                  <div
                    className="rounded-xl p-4 cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                    style={{ backgroundColor: bg }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={14} style={{ color }} />
                      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>
                        {label}
                      </span>
                    </div>
                    <p className="font-bold text-sm leading-snug mb-2" style={{ color: "#2C3E50" }}>
                      {slot.recipe.name}
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: "rgba(0,0,0,0.06)", color: "#6B7280" }}
                      >
                        <Flame size={10} style={{ color: "#E67E22" }} />
                        {slot.recipe.calories} kcal
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ backgroundColor: "rgba(0,0,0,0.06)", color: "#6B7280" }}
                      >
                        P {slot.recipe.protein}g
                      </span>
                    </div>
                  </div>
                </Link>
              ) : (
                <div
                  key={key}
                  className="rounded-xl p-4 border-2 border-dashed flex flex-col items-center justify-center gap-1"
                  style={{ borderColor: "#E5E7EB", minHeight: "100px" }}
                >
                  <Icon size={18} style={{ color: "#D1D5DB" }} />
                  <span className="text-xs" style={{ color: "#9CA3AF" }}>No {label.toLowerCase()}</span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="rounded-xl border-2 border-dashed flex items-center justify-center gap-2 py-8"
            style={{ borderColor: "#E5E7EB" }}>
            <UtensilsCrossed size={18} style={{ color: "#D1D5DB" }} />
            <span className="text-sm" style={{ color: "#9CA3AF" }}>Generate a plan to see today&apos;s meals</span>
          </div>
        )}
      </div>

      {/* ── Meal plan grid ─────────────────────────────────────── */}
      <div
        className="fade-in-up rounded-2xl p-6 mb-6"
        style={{
          backgroundColor: "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          animationDelay: "240ms",
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold" style={{ color: "#2C3E50" }}>
              This Week&apos;s Meal Plan
            </h2>
            {activePlan && (
              <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{weekRange}</p>
            )}
          </div>
          {activePlan && (
            <Link
              href="/history"
              className="text-xs font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
              style={{ color: "#2D5F5D" }}
            >
              View history <ChevronRight size={14} />
            </Link>
          )}
        </div>

        {activePlan ? (
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-x-1">
              <thead>
                <tr>
                  <th className="w-20 pb-3" />
                  {days.map((day, i) => (
                    <th key={day} className="pb-3 text-center">
                      <div
                        className="inline-flex flex-col items-center px-2.5 py-1 rounded-lg transition-colors"
                        style={{
                          backgroundColor: i === todayIndex ? "#2D5F5D" : "transparent",
                        }}
                      >
                        <span
                          className="text-xs font-semibold"
                          style={{ color: i === todayIndex ? "white" : "#2C3E50" }}
                        >
                          {day}
                        </span>
                        {i === todayIndex && (
                          <span className="text-[9px] font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
                            Today
                          </span>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mealTypes.map((mealType) => (
                  <tr key={mealType}>
                    <td className="py-1.5 pr-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wide flex items-center gap-1"
                        style={{ color: "#9CA3AF" }}>
                        {mealEmoji[mealType as keyof typeof mealEmoji]} {mealType}
                      </span>
                    </td>
                    {days.map((_, dayIndex) => {
                      const slot = getMeal(dayIndex, mealType)
                      return (
                        <td key={dayIndex} className="py-1.5 px-0.5">
                          {slot ? (
                            <MealCard recipe={slot.recipe} slotId={slot.id} />
                          ) : (
                            <div
                              className="rounded-xl border-2 border-dashed"
                              style={{ borderColor: "#F3F4F6", minHeight: "80px" }}
                            />
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
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: "#F0F7F7" }}>
              <UtensilsCrossed size={40} style={{ color: "#2D5F5D" }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: "#2C3E50" }}>
              No meal plan yet
            </h3>
            <p className="mb-6 max-w-xs mx-auto text-sm" style={{ color: "#6B7280" }}>
              Hit &ldquo;Generate New Plan&rdquo; above and your personalized week will appear here
            </p>
          </div>
        )}
      </div>

      {/* ── Bottom row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

        {/* Grocery preview */}
        <div
          className="fade-in-up rounded-2xl p-6 transition-all duration-200 hover:shadow-md"
          style={{
            backgroundColor: "white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            animationDelay: "300ms",
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart size={18} style={{ color: "#2D5F5D" }} />
              <h3 className="font-bold" style={{ color: "#2C3E50" }}>Grocery List</h3>
            </div>
            {activeGrocery && (
              <Link
                href="/grocery"
                className="text-xs font-medium flex items-center gap-1 transition-opacity hover:opacity-70"
                style={{ color: "#2D5F5D" }}
              >
                See all <ChevronRight size={13} />
              </Link>
            )}
          </div>

          {activeGrocery ? (
            <>
              {/* Budget bar */}
              <div className="mb-4">
                <div className="flex justify-between text-xs mb-1.5">
                  <span style={{ color: "#9CA3AF" }}>Budget used</span>
                  <span className="font-semibold" style={{ color: "#2C3E50" }}>
                    {activeGrocery.totalCost ?? 0} / {user.weeklyBudget} DH
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#F3F4F6" }}>
                  <div
                    className="h-2 rounded-full transition-all duration-700"
                    style={{
                      width: `${budgetPct}%`,
                      backgroundColor: budgetPct > 90 ? "#E74C3C" : "#27AE60",
                    }}
                  />
                </div>
              </div>

              {/* Item preview */}
              <ul className="space-y-2">
                {activeGrocery.items.slice(0, 4).map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <span style={{ color: "#2C3E50" }}>{item.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
                      {item.quantity}
                    </span>
                  </li>
                ))}
                {activeGrocery.items.length > 4 && (
                  <li className="text-xs" style={{ color: "#9CA3AF" }}>
                    +{activeGrocery.items.length - 4} more items
                  </li>
                )}
              </ul>
            </>
          ) : (
            <div className="text-center py-8">
              <ShoppingCart size={32} className="mx-auto mb-2" style={{ color: "#E5E7EB" }} />
              <p className="text-sm" style={{ color: "#9CA3AF" }}>Generate a meal plan first</p>
            </div>
          )}
        </div>

        {/* Nutrition Summary */}
        <div
          className="fade-in-up rounded-2xl p-6"
          style={{
            backgroundColor: "white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            animationDelay: "330ms",
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <BarChart2 size={18} style={{ color: "#2D5F5D" }} />
            <h3 className="font-bold" style={{ color: "#2C3E50" }}>Nutrition / Day</h3>
          </div>

          {activePlan ? (
            <>
              {/* Macro stat boxes */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "Protein", value: avgProtein, unit: "g", color: "#E67E22", bg: "#FFF7F0" },
                  { label: "Carbs",   value: avgCarbs,   unit: "g", color: "#2D5F5D", bg: "#F0F7F7" },
                  { label: "Fat",     value: avgFats,    unit: "g", color: "#D4A574", bg: "#FFFBEB" },
                ].map(({ label, value, unit, color, bg }) => (
                  <div key={label} className="rounded-xl p-2.5 text-center" style={{ backgroundColor: bg }}>
                    <p className="text-base font-bold leading-none" style={{ color }}>
                      {value}<span className="text-xs font-normal">{unit}</span>
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>{label}</p>
                  </div>
                ))}
              </div>

              {/* Stacked macro bar */}
              <div className="h-3 rounded-full overflow-hidden flex" style={{ backgroundColor: "#F3F4F6" }}>
                <div className="h-3 transition-all duration-700" style={{ width: `${(avgProtein / macroTotal) * 100}%`, backgroundColor: "#E67E22" }} />
                <div className="h-3 transition-all duration-700" style={{ width: `${(avgCarbs   / macroTotal) * 100}%`, backgroundColor: "#2D5F5D" }} />
                <div className="h-3 transition-all duration-700" style={{ width: `${(avgFats    / macroTotal) * 100}%`, backgroundColor: "#D4A574" }} />
              </div>
              <div className="flex justify-between text-xs mt-2">
                <span style={{ color: "#E67E22" }}>P {Math.round((avgProtein / macroTotal) * 100)}%</span>
                <span style={{ color: "#2D5F5D" }}>C {Math.round((avgCarbs   / macroTotal) * 100)}%</span>
                <span style={{ color: "#D4A574" }}>F {Math.round((avgFats    / macroTotal) * 100)}%</span>
              </div>

              {/* Calorie avg */}
              <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: "1px solid #F3F4F6" }}>
                <span className="text-xs" style={{ color: "#9CA3AF" }}>Avg calories / day</span>
                <span className="font-bold text-sm" style={{ color: "#2C3E50" }}>
                  {Math.round(allSlots.reduce((s, sl) => s + sl.recipe.calories, 0) / 7)} kcal
                </span>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <BarChart2 size={32} className="mx-auto mb-2" style={{ color: "#E5E7EB" }} />
              <p className="text-sm" style={{ color: "#9CA3AF" }}>No plan yet</p>
            </div>
          )}
        </div>

        {/* Your goal */}
        <div
          className="fade-in-up rounded-2xl p-6"
          style={{
            backgroundColor: "#2D5F5D",
            boxShadow: "0 2px 8px rgba(45,95,93,0.25)",
            animationDelay: "360ms",
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={18} color="#D4A574" />
            <h3 className="font-bold text-white">Your Profile</h3>
          </div>

          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Goal</span>
              <span className="text-sm font-semibold text-white">
                {goalLabel[user.fitnessGoal ?? ""] ?? user.fitnessGoal}
              </span>
            </div>
            <div className="h-px" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>Calories / day</span>
              <span className="text-sm font-semibold" style={{ color: "#D4A574" }}>
                {user.calorieTarget} kcal
              </span>
            </div>
            <div className="h-px" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm flex-shrink-0" style={{ color: "rgba(255,255,255,0.6)" }}>Cuisines</span>
              <div className="flex flex-wrap gap-1.5 justify-end">
                {user.cuisines.map((c) => (
                  <span
                    key={c}
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "white" }}
                  >
                    {cuisineLabel[c] ?? c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
