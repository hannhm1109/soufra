import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Clock, Flame, ChefHat, ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import FeedbackButtons from "@/components/feedback-buttons"

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const recipe = await prisma.recipe.findUnique({
    where: { id }
  })

  if (!recipe) redirect("/dashboard")

  const ingredients = recipe.ingredients as string[]
  const instructions = recipe.instructions as string[]

  return (
    <div className="max-w-3xl mx-auto">

      {/* Back button */}
      <Link
        href="/dashboard"
        className="flex items-center gap-2 mb-6 text-sm font-medium transition-all hover:gap-3"
        style={{ color: "#2D5F5D" }}>
        <ArrowLeft size={18} />
        Back to dashboard
      </Link>

      {/* Header */}
      {recipe.imageUrl ? (
        <div className="relative rounded-2xl overflow-hidden mb-6 h-72">
          <Image
            src={recipe.imageUrl}
            alt={recipe.name}
            fill
            className="object-cover"
          />
          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(45,95,93,0.97) 0%, rgba(45,95,93,0.6) 50%, transparent 100%)" }}
          />
          {/* Text pinned to bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <span
              className="text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full mb-3 inline-block"
              style={{ backgroundColor: "rgba(212,165,116,0.3)", color: "#D4A574" }}>
              {recipe.cuisine}
            </span>
            <h1
              className="text-3xl font-bold text-white mb-2"
              style={{ fontFamily: "var(--font-playfair)" }}>
              {recipe.name}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              {[
                { icon: Clock, label: `${recipe.prepTime + recipe.cookTime} min` },
                { icon: Flame, label: `${recipe.calories} cal` },
                { icon: ChefHat, label: recipe.difficulty },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <Icon size={16} style={{ color: "#D4A574" }} />
                  <span className="text-sm text-white opacity-80">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl p-8 mb-6" style={{ backgroundColor: "#2D5F5D" }}>
          <span
            className="text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full mb-3 inline-block"
            style={{ backgroundColor: "rgba(212,165,116,0.3)", color: "#D4A574" }}>
            {recipe.cuisine}
          </span>
          <h1
            className="text-3xl font-bold text-white mb-2"
            style={{ fontFamily: "var(--font-playfair)" }}>
            {recipe.name}
          </h1>
          <div className="flex items-center gap-4 mt-4">
            {[
              { icon: Clock, label: `${recipe.prepTime + recipe.cookTime} min` },
              { icon: Flame, label: `${recipe.calories} cal` },
              { icon: ChefHat, label: recipe.difficulty },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1">
                <Icon size={16} style={{ color: "#D4A574" }} />
                <span className="text-sm text-white opacity-80">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Macros */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Protein", value: `${recipe.protein}g`, color: "#E67E22", bg: "#FFF7F0" },
          { label: "Carbs", value: `${recipe.carbs}g`, color: "#2D5F5D", bg: "#F0F7F7" },
          { label: "Fats", value: `${recipe.fats}g`, color: "#27AE60", bg: "#F0FFF4" },
        ].map(({ label, value, color, bg }) => (
          <div
            key={label}
            className="rounded-2xl p-4 text-center"
            style={{ backgroundColor: bg }}>
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-sm" style={{ color: "#6B7280" }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Feedback */}
      <div
        className="rounded-2xl p-6 mb-6 flex items-center justify-between"
        style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <FeedbackButtons recipeId={recipe.id} />
        
        <div className="flex gap-2">
          {recipe.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs px-3 py-1 rounded-full"
              style={{ backgroundColor: "#F0F7F7", color: "#2D5F5D" }}>
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">

        {/* Ingredients */}
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: "#2C3E50" }}>
            🛒 Ingredients
          </h2>
          <ul className="space-y-2">
            {ingredients.map((ingredient, i) => (
              <li key={i} className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: "#D4A574" }}
                />
                <span className="text-sm" style={{ color: "#2C3E50" }}>
                  {ingredient}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        <div
          className="rounded-2xl p-6"
          style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <h2 className="text-lg font-bold mb-4" style={{ color: "#2C3E50" }}>
            👨‍🍳 Instructions
          </h2>
          <ol className="space-y-3">
            {instructions.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: "#2D5F5D", color: "white" }}>
                  {i + 1}
                </span>
                <span className="text-sm" style={{ color: "#2C3E50" }}>
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}