import { auth } from "@/lib/auth"
import { getConfidenceLabel } from "@/lib/pricing"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { ShoppingCart, Wallet, CheckCircle, AlertTriangle, XCircle } from "lucide-react"
import GenerateGroceryButton from "@/components/generate-grocery-button"
import GroceryItemsList from "@/components/grocery-items-list"
import PrintGroceryButton from "@/components/print-grocery-button"
import ReceiptUpload from "@/components/receipt-upload"

export const dynamic = "force-dynamic"

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
  const confidenceLabel = getConfidenceLabel(groceryList?.priceConfidence)
  const marketTierLabel = groceryList?.marketTier
    ? groceryList.marketTier.charAt(0).toUpperCase() + groceryList.marketTier.slice(1)
    : "Supermarket"

  // Group items by category
  const grouped: Record<string, typeof groceryList.items> = {}
  if (groceryList) {
    for (const item of groceryList.items) {
      if (!grouped[item.category]) grouped[item.category] = []
      grouped[item.category].push(item)
    }
  }

  const weeklyBudget = user.weeklyBudget
  const budgetPercent = groceryList && weeklyBudget != null
    ? Math.min((groceryList.totalCost! / weeklyBudget) * 100, 100)
    : 0

  const budgetColor = budgetPercent < 80 ? "#27AE60" : budgetPercent < 100 ? "#E67E22" : "#E74C3C"
  const hasBudget = weeklyBudget != null
  const totalCost = groceryList?.totalCost ?? 0
  const budgetDifference = weeklyBudget != null ? weeklyBudget - totalCost : null

  const categoryEmojis: Record<string, string> = {
    "Meat & Protein": "🥩",
    "Vegetables": "🥦",
    "Fruits": "🍎",
    "Dairy": "🥛",
    "Grains": "🌾",
    "Pantry & Spices": "🫙",
    "Other": "🛒",
  }

  const printDate = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  })

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── Screen UI ─────────────────────────────────────────── */}
      <div data-no-print>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: "#2C3E50" }}>
              Grocery List
              <ShoppingCart size={22} style={{ color: "#2D5F5D" }} />
            </h1>
            <p style={{ color: "#6B7280" }}>
              Auto-generated from your weekly meal plan using {marketTierLabel.toLowerCase()} Moroccan pricing
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ReceiptUpload />
            {groceryList && <PrintGroceryButton />}
            {/* visual divider between utility actions and primary CTA */}
            <div className="w-px h-6 self-center mx-1" style={{ backgroundColor: "#E5E7EB" }} />
            <GenerateGroceryButton />
          </div>
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
                  {hasBudget
                    ? `${totalCost.toFixed(0)} / ${weeklyBudget} DH`
                    : `${totalCost.toFixed(0)} DH`}
                </span>
              </div>
              <div className="h-3 rounded-full mb-2" style={{ backgroundColor: "#E5E7EB" }}>
                <div
                  className="h-3 rounded-full transition-all"
                  style={{ width: `${budgetPercent}%`, backgroundColor: budgetColor }}
                />
              </div>
              <div className="flex items-center gap-1.5 text-sm" style={{
                color: budgetPercent < 90 ? "#27AE60" : budgetPercent < 100 ? "#E67E22" : "#E74C3C"
              }}>
                {!hasBudget
                  ? <><AlertTriangle size={14} /> Add a weekly budget in settings for a full budget check</>
                  : budgetPercent < 90
                  ? <><CheckCircle size={14} /> {budgetDifference!.toFixed(0)} DH under budget</>
                  : budgetPercent < 100
                  ? <><AlertTriangle size={14} /> Getting close to your budget</>
                  : <><XCircle size={14} /> Over budget by {Math.abs(budgetDifference!).toFixed(0)} DH</>
                }
              </div>
            </div>

            <div
              className="rounded-2xl p-6 mb-6"
              style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "#9CA3AF" }}>Price confidence</p>
                  <p className="text-lg font-bold" style={{ color: "#2C3E50" }}>{confidenceLabel}</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
                    Based on your market tier and Soufra&apos;s Moroccan ingredient baseline.
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "#9CA3AF" }}>Pricing context</p>
                  <p className="text-lg font-bold" style={{ color: "#2C3E50" }}>{marketTierLabel} basket</p>
                  <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>Moroccan pricing baseline</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wide mb-1" style={{ color: "#9CA3AF" }}>Budget realism</p>
                  <p
                    className="text-lg font-bold"
                    style={{
                      color:
                        groceryList.budgetStatus === "unrealistic" ? "#B91C1C" :
                        groceryList.budgetStatus === "tight" ? "#C2410C" :
                        "#166534",
                    }}
                  >
                    {groceryList.budgetStatus === "unrealistic"
                      ? "Too tight"
                      : groceryList.budgetStatus === "tight"
                      ? "Possible, but tight"
                      : "Realistic"}
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
                    {typeof groceryList.estimateSummary === "object" && groceryList.estimateSummary && "message" in groceryList.estimateSummary
                      ? String(groceryList.estimateSummary.message)
                      : hasBudget
                      ? "Soufra compares your weekly budget with a realistic calorie-based grocery floor."
                      : "Set a weekly budget to compare your basket against a realistic calorie-based grocery floor."}
                  </p>
                </div>
              </div>
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

            {/* Interactive list */}
            <GroceryItemsList grouped={grouped} categoryEmojis={categoryEmojis} />
          </>
        ) : (
          <div
            className="rounded-2xl p-16 text-center"
            style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <ShoppingCart size={48} className="mx-auto mb-4" style={{ color: "#D1D5DB" }} />
            <h3 className="text-xl font-bold mb-2" style={{ color: "#2C3E50" }}>
              No grocery list yet
            </h3>
            <p className="mb-6" style={{ color: "#6B7280" }}>
              Click the button above to generate your grocery list from your current meal plan
            </p>
          </div>
        )}
      </div>

      {/* ── Print-only area ───────────────────────────────────── */}
      {groceryList && (
        <div data-print-area style={{ display: "none" }}>

          {/* ── Branded header banner ── */}
          <div className="pdf-banner">
            <div className="pdf-banner-left">
              <div className="pdf-logo">S</div>
              <div>
                <div className="pdf-app-name">Soufra</div>
                <div className="pdf-app-sub">Smart Meal Planner</div>
              </div>
            </div>
            <div className="pdf-banner-right">
              <div className="pdf-list-title">Weekly Grocery List</div>
              <div className="pdf-list-date">{printDate}</div>
            </div>
          </div>

          {/* ── Summary stats row ── */}
          <div className="pdf-stats">
            <div className="pdf-stat">
              <div className="pdf-stat-value">{groceryList.items.length}</div>
              <div className="pdf-stat-label">Total Items</div>
            </div>
            <div className="pdf-stat-divider" />
            <div className="pdf-stat">
              <div className="pdf-stat-value">{Object.keys(grouped).length}</div>
              <div className="pdf-stat-label">Categories</div>
            </div>
            <div className="pdf-stat-divider" />
            <div className="pdf-stat">
              <div className="pdf-stat-value">{groceryList.totalCost?.toFixed(0)} DH</div>
              <div className="pdf-stat-label">Est. Total</div>
            </div>
            {user.weeklyBudget && (
              <>
                <div className="pdf-stat-divider" />
                <div className="pdf-stat">
                  <div className="pdf-stat-value" style={{
                    color: (groceryList.totalCost ?? 0) > user.weeklyBudget ? "#c0392b" : "#27AE60"
                  }}>
                    {user.weeklyBudget} DH
                  </div>
                  <div className="pdf-stat-label">Budget</div>
                </div>
              </>
            )}
          </div>

          {/* ── Budget progress bar ── */}
          {user.weeklyBudget && (
            <div className="pdf-budget-bar-wrap">
              <div className="pdf-budget-bar-track">
                <div
                  className="pdf-budget-bar-fill"
                  style={{
                    width: `${Math.min(((groceryList.totalCost ?? 0) / user.weeklyBudget) * 100, 100)}%`,
                    backgroundColor: budgetPercent >= 100 ? "#c0392b" : budgetPercent >= 80 ? "#e67e22" : "#27AE60",
                  }}
                />
              </div>
              <div className="pdf-budget-label">
                {budgetPercent < 100
                  ? `${(user.weeklyBudget - (groceryList.totalCost ?? 0)).toFixed(0)} DH remaining`
                  : `Over budget by ${((groceryList.totalCost ?? 0) - user.weeklyBudget).toFixed(0)} DH`}
              </div>
            </div>
          )}

          {/* ── Category sections in 2-column grid ── */}
          <div className="pdf-categories">
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category} className="pdf-cat-block">
                <div className="pdf-cat-header">
                  <span className="pdf-cat-name">{category}</span>
                  <span className="pdf-cat-count">{items.length} items</span>
                </div>
                <div className="pdf-items">
                  {items.map(item => (
                    <div key={item.id} className="pdf-item">
                      <div className="pdf-item-left">
                        <div className="pdf-checkbox" />
                        <span className="pdf-item-name">{item.name}</span>
                        <span className="pdf-item-qty">{item.quantity}</span>
                      </div>
                      {item.price != null && (
                        <span className="pdf-item-price">{item.price} DH</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* ── Footer ── */}
          <div className="pdf-footer">
            <span>Generated by Soufra — soufra.app</span>
            <span>{printDate}</span>
          </div>

        </div>
      )}
    </div>
  )
}
