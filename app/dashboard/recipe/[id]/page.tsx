import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Clock, Flame, ChefHat, ArrowLeft, Users } from "lucide-react"
import Link from "next/link"
import FeedbackButtons from "@/components/feedback-buttons"
import IngredientsChecklist from "@/components/ingredients-checklist"
import InstructionsSteps from "@/components/instructions-steps"

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

  const recipe = await prisma.recipe.findUnique({ where: { id } })
  if (!recipe) redirect("/dashboard")

  const ingredients  = recipe.ingredients  as string[]
  const instructions = recipe.instructions as string[]
  const diff         = difficultyColor[recipe.difficulty] ?? difficultyColor.medium

  return (
    <div className="max-w-2xl mx-auto">

      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 mb-6 text-sm font-medium transition-opacity hover:opacity-70"
        style={{ color: "#2D5F5D" }}>
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>

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
