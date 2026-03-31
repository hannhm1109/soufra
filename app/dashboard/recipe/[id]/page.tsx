import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Clock, Flame, ChefHat, ArrowLeft, ShoppingBasket } from "lucide-react"
import Link from "next/link"
import FeedbackButtons from "@/components/feedback-buttons"

const cuisineLabel: Record<string, string> = {
  moroccan:       "Moroccan",
  mediterranean:  "Mediterranean",
  healthy:        "Healthy Essentials",
  french:         "French",
  middle_eastern: "Middle Eastern",
  italian:        "Italian",
}

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const recipe = await prisma.recipe.findUnique({ where: { id } })
  if (!recipe) redirect("/dashboard")

  const ingredients  = recipe.ingredients  as string[]
  const instructions = recipe.instructions as string[]

  return (
    <div className="max-w-3xl mx-auto">

      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 mb-6 text-sm font-medium transition-opacity hover:opacity-70"
        style={{ color: "#2D5F5D" }}
      >
        <ArrowLeft size={16} />
        Back to dashboard
      </Link>

      {/* Hero header — always teal, no Unsplash */}
      <div className="rounded-2xl p-8 mb-6" style={{ backgroundColor: "#2D5F5D" }}>
        <span
          className="text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block"
          style={{ backgroundColor: "rgba(212,165,116,0.25)", color: "#D4A574" }}
        >
          {cuisineLabel[recipe.cuisine] ?? recipe.cuisine}
        </span>
        <h1
          className="text-3xl font-bold text-white mb-5 leading-tight"
          style={{ fontFamily: "var(--font-playfair)" }}
        >
          {recipe.name}
        </h1>
        <div className="flex items-center gap-5">
          {[
            { icon: Clock,   label: `${recipe.prepTime + recipe.cookTime} min` },
            { icon: Flame,   label: `${recipe.calories} kcal`                 },
            { icon: ChefHat, label: recipe.difficulty                          },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon size={15} style={{ color: "#D4A574" }} />
              <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.8)" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Macros */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Protein", value: `${recipe.protein}g`, color: "#E67E22", bg: "#FFF7F0" },
          { label: "Carbs",   value: `${recipe.carbs}g`,   color: "#2D5F5D", bg: "#F0F7F7" },
          { label: "Fats",    value: `${recipe.fats}g`,    color: "#27AE60", bg: "#F0FFF4" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="rounded-2xl p-4 text-center" style={{ backgroundColor: bg }}>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-sm" style={{ color: "#6B7280" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Feedback + tags */}
      <div
        className="rounded-2xl p-5 mb-6 flex items-center justify-between gap-4"
        style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
      >
        <FeedbackButtons recipeId={recipe.id} />
        <div className="flex gap-2 flex-wrap justify-end">
          {recipe.tags.map((tag) => (
            <span key={tag} className="text-xs px-3 py-1 rounded-full capitalize"
              style={{ backgroundColor: "#F0F7F7", color: "#2D5F5D" }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Ingredients + Instructions */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-2xl p-6" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: "#2C3E50" }}>
            <ShoppingBasket size={16} style={{ color: "#2D5F5D" }} />
            Ingredients
          </h2>
          <ul className="space-y-2">
            {ingredients.map((ingredient, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: "#D4A574" }} />
                <span className="text-sm" style={{ color: "#2C3E50" }}>{ingredient}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl p-6" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
          <h2 className="text-base font-bold mb-4 flex items-center gap-2" style={{ color: "#2C3E50" }}>
            <ChefHat size={16} style={{ color: "#2D5F5D" }} />
            Instructions
          </h2>
          <ol className="space-y-3">
            {instructions.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: "#2D5F5D", color: "white" }}
                >
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed" style={{ color: "#2C3E50" }}>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
