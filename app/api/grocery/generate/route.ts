import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

const priceDB: Record<string, { price: number; unit: string }> = {
  "chicken": { price: 45, unit: "kg" },
  "beef": { price: 80, unit: "kg" },
  "lamb": { price: 90, unit: "kg" },
  "fish": { price: 50, unit: "kg" },
  "eggs": { price: 15, unit: "dozen" },
  "tuna": { price: 12, unit: "can" },
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
  "couscous": { price: 12, unit: "kg" },
  "rice": { price: 15, unit: "kg" },
  "pasta": { price: 8, unit: "kg" },
  "bread": { price: 3, unit: "loaf" },
  "oats": { price: 18, unit: "kg" },
  "flour": { price: 8, unit: "kg" },
  "milk": { price: 7, unit: "liter" },
  "yogurt": { price: 6, unit: "pot" },
  "cheese": { price: 25, unit: "kg" },
  "butter": { price: 20, unit: "250g" },
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
  return 10
}

function getCategory(ingredientName: string): string {
  const lower = ingredientName.toLowerCase()
  if (["chicken", "beef", "lamb", "fish", "eggs", "tuna", "meat", "prawn", "shrimp"].some(k => lower.includes(k))) return "Meat & Protein"
  if (["tomato", "onion", "garlic", "carrot", "zucchini", "spinach", "potato", "pepper", "eggplant", "vegetable", "bell", "lettuce", "cucumber"].some(k => lower.includes(k))) return "Vegetables"
  if (["apple", "banana", "date", "apricot", "olive", "lemon", "orange", "fruit"].some(k => lower.includes(k))) return "Fruits"
  if (["milk", "yogurt", "cheese", "butter", "cream", "dairy"].some(k => lower.includes(k))) return "Dairy"
  if (["couscous", "rice", "pasta", "bread", "oat", "flour", "grain", "quinoa"].some(k => lower.includes(k))) return "Grains"
  if (["oil", "spice", "cumin", "ras el", "harissa", "honey", "chickpea", "lentil", "preserved", "paste", "can", "sauce", "vinegar", "salt", "pepper"].some(k => lower.includes(k))) return "Pantry & Spices"
  return "Other"
}

// Extract the base ingredient name for grouping
function extractBaseName(ingredient: string): string {
  // Remove quantities like "200g", "1 tbsp", "2 cups" etc
  return ingredient
    .toLowerCase()
    .replace(/^\d+(\.\d+)?\s*(g|kg|ml|l|liter|litre|tbsp|tsp|cup|cups|piece|pieces|pcs|bunch|can|jar|dozen|oz|lb|clove|cloves|slice|slices)?\s*/i, "")
    .replace(/\(.*?\)/g, "")
    .trim()
}

// Check if two ingredients refer to the same thing
function isSameIngredient(a: string, b: string): boolean {
  const baseA = extractBaseName(a)
  const baseB = extractBaseName(b)

  if (baseA === baseB) return true

  // Check if one contains the other
  if (baseA.includes(baseB) || baseB.includes(baseA)) return true

  // Common synonyms
  const synonymGroups = [
    ["chicken", "chicken breast", "chicken thigh", "chicken leg"],
    ["onion", "onions", "red onion", "white onion"],
    ["tomato", "tomatoes", "cherry tomatoes"],
    ["garlic", "garlic cloves", "garlic clove"],
    ["pepper", "peppers", "bell pepper", "bell peppers"],
    ["yogurt", "greek yogurt", "plain yogurt"],
    ["oil", "olive oil", "vegetable oil"],
  ]

  for (const group of synonymGroups) {
    const aInGroup = group.some(s => baseA.includes(s) || s.includes(baseA))
    const bInGroup = group.some(s => baseB.includes(s) || s.includes(baseB))
    if (aInGroup && bInGroup) return true
  }

  return false
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

  // Collect all ingredients
  const allIngredients: string[] = []
  for (const slot of activePlan.slots) {
    const ingredients = slot.recipe.ingredients as string[]
    allIngredients.push(...ingredients)
  }

  // Smart deduplication
  const deduplicated: string[] = []
  for (const ingredient of allIngredients) {
    const alreadyExists = deduplicated.some(existing =>
      isSameIngredient(existing, ingredient)
    )
    if (!alreadyExists) {
      deduplicated.push(ingredient)
    }
  }

  // Build grocery items
  const groceryItems = deduplicated.map(ingredient => ({
    name: ingredient,
    quantity: "1",
    category: getCategory(ingredient),
    price: getPrice(ingredient),
  }))

  const totalCost = groceryItems.reduce((sum, item) => sum + item.price, 0)

  // Delete old grocery list
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