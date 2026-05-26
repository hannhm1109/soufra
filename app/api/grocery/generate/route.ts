import { auth } from "@/lib/auth"
import {
  aggregateQuantity,
  assessBudgetFeasibility,
  estimateIngredientPriceWithCatalog,
  getConfidenceLabel,
  getPriceCatalog,
  groupIngredients,
  stripLeadingQuantity,
  type MarketTierValue,
} from "@/lib/pricing"
import { logResolution, resolvePriceBatch } from "@/lib/pricing/resolve"
import { prisma } from "@/lib/prisma"
import { after } from "next/server"
import { NextResponse } from "next/server"

export async function POST() {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      mealPlans: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        include: {
          slots: {
            include: { recipe: true },
          },
        },
        take: 1,
      },
    },
  })

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const activePlan = user.mealPlans[0]
  if (!activePlan) {
    return NextResponse.json({ error: "No active meal plan" }, { status: 400 })
  }

  const marketTier = (user.marketTier ?? "supermarket") as MarketTierValue
  const city = user.city ?? "Casablanca"
  const catalog = await getPriceCatalog(city, marketTier)

  const allIngredients: string[] = []
  for (const slot of activePlan.slots) {
    // Skip slots that use yesterday's leftovers — ingredients already counted in the dinner that made them
    if (slot.usesLeftovers) continue
    const ingredients = slot.recipe.ingredients as string[]
    allIngredients.push(...ingredients)
  }

  const groupedIngredients = groupIngredients(allIngredients)

  const groceryItems = Array.from(groupedIngredients.entries()).map(([canonical, instances]) => {
    const aggregated = aggregateQuantity(instances)
    // Price using the total aggregated quantity, not just the first instance.
    // e.g. "100g tomatoes" + "200g tomatoes" → price "300g tomatoes", not "100g tomatoes".
    const nameOnly = stripLeadingQuantity(canonical)
    const pricingText = /^\d/.test(aggregated) ? `${aggregated} ${nameOnly}` : canonical
    const estimate = estimateIngredientPriceWithCatalog(pricingText, marketTier, catalog)
    const isFree = ["water", "salt", "ice"].includes(nameOnly.toLowerCase().trim())
    return {
      ingredientId: estimate.ingredientId ?? null,
      name: estimate.canonicalName,
      quantity: aggregated,
      category: estimate.category,
      price: isFree ? null : estimate.estimatedCost,
      unitPrice: estimate.unitPrice,
      priceSource: estimate.priceSource,
      priceConfidence: estimate.priceConfidence,
      estimatedTier: estimate.marketTier,
      store: estimate.sourceLabel,
    }
  })

  const totalCost = groceryItems.reduce((sum, item) => sum + (item.price ?? 0), 0)
  const averageConfidence = groceryItems.length > 0
    ? groceryItems.reduce((sum, item) => sum + (item.priceConfidence ?? 0), 0) / groceryItems.length
    : 0

  const budgetAssessment = assessBudgetFeasibility({
    calorieTarget: user.calorieTarget,
    weeklyBudget: user.weeklyBudget,
    marketTier,
    cuisineCount: user.cuisines.length,
  })

  // Override budget status based on actual generated cost vs user's budget
  let actualBudgetStatus = budgetAssessment.status
  let actualBudgetMessage = budgetAssessment.message
  if (user.weeklyBudget && totalCost > 0) {
    const ratio = totalCost / user.weeklyBudget
    if (ratio > 1.15) {
      actualBudgetStatus = "unrealistic"
      actualBudgetMessage = `Your grocery list costs ${totalCost.toFixed(0)} DH — ${(totalCost - user.weeklyBudget).toFixed(0)} DH over your ${user.weeklyBudget} DH budget. Generate a new meal plan to get more affordable recipes.`
    } else if (ratio > 1.0) {
      actualBudgetStatus = "tight"
      actualBudgetMessage = `Your grocery list costs ${totalCost.toFixed(0)} DH — slightly over your ${user.weeklyBudget} DH budget.`
    } else {
      actualBudgetStatus = "on_track"
      actualBudgetMessage = `Your grocery list costs ${totalCost.toFixed(0)} DH — within your ${user.weeklyBudget} DH budget.`
    }
  }

  await prisma.groceryList.deleteMany({
    where: { userId: user.id },
  })

  const groceryList = await prisma.groceryList.create({
    data: {
      userId: user.id,
      weekOf: new Date(),
      totalCost,
      city,
      marketTier,
      priceConfidence: averageConfidence,
      budgetStatus: actualBudgetStatus,
      budgetFloor: budgetAssessment.recommendedFloor,
      budgetCeiling: budgetAssessment.estimatedCeiling,
      estimateSummary: {
        confidenceLabel: getConfidenceLabel(averageConfidence),
        marketTier,
        city,
        message: actualBudgetMessage,
      },
      items: {
        create: groceryItems,
      },
    },
    include: { items: true },
  })

  // Wire PriceResolutionLog — runs after response is sent so it never delays the user.
  // `after` is guaranteed to complete even in Vercel serverless (unlike fire-and-forget void).
  const itemsWithIngredients = groceryList.items.filter((i) => i.ingredientId)
  if (itemsWithIngredients.length > 0) {
    after(async () => {
      try {
        const ingredients = await prisma.ingredient.findMany({
          where: { id: { in: itemsWithIngredients.map((i) => i.ingredientId!) } },
          select: { id: true, slug: true, defaultUnit: true },
        })
        const resolvedPrices = await resolvePriceBatch(ingredients, marketTier, city)
        for (const item of itemsWithIngredients) {
          const resolved = resolvedPrices.get(item.ingredientId!)
          if (resolved) {
            logResolution({
              groceryListId: groceryList.id,
              groceryListItemId: item.id,
              ingredientId: item.ingredientId!,
              resolved,
            })
          }
        }
      } catch {
        // Never surface audit log failures to the user
      }
    })
  }

  return NextResponse.json({
    success: true,
    groceryList,
    assessment: budgetAssessment,
  })
}
