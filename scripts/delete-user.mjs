// Run with: node scripts/delete-user.mjs your@email.com
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const email = process.argv[2]

if (!email) {
  console.error("Usage: node scripts/delete-user.mjs your@email.com")
  process.exit(1)
}

const user = await prisma.user.findUnique({
  where: { email },
  include: { mealPlans: true, groceryLists: true },
})

if (!user) {
  console.error(`No user found with email: ${email}`)
  await prisma.$disconnect()
  process.exit(1)
}

// Delete in dependency order to avoid FK violations
const mealPlanIds = user.mealPlans.map((p) => p.id)
const groceryListIds = user.groceryLists.map((g) => g.id)

await prisma.mealPlanSlot.deleteMany({ where: { mealPlanId: { in: mealPlanIds } } })
await prisma.mealPlan.deleteMany({ where: { userId: user.id } })
await prisma.groceryItem.deleteMany({ where: { groceryListId: { in: groceryListIds } } })
await prisma.groceryList.deleteMany({ where: { userId: user.id } })
await prisma.recipeFeedback.deleteMany({ where: { userId: user.id } })
await prisma.receipt.deleteMany({ where: { userId: user.id } })
await prisma.user.delete({ where: { email } })

console.log(`Done — deleted ${email} and all their data`)
await prisma.$disconnect()
