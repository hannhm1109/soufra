// Baseline source: seeds BaselineIngredientPrice from the curated JSON catalog.
//
// This gives the resolver a DB-backed fallback that:
//   - survives without any Aswak snapshots
//   - can be updated via admin UI without redeploying
//   - is slightly higher confidence than a cold JSON read (it's been reviewed)
//
// Run during cron or via: npx prisma db seed (see seed-prices.mjs for ingredient rows)

import { prisma } from "@/lib/prisma"
import curatedCatalog from "@/lib/data/moroccan-ingredient-prices.json"

interface CuratedIngredient {
  slug: string
  name: string
  category: string
  defaultUnit: string
  tierPrices: { souk: number; supermarket: number; premium: number }
  aliases?: string[]
}

const TIERS = ["souk", "supermarket", "premium"] as const

export interface BaselineSeedResult {
  seeded: number
  skipped: number
  errors: number
}

// Idempotent: upserts all baseline prices from the JSON catalog into
// BaselineIngredientPrice. Safe to run multiple times.
export async function seedBaselinePrices(): Promise<BaselineSeedResult> {
  let seeded = 0
  let skipped = 0
  let errors = 0

  // Fetch all ingredient slugs once
  const ingredients = await prisma.ingredient.findMany({
    select: { id: true, slug: true, defaultUnit: true },
  })
  const slugMap = new Map(ingredients.map((i) => [i.slug, i]))

  for (const entry of curatedCatalog as CuratedIngredient[]) {
    const ingredient = slugMap.get(entry.slug)
    if (!ingredient) {
      // Ingredient not yet in DB — skip (seed-prices.mjs should run first)
      skipped++
      continue
    }

    for (const tier of TIERS) {
      const unitPrice = entry.tierPrices[tier]
      if (!unitPrice || unitPrice <= 0) continue

      try {
        await prisma.baselineIngredientPrice.upsert({
          where: {
            ingredientId_marketTier_city: {
              ingredientId: ingredient.id,
              marketTier: tier,
              city: "national",
            },
          },
          update: {
            unitPrice,
            unit: ingredient.defaultUnit,
            notes: "Seeded from Soufra curated Moroccan market baseline",
          },
          create: {
            ingredientId: ingredient.id,
            marketTier: tier,
            city: "national",
            unitPrice,
            unit: ingredient.defaultUnit,
            confidenceLevel: "low",
            notes: "Seeded from Soufra curated Moroccan market baseline",
          },
        })
        seeded++
      } catch (err) {
        console.error(`[baseline] seed error for ${entry.slug}/${tier}:`, (err as Error).message)
        errors++
      }
    }
  }

  return { seeded, skipped, errors }
}

// Delete baseline prices older than maxAgeDays (e.g., to force a re-seed)
export async function pruneStaleBaselines(maxAgeDays = 90): Promise<number> {
  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000)
  const { count } = await prisma.baselineIngredientPrice.deleteMany({
    where: { updatedAt: { lt: cutoff } },
  })
  return count
}
