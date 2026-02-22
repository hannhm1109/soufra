import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// Static price database (DH) - we'll expand this later
const priceDB: Record<string, { price: number; unit: string }> = {
  // Proteins
  "chicken": { price: 45, unit: "kg" },
  "beef": { price: 80, unit: "kg" },
  "lamb": { price: 90, unit: "kg" },
  "fish": { price: 50, unit: "kg" },
  "eggs": { price: 15, unit: "dozen" },
  "tuna": { price: 12, unit: "can" },
  // Vegetables
  "tomatoes": { price: 8, unit: "kg" },
  "onion": { price: 5, unit: "kg" },
  "onions": { price: 5, unit: "kg" },
  "garlic": { price: 10, unit: "kg" },
  "carrots": { price: 6, unit: "kg" },
  "zucchini": { price: 8, unit: "kg" },
  "spinach": { price: 5, unit: "bunch" },
  "potatoes": { price: 5, unit: "kg" },
  "peppers": { price: 10, unit: "kg" },
  "eggplant": { price: 7, unit: "kg" },
  // Grains
  "couscous": { price: 12, unit: "kg" },
  "rice": { price: 15, unit: "kg" },
  "pasta": { price: 8, unit: "kg" },
  "bread": { price: 3, unit: "loaf" },
  "oats": { price: 18, unit: "kg" },
  "flour": { price: 8, unit: "kg" },
  // Dairy
  "milk": { price: 7, unit: "liter" },
  "yogurt": { price: 6, unit: "pot" },
  "cheese": { price: 25, unit: "kg" },
  "butter": { price: 20, unit: "250g" },
  // Pantry
  "olive oil": { price: 35, unit: "liter" },
  "argan oil": { price: 80, unit: "liter" },
  "chickpeas": { price: 10, unit: "kg" },
  "lentils": { price: 12, unit: "kg" },
  "honey": { price: 40, unit: "jar" },
  "cumin": { price: 8, unit: "bag" },
  "ras el hanout": { price: 15, unit: "bag" },
  "preserved lemons": { price: 20, unit: "jar" },
  "harissa": { price: 12, unit: "jar" },
  "tomato paste": { price: 5, unit: "can" },
  // Fruits
  "banana": { price: 10, unit: "kg" },
  "bananas": { price: 10, unit: "kg" },
  "apples": { price: 12, unit: "kg" },
  "dates": { price: 30, unit: "kg" },
  "apricots": { price: 20, unit: "kg" },
  "olives": { price: 25, unit: "kg" },
}

function getPrice(ingredientName: string): number {
  const lower = ingredientName.toLowerCase()
  for (const [key, value] of Object.entries(priceDB)) {
    if (lower.includes(key)) return value.price
  }
  return 10 // default price
}

function getCategory(ingredientName: string): string {
  const lower = ingredientName.toLowerCase()
  if (["chicken", "beef", "lamb", "fish", "eggs", "tuna", "meat", "prawn"].some(k => lower.includes(k))) return "Meat & Protein"
  if (["tomato", "onion", "garlic", "carrot", "zucchini", "spinach", "potato", "pepper", "eggplant", "vegetable", "bell"].some(k => lower.includes(k))) return "Vegetables"
  if (["apple", "banana", "date", "apricot", "olive", "lemon", "fruit"].some(k => lower.includes(k))) return "Fruits"
  if (["milk", "yogurt", "cheese", "butter", "cream", "dairy"].some(k => lower.includes(k))) return "Dairy"
  if (["couscous", "rice", "pasta", "bread", "oat", "flour", "grain"].some(k => lower.includes(k))) return "Grains"
  if (["oil", "spice", "cumin", "ras el", "harissa", "honey", "chickpea", "lentil", "preserved", "paste", "can"].some(k => lower.includes(k))) return "Pantry & Spices"
  return "Other"
}

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
        include: {
          slots: {
            include: { recipe: true }
          }
        },
        take: 1
      }
    }
  })

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const activePlan = user.mealPlans[0]
  if (!activePlan) return NextResponse.json({ error: "No active meal plan" }, { status: 400 })

  // Collect all ingredients from all recipes
  const allIngredients: string[] = []
  for (const slot of activePlan.slots) {
    const ingredients = slot.recipe.ingredients as string[]
    allIngredients.push(...ingredients)
  }

  // Deduplicate similar ingredients
  const uniqueIngredients = [...new Set(allIngredients)]

  // Build grocery items with prices and categories
  const groceryItems = uniqueIngredients.map(ingredient => ({
    name: ingredient,
    quantity: "1",
    category: getCategory(ingredient),
    price: getPrice(ingredient),
  }))

  const totalCost = groceryItems.reduce((sum, item) => sum + item.price, 0)

  // Delete old grocery list if exists
  await prisma.groceryList.deleteMany({
    where: { userId: user.id }
  })

  // Create new grocery list
  const groceryList = await prisma.groceryList.create({
    data: {
      userId: user.id,
      weekOf: new Date(),
      totalCost,
      items: {
        create: groceryItems
      }
    },
    include: { items: true }
  })

  return NextResponse.json({ success: true, groceryList })
}