// Re-matches existing SourceCatalogProducts using the updated ingredient aliases.
//
// Run this after seed-french-aliases.ts to retroactively fix ingredient matching
// without needing to re-scrape. Updates PriceSnapshot.ingredientId in place
// for any snapshots that were previously unmatched (ingredientId = null).
//
// Usage:
//   npx tsx scripts/rematch-products.ts

import { PrismaClient } from "@prisma/client"
import { matchIngredient } from "../lib/pricing/matching"
import type { IngredientRow } from "../lib/pricing/matching"

const prisma = new PrismaClient()

async function main() {
  console.log("\n[rematch-products] Loading data...\n")

  const products = await prisma.sourceCatalogProduct.findMany({
    select: {
      id: true,
      normalizedName: true,
      category: true,
      source: true,
    },
  })

  const ingredientRows = await prisma.ingredient.findMany({
    where: { isActive: true },
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      aliases: { select: { alias: true } },
    },
  })
  const ingredients: IngredientRow[] = ingredientRows

  console.log(`Products to process:  ${products.length}`)
  console.log(`Ingredients with aliases: ${ingredients.length}`)
  console.log(`Total aliases loaded: ${ingredients.reduce((s, i) => s + i.aliases.length, 0)}\n`)

  let improved = 0
  let alreadyGood = 0
  let stillUnmatched = 0

  for (const product of products) {
    const matchResult = matchIngredient({
      normalizedProductName: product.normalizedName,
      productCategory: product.category ?? undefined,
      ingredients,
      manualOverrides: [],
      sourceCatalogProductId: product.id,
    })

    // Skip category_fallback — too unreliable
    if (!matchResult || matchResult.matchType === "category_fallback") {
      stillUnmatched++
      continue
    }

    // Upsert the ProductIngredientMatch record
    await prisma.productIngredientMatch.upsert({
      where: {
        sourceCatalogProductId_ingredientId: {
          sourceCatalogProductId: product.id,
          ingredientId: matchResult.ingredientId,
        },
      },
      update: {
        matchType: matchResult.matchType,
        confidenceScore: matchResult.confidenceScore,
      },
      create: {
        sourceCatalogProductId: product.id,
        ingredientId: matchResult.ingredientId,
        matchType: matchResult.matchType,
        confidenceScore: matchResult.confidenceScore,
        isManualOverride: false,
      },
    })

    // Update snapshots for this product that are unmatched (null) OR pointing to
    // the wrong ingredient — handles both cleaned orphans and previously bad matches.
    const updated = await prisma.priceSnapshot.updateMany({
      where: {
        sourceCatalogProductId: product.id,
        NOT: { ingredientId: matchResult.ingredientId },
      },
      data: { ingredientId: matchResult.ingredientId },
    })

    if (updated.count > 0) {
      const ingredient = ingredients.find((i) => i.id === matchResult.ingredientId)
      console.log(
        `  ✓ ${product.normalizedName.slice(0, 38).padEnd(40)}` +
        `→ ${(ingredient?.name ?? matchResult.ingredientSlug).padEnd(20)}` +
        `(${matchResult.matchType}, ${updated.count} snapshot${updated.count > 1 ? "s" : ""})`
      )
      improved++
    } else {
      alreadyGood++
    }
  }

  console.log("\n" + "─".repeat(70))
  console.log(`  Products re-matched with snapshots fixed: ${improved}`)
  console.log(`  Products matched but no orphan snapshots:  ${alreadyGood}`)
  console.log(`  Products still unmatched (no good match):  ${stillUnmatched}`)
  console.log("─".repeat(70))
  console.log("\nDone. Re-run evaluate-baseline-accuracy.ts to see updated metrics.\n")

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
