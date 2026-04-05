import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Clock, Flame, ChefHat, Users, Sparkles } from "lucide-react"
import BackButton from "@/components/back-button"
import FeedbackButtons from "@/components/feedback-buttons"
import IngredientsChecklist from "@/components/ingredients-checklist"
import InstructionsSteps from "@/components/instructions-steps"

interface LearnedPrefs {
  preferredDifficulty?: string
  prefersQuick?: boolean
}

function buildFallbackReason(
  recipe: { cuisine: string; difficulty: string; calories: number; protein: number; prepTime: number; cookTime: number },
  user: { cuisines: string[]; fitnessGoal: string | null; calorieTarget: number | null; learnedPrefs: unknown },
  mealType: string | null
): string {
  const prefs = (user.learnedPrefs ?? null) as LearnedPrefs | null
  const reasons: string[] = []

  if (user.cuisines.includes(recipe.cuisine))
    reasons.push(`aligns with your ${recipe.cuisine} cuisine preference`)

  if (user.calorieTarget && mealType) {
    const splits: Record<string, number> = { breakfast: 0.25, lunch: 0.4, dinner: 0.35 }
    const targetCal = Math.round(user.calorieTarget * (splits[mealType] ?? 0.33))
    if (Math.abs(recipe.calories - targetCal) / targetCal < 0.25)
      reasons.push(`fits your ${mealType} calorie target (~${targetCal} kcal)`)
  }

  if (user.fitnessGoal === "gain_muscle" && recipe.protein >= 25)
    reasons.push("high in protein to support muscle gain")
  else if (user.fitnessGoal === "lose_weight" && recipe.calories < 450)
    reasons.push("a lighter option supporting your weight loss goal")
  else if (user.fitnessGoal === "eat_better")
    reasons.push("a wholesome, balanced choice")

  if (prefs?.preferredDifficulty === recipe.difficulty)
    reasons.push(`matches your preferred ${recipe.difficulty} cooking level`)

  if ((prefs?.prefersQuick || mealType === "breakfast") && recipe.prepTime + recipe.cookTime <= 30)
    reasons.push("quick and easy to prepare")

  if (reasons.length === 0)
    return `A personalized ${recipe.cuisine} meal selected to complement your weekly plan.`

  return `Selected because it ${reasons.slice(0, 2).join(" and ")}.`
}

const cuisineLabel: Record<string, string> = {
  moroccan:       "Moroccan",
  mediterranean:  "Mediterranean",
  healthy:        "Healthy Essentials",
  french:         "French",
  middle_eastern: "Middle Eastern",
  italian:        "Italian",
}

const difficultyColor: Record<string, { bg: string; text: string }> = {
  easy:   { bg: "rgba(39,174,96,0.2)",  text: "#27AE60" },
  medium: { bg: "rgba(230,126,34,0.2)", text: "#E67E22" },
  hard:   { bg: "rgba(231,76,60,0.2)",  text: "#E74C3C" },
}

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const [recipe, user] = await Promise.all([
    prisma.recipe.findUnique({ where: { id } }),
    prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        mealPlans: {
          where: { isActive: true },
          include: { slots: { where: { recipeId: id } } },
          take: 1,
        },
      },
    }),
  ])

  if (!recipe) redirect("/dashboard")

  const slot        = user?.mealPlans[0]?.slots[0] ?? null
  const whyChosen   = slot?.whyChosen ?? (user ? buildFallbackReason(recipe, user, slot?.mealType ?? null) : null)

  const ingredients  = recipe.ingredients  as string[]
  const instructions = recipe.instructions as string[]
  const diff         = difficultyColor[recipe.difficulty] ?? difficultyColor.medium

  return (
    <div className="max-w-2xl mx-auto">

      {/* Back */}
      <BackButton />

      {/* Hero */}
      <div className="rounded-2xl p-8 mb-5" style={{ backgroundColor: "#2D5F5D" }}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <span
            className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ backgroundColor: "rgba(212,165,116,0.25)", color: "#D4A574" }}>
            {cuisineLabel[recipe.cuisine] ?? recipe.cuisine}
          </span>
          <span
            className="text-xs font-semibold px-3 py-1 rounded-full capitalize"
            style={{ backgroundColor: diff.bg, color: diff.text }}>
            {recipe.difficulty}
          </span>
        </div>

        <h1
          className="text-3xl font-bold text-white mb-5 leading-tight"
          style={{ fontFamily: "var(--font-playfair)" }}>
          {recipe.name}
        </h1>

        <div className="flex items-center gap-6 flex-wrap">
          {[
            { icon: Clock,  label: `${recipe.prepTime} min prep`           },
            { icon: Flame,  label: `${recipe.calories} kcal`               },
            { icon: ChefHat,label: `${recipe.cookTime} min cook`           },
            { icon: Users,  label: "2 servings"                            },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon size={14} style={{ color: "#D4A574" }} />
              <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Macros */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {[
          { label: "Protein", value: `${recipe.protein}g`, color: "#E67E22", bg: "#FFF7F0" },
          { label: "Carbs",   value: `${recipe.carbs}g`,   color: "#2D5F5D", bg: "#F0F7F7" },
          { label: "Fats",    value: `${recipe.fats}g`,    color: "#D4A574", bg: "#FFFBEB" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="rounded-2xl p-4 text-center" style={{ backgroundColor: bg }}>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-sm" style={{ color: "#6B7280" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Why Soufra chose this */}
      {whyChosen && (
        <div
          className="rounded-2xl p-5 mb-5"
          style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A" }}>
          <div className="flex items-center gap-2.5 mb-2.5">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "#D4A574" }}>
              <Sparkles size={14} color="white" />
            </div>
            <h3 className="font-bold text-sm" style={{ color: "#92400E" }}>
              Why Soufra chose this meal
            </h3>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "#78350F" }}>
            {whyChosen}
          </p>
        </div>
      )}

      {/* Feedback + tags */}
      <div
        className="rounded-2xl p-5 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <FeedbackButtons recipeId={recipe.id} />
        <div className="flex gap-2 flex-wrap">
          {recipe.tags.map((tag) => (
            <span key={tag} className="text-xs px-3 py-1 rounded-full capitalize"
              style={{ backgroundColor: "#F0F7F7", color: "#2D5F5D" }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Ingredients — interactive checklist */}
      <div className="mb-5">
        <IngredientsChecklist ingredients={ingredients} />
      </div>

      {/* Instructions — interactive steps + cook mode */}
      <InstructionsSteps instructions={instructions} recipeId={recipe.id} />
    </div>
  )
}
