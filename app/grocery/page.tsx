import { auth } from "@/lib/auth"
import { PrismaClient } from "@prisma/client"
import { redirect } from "next/navigation"
import { ShoppingCart, Wallet } from "lucide-react"
import GenerateGroceryButton from "@/components/generate-grocery-button"
import GroceryItemsList from "@/components/grocery-items-list"

const prisma = new PrismaClient()

export default async function GroceryPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      groceryLists: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          items: {
            orderBy: { category: "asc" }
          }
        }
      }
    }
  })

  if (!user) redirect("/login")

  const groceryList = user.groceryLists[0] || null

  // Group items by category
  const grouped: Record<string, typeof groceryList.items> = {}
  if (groceryList) {
    for (const item of groceryList.items) {
      if (!grouped[item.category]) grouped[item.category] = []
      grouped[item.category].push(item)
    }
  }

  const budgetPercent = groceryList && user.weeklyBudget
    ? Math.min((groceryList.totalCost! / user.weeklyBudget) * 100, 100)
    : 0

  const budgetColor = budgetPercent < 80 ? "#27AE60" : budgetPercent < 100 ? "#E67E22" : "#E74C3C"

  const categoryEmojis: Record<string, string> = {
    "Meat & Protein": "🥩",
    "Vegetables": "🥦",
    "Fruits": "🍎",
    "Dairy": "🥛",
    "Grains": "🌾",
    "Pantry & Spices": "🫙",
    "Other": "🛒",
  }

  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "#2C3E50" }}>
            Grocery List 🛒
          </h1>
          <p style={{ color: "#6B7280" }}>
            Auto-generated from your weekly meal plan
          </p>
        </div>
        <GenerateGroceryButton />
      </div>

      {groceryList ? (
        <>
          {/* Budget tracker */}
          <div
            className="rounded-2xl p-6 mb-6"
            style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Wallet size={20} style={{ color: "#2D5F5D" }} />
                <span className="font-semibold" style={{ color: "#2C3E50" }}>
                  Budget Tracker
                </span>
              </div>
              <span className="font-bold text-lg" style={{ color: budgetColor }}>
                {groceryList.totalCost?.toFixed(0)} / {user.weeklyBudget} DH
              </span>
            </div>
            <div className="h-3 rounded-full mb-2" style={{ backgroundColor: "#E5E7EB" }}>
              <div
                className="h-3 rounded-full transition-all"
                style={{ width: `${budgetPercent}%`, backgroundColor: budgetColor }}
              />
            </div>
            <p className="text-sm" style={{ color: "#6B7280" }}>
              {budgetPercent < 90
                ? `✅ You're ${(user.weeklyBudget! - groceryList.totalCost!).toFixed(0)} DH under budget!`
                : budgetPercent < 100
                ? `⚠️ Getting close to your budget`
                : `❌ Over budget by ${(groceryList.totalCost! - user.weeklyBudget!).toFixed(0)} DH`}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: "Total Items", value: groceryList.items.length },
              { label: "Categories", value: Object.keys(grouped).length },
              { label: "Est. Cost", value: `${groceryList.totalCost?.toFixed(0)} DH` },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl p-4 text-center"
                style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
                <p className="text-2xl font-bold" style={{ color: "#2D5F5D" }}>{value}</p>
                <p className="text-sm" style={{ color: "#6B7280" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Items by category */}
          <GroceryItemsList grouped={grouped} categoryEmojis={categoryEmojis} />
        </>
      ) : (
        /* Empty state */
        <div
          className="rounded-2xl p-16 text-center"
          style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
          <ShoppingCart size={48} className="mx-auto mb-4" style={{ color: "#D1D5DB" }} />
          <h3 className="text-xl font-bold mb-2" style={{ color: "#2C3E50" }}>
            No grocery list yet
          </h3>
          <p className="mb-6" style={{ color: "#6B7280" }}>
            Generate a meal plan first, then create your grocery list
          </p>
          <GenerateGroceryButton />
        </div>
      )}
    </div>
  )
}