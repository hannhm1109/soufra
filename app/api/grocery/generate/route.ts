import { auth } from "@/lib/auth"
import {
  aggregateQuantity,
  assessBudgetFeasibility,
  estimateIngredientPriceWithCatalog,
  getConfidenceLabel,
  getPriceCatalog,
  groupIngredients,
  type MarketTierValue,
} from "@/lib/pricing"
import { prisma } from "@/lib/prisma"
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
    const ingredients = slot.recipe.ingredients as string[]
    allIngredients.push(...ingredients)
  }

  const groupedIngredients = groupIngredients(allIngredients)

  const groceryItems = Array.from(groupedIngredients.entries()).map(([canonical, instances]) => {
    const estimate = estimateIngredientPriceWithCatalog(canonical, marketTier, catalog)
    return {
      ingredientId: estimate.ingredientId ?? null,
      name: estimate.canonicalName,
      quantity: aggregateQuantity(instances),
      category: estimate.category,
      price: estimate.estimatedCost,
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
      budgetStatus: budgetAssessment.status,
      budgetFloor: budgetAssessment.recommendedFloor,
      budgetCeiling: budgetAssessment.estimatedCeiling,
      estimateSummary: {
        confidenceLabel: getConfidenceLabel(averageConfidence),
        marketTier,
        city,
        message: budgetAssessment.message,
      },
      items: {
        create: groceryItems,
      },
    },
    include: { items: true },
  })

  return NextResponse.json({
    success: true,
    groceryList,
    assessment: budgetAssessment,
  })
}
