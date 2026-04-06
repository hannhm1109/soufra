import { PrismaClient } from "@prisma/client"
import curatedCatalog from "../lib/data/moroccan-ingredient-prices.json" with { type: "json" }

const prisma = new PrismaClient()

async function main() {
  for (const ingredient of curatedCatalog) {
    const savedIngredient = await prisma.ingredient.upsert({
      where: { slug: ingredient.slug },
      update: {
        name: ingredient.name,
        category: ingredient.category,
        defaultUnit: ingredient.defaultUnit,
        caloriesPer100g: ingredient.caloriesPer100g ?? null,
        proteinPer100g: ingredient.proteinPer100g ?? null,
        carbsPer100g: ingredient.carbsPer100g ?? null,
        fatsPer100g: ingredient.fatsPer100g ?? null,
        isSeasonal: ingredient.isSeasonal ?? false,
      },
      create: {
        slug: ingredient.slug,
        name: ingredient.name,
        category: ingredient.category,
        defaultUnit: ingredient.defaultUnit,
        caloriesPer100g: ingredient.caloriesPer100g ?? null,
        proteinPer100g: ingredient.proteinPer100g ?? null,
        carbsPer100g: ingredient.carbsPer100g ?? null,
        fatsPer100g: ingredient.fatsPer100g ?? null,
        isSeasonal: ingredient.isSeasonal ?? false,
      },
    })

    await prisma.ingredientAlias.deleteMany({
      where: { ingredientId: savedIngredient.id },
    })

    await prisma.pricePoint.deleteMany({
      where: {
        ingredientId: savedIngredient.id,
        sourceType: "curated",
      },
    })

    await prisma.ingredientPriceSnapshot.deleteMany({
      where: { ingredientId: savedIngredient.id },
    })

    if (ingredient.aliases.length > 0) {
      await prisma.ingredientAlias.createMany({
        data: ingredient.aliases.map((alias) => ({
          ingredientId: savedIngredient.id,
          alias: alias.toLowerCase().trim(),
        })),
        skipDuplicates: true,
      })
    }

    for (const tier of ["souk", "supermarket", "premium"]) {
      const priceMad = ingredient.tierPrices[tier]

      await prisma.pricePoint.create({
        data: {
          ingredientId: savedIngredient.id,
          sourceType: "curated",
          sourceName: "Soufra curated Moroccan market baseline",
          city: null,
          tier,
          unit: ingredient.defaultUnit,
          priceMad,
          confidence: 0.72,
          capturedAt: new Date(),
          notes: "Seeded from local Moroccan ingredient baseline",
        },
      })

      await prisma.ingredientPriceSnapshot.create({
        data: {
          ingredientId: savedIngredient.id,
          city: null,
          tier,
          referencePriceMad: priceMad,
          lowPriceMad: ingredient.tierPrices.souk,
          highPriceMad: ingredient.tierPrices.premium,
          confidence: 0.72,
          basedOnPoints: 1,
        },
      })
    }
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (error) => {
    console.error(error)
    await prisma.$disconnect()
    process.exit(1)
  })
