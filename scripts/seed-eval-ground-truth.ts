// Seed ground-truth prices for the price-accuracy evaluation.
//
//   npx tsx scripts/seed-eval-ground-truth.ts
//
// HOW TO USE
// ──────────
// 1. Pick ONE Moroccan supermarket website that is NOT Aswak Assalam (so the
//    evaluation actually measures cross-store generalisation). Marjane.ma and
//    Carrefour Morocco both list current prices publicly.
// 2. For every entry below, look up the matching product and fill in
//    `totalPrice` (the displayed price in DH for the listed `quantityValue` +
//    `quantityUnit`). Leave any entries you cannot find at `totalPrice: 0`
//    — the script will skip them rather than write bad data.
// 3. Update `SOURCE_STORE` to whichever store you used.
// 4. Run the script. It creates one Receipt row + one ReceiptLinePrice row
//    per filled entry, then prints how many data points were saved.
// 5. Run `npx tsx scripts/evaluate-price-accuracy.ts` to get the numbers.
//
// METHODOLOGY NOTE FOR THE RAPPORT
// ────────────────────────────────
// `purchasedAt` is set to "now", which matches the freshness of the Aswak
// snapshots already in the DB (the cron scrapes daily). The evaluation will
// compare the system's prediction for each ingredient — derived from Aswak
// scraped snapshots — against the price observed at SOURCE_STORE on the same
// day. Receipt-sourced snapshots are excluded from prediction by the eval
// script, so this seeded data does not contaminate its own prediction.

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// ─── Edit these two constants ────────────────────────────────────────────────

const SOURCE_STORE = "Marjane Casablanca" // change to "Carrefour Casablanca" etc.
const CITY = "Casablanca"
const MARKET_TIER: "souk" | "supermarket" | "premium" = "supermarket"

// Email of the user the receipt is attached to (any existing account works —
// it is only used so the Receipt row has a valid userId foreign key).
const ATTACH_TO_EMAIL = "nahanane20@gmail.com"

// ─── Ground-truth entries: fill in totalPrice from the store website ─────────
//
// quantityValue + quantityUnit must describe what the listed price is FOR.
// e.g. if Marjane shows "Riz Basmati 1kg — 28 DH", use { 1, "kg", 28 }.
//      if Marjane shows "Œufs x12 — 22 DH",       use { 12, "pc", 22 } or { 1, "dozen", 22 }.
//
// Leave totalPrice = 0 for any item you cannot find — the script will skip it.

interface GroundTruthEntry {
  slug: string             // must match an Ingredient.slug in the DB
  rawName: string          // human-readable label (what you saw on the site)
  quantityValue: number
  quantityUnit: string     // "kg", "g", "l", "ml", "dozen", "pc", "bunch", "pot", "loaf", "jar", "bag"
  totalPrice: number       // DH — fill this in from the store website
}

const GROUND_TRUTH: GroundTruthEntry[] = [
  // ── Meat & Protein ────────────────────────────────────────────────────────
  { slug: "chicken-breast", rawName: "Blanc de poulet",         quantityValue: 1, quantityUnit: "kg",    totalPrice: 64.90 },
  { slug: "beef",           rawName: "Viande de bœuf",          quantityValue: 1, quantityUnit: "kg",    totalPrice: 105.00 },
  { slug: "lamb",           rawName: "Viande d'agneau",         quantityValue: 1, quantityUnit: "kg",    totalPrice: 130.00 },
  { slug: "eggs",           rawName: "Œufs",                    quantityValue: 1, quantityUnit: "dozen", totalPrice: 17.50 },

  // ── Legumes & Grains ──────────────────────────────────────────────────────
  { slug: "lentils",        rawName: "Lentilles",               quantityValue: 1, quantityUnit: "kg",    totalPrice: 22.95 },
  { slug: "chickpeas",      rawName: "Pois chiches secs",       quantityValue: 1, quantityUnit: "kg",    totalPrice: 24.50 },
  { slug: "rice",           rawName: "Riz",                     quantityValue: 1, quantityUnit: "kg",    totalPrice: 16.90 },
  { slug: "couscous",       rawName: "Couscous moyen",          quantityValue: 1, quantityUnit: "kg",    totalPrice: 14.50 },
  { slug: "pasta",          rawName: "Pâtes",                   quantityValue: 1, quantityUnit: "kg",    totalPrice: 13.50 },
  { slug: "flour",          rawName: "Farine",                  quantityValue: 1, quantityUnit: "kg",    totalPrice: 8.50 },

  // ── Dairy & Oil ───────────────────────────────────────────────────────────
  { slug: "milk",           rawName: "Lait UHT",                quantityValue: 1, quantityUnit: "l",     totalPrice: 10.50 },
  { slug: "yogurt",         rawName: "Yaourt nature",           quantityValue: 1, quantityUnit: "pot",   totalPrice: 2.50 },
  { slug: "olive-oil",      rawName: "Huile d'olive",           quantityValue: 1, quantityUnit: "l",     totalPrice: 79.00 },
  { slug: "vegetable-oil",  rawName: "Huile de tournesol",      quantityValue: 1, quantityUnit: "l",     totalPrice: 19.50 },

  // ── Vegetables ────────────────────────────────────────────────────────────
  { slug: "tomatoes",       rawName: "Tomates",                 quantityValue: 1, quantityUnit: "kg",    totalPrice: 7.50 },
  { slug: "onions",         rawName: "Oignons",                 quantityValue: 1, quantityUnit: "kg",    totalPrice: 10.50 },
  { slug: "potatoes",       rawName: "Pommes de terre",         quantityValue: 1, quantityUnit: "kg",    totalPrice: 7.50 },
  { slug: "carrots",        rawName: "Carottes",                quantityValue: 1, quantityUnit: "kg",    totalPrice: 6.00 },
  { slug: "zucchini",       rawName: "Courgettes",              quantityValue: 1, quantityUnit: "kg",    totalPrice: 9.00 },
  { slug: "bell-peppers",   rawName: "Poivrons",                quantityValue: 1, quantityUnit: "kg",    totalPrice: 12.00 },
  { slug: "garlic",         rawName: "Ail",                     quantityValue: 1, quantityUnit: "kg",    totalPrice: 35.00 },

  // ── Fruits ────────────────────────────────────────────────────────────────
  { slug: "lemons",         rawName: "Citrons",                 quantityValue: 1, quantityUnit: "kg",    totalPrice: 11.00 },
  { slug: "bananas",        rawName: "Bananes",                 quantityValue: 1, quantityUnit: "kg",    totalPrice: 15.00 },
  { slug: "apples",         rawName: "Pommes",                  quantityValue: 1, quantityUnit: "kg",    totalPrice: 16.00 },
  { slug: "oranges",        rawName: "Oranges",                 quantityValue: 1, quantityUnit: "kg",    totalPrice: 7.00 },
]

// ─── Implementation ──────────────────────────────────────────────────────────

async function main() {
  const ready = GROUND_TRUTH.filter((e) => e.totalPrice > 0)
  const pending = GROUND_TRUTH.filter((e) => e.totalPrice <= 0)

  console.log(`\n[seed-eval-ground-truth] ${ready.length} filled, ${pending.length} still empty.`)
  if (pending.length > 0) {
    console.log("Skipping (totalPrice = 0):", pending.map((e) => e.slug).join(", "))
  }
  if (ready.length === 0) {
    console.log("\nNothing to seed yet — fill in totalPrice for at least a few entries and re-run.\n")
    await prisma.$disconnect()
    return
  }

  const user = await prisma.user.findUnique({ where: { email: ATTACH_TO_EMAIL } })
  if (!user) {
    console.error(`User ${ATTACH_TO_EMAIL} not found. Update ATTACH_TO_EMAIL at the top of this file.`)
    process.exit(1)
  }

  const purchasedAt = new Date()

  const receipt = await prisma.receipt.create({
    data: {
      userId: user.id,
      storeName: SOURCE_STORE,
      city: CITY,
      totalMad: ready.reduce((sum, e) => sum + e.totalPrice, 0),
      purchasedAt,
      status: "reviewed",
    },
  })
  console.log(`\nCreated Receipt ${receipt.id} (${SOURCE_STORE}, ${CITY}, ${purchasedAt.toISOString().slice(0, 10)})`)

  let inserted = 0
  const unmatched: string[] = []

  for (const entry of ready) {
    const ingredient = await prisma.ingredient.findUnique({ where: { slug: entry.slug } })
    if (!ingredient) {
      unmatched.push(entry.slug)
      continue
    }

    await prisma.receiptLinePrice.create({
      data: {
        receiptId: receipt.id,
        ingredientId: ingredient.id,
        rawName: entry.rawName,
        normalizedName: entry.rawName.toLowerCase(),
        quantityValue: entry.quantityValue,
        quantityUnit: entry.quantityUnit,
        totalPrice: entry.totalPrice,
        city: CITY,
        marketTier: MARKET_TIER,
        purchasedAt,
        confidenceScore: 1.0, // manually collected → ground truth
      },
    })
    inserted++
  }

  console.log(`\nInserted ${inserted} ReceiptLinePrice rows.`)
  if (unmatched.length > 0) {
    console.log(`Skipped (slug not found in DB):`, unmatched.join(", "))
  }
  console.log("\nNext step:\n  npx tsx scripts/evaluate-price-accuracy.ts\n")

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
