// Adds French (and Moroccan-Arabic transliteration) aliases to all ingredients.
// This fixes the English/French language mismatch that caused the Aswak fuzzy
// matcher to fall back to category_fallback for 63/70 scraped products.
//
// Safe to re-run — uses createMany with skipDuplicates.
//
// Usage:
//   npx tsx scripts/seed-french-aliases.ts

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const ALIASES: Record<string, string[]> = {
  "chicken-breast": [
    "poulet", "blanc de poulet", "filet de poulet", "escalope de poulet",
    "poulet desossé", "poulet emincé", "filet poulet",
  ],
  "beef": [
    "boeuf", "viande hachée", "boeuf haché", "viande de boeuf",
    "boeuf émincé", "steak haché",
  ],
  "lamb": [
    "agneau", "mouton", "viande agneau", "gigot", "epaule agneau", "côtelette agneau",
  ],
  "sardines": [
    "sardines", "sardine fraîche", "sardine", "sardines fraîches",
  ],
  "white-fish": [
    "poisson blanc", "filet de poisson", "merlan", "tilapia",
    "cabillaud", "poisson", "daurade", "sole",
  ],
  "tuna-can": [
    "thon", "thon en boite", "thon à l'huile", "conserve de thon",
    "thon naturel", "thon en conserve",
  ],
  "eggs": [
    "oeufs", "oeuf", "oeufs frais", "boite d'oeufs", "oeufs de poule",
  ],
  "lentils": [
    "lentilles", "lentille", "lentille verte", "lentille rouge",
    "lentilles corail", "lentilles vertes",
  ],
  "chickpeas": [
    "pois chiches", "pois chiche", "pois chiches secs", "pois chiche sec",
  ],
  "white-beans": [
    "haricots blancs", "haricots", "haricot blanc", "flageolets",
    "haricots secs",
  ],
  "rice": [
    "riz", "riz long", "riz basmati", "riz complet", "riz blanc",
  ],
  "couscous": [
    "couscous", "gros couscous", "couscous moyen", "couscous fin",
    "couscous calibre moyen", "semoule",
  ],
  "pasta": [
    "pâtes", "macaroni", "spaghetti", "vermicelles", "pâtes alimentaires",
    "coquillettes", "penne", "fusilli",
  ],
  "oats": [
    "flocons d'avoine", "avoine", "muesli", "farine d'avoine", "porridge",
  ],
  "flour": [
    "farine", "farine de blé", "farine pain", "farine beldi",
    "farine luxor", "farine de luxe", "farine complete",
  ],
  "bread": [
    "pain", "baguette", "pain de mie", "khobz", "pain complet",
    "pain campagne", "pain beldi",
  ],
  "msemen": [
    "msemen", "meloui", "rghaif", "crêpes marocaines", "crepes marocaines",
  ],
  "milk": [
    "lait", "lait entier", "lait demi-écrémé", "lait uht", "lait frais",
  ],
  "yogurt": [
    "yaourt", "yahourt", "danone", "activia", "yawmi",
    "yaourt nature", "yaourt brassé",
  ],
  "jben": [
    "jben", "fromage blanc", "fromage frais", "petit suisse",
    "fromage à tartiner", "fromage a tartiner",
  ],
  "cheese": [
    "fromage", "gruyère", "cheddar", "gouda", "emmental",
    "fromage râpé", "fromage rápé", "fromage fondu",
  ],
  "butter": [
    "beurre", "beurre doux", "beurre centrale", "beurre de cuisine",
  ],
  "olive-oil": [
    "huile d'olive", "huile olive", "huile vierge",
    "huile d'olive extra vierge",
  ],
  "vegetable-oil": [
    "huile végétale", "huile de tournesol", "huile de table", "huile",
    "huile raffinée",
  ],
  "tomatoes": [
    "tomates", "tomate", "tomates cerises", "tomate fraîche",
    "tomates rondes", "tomates grappe",
  ],
  "onions": [
    "oignons", "oignon", "oignons secs", "oignon jaune", "oignon rouge",
  ],
  "potatoes": [
    "pommes de terre", "pomme de terre", "patates",
    "pommes de terre nouvelles", "pomme de terre agria",
  ],
  "carrots": [
    "carottes", "carotte", "carotte fraîche", "carottes fraîches",
  ],
  "zucchini": [
    "courgette", "courgettes", "courgette verte",
  ],
  "eggplant": [
    "aubergine", "aubergines", "aubergine violette", "aubergine ronde",
  ],
  "bell-peppers": [
    "poivron", "poivrons", "piment doux", "poivron rouge",
    "poivron vert", "poivron jaune",
  ],
  "spinach": [
    "épinards", "epinards", "épinard", "epinard", "épinards frais",
  ],
  "lettuce": [
    "laitue", "salade verte", "salade", "frisée", "batavia",
    "laitue iceberg",
  ],
  "cucumber": [
    "concombre", "concombres", "concombre long", "concombre marocain",
  ],
  "garlic": [
    "ail", "gousse d'ail", "ail frais", "ail sec", "tête d'ail", "ail rose",
  ],
  "lemons": [
    "citrons", "citron", "citron jaune", "citron vert", "citrons jaunes",
  ],
  "bananas": [
    "bananes", "banane", "banane mûre", "banane import",
  ],
  "apples": [
    "pommes", "pomme", "pomme golden", "pomme royal gala", "pomme fuji",
  ],
  "oranges": [
    "oranges", "orange", "orange marocaine", "clémentine", "clementine",
  ],
  "dates": [
    "dattes", "datte", "dattes medjoul", "dattes deglet", "dattes nour",
  ],
  "olives": [
    "olives", "olive", "olives noires", "olives vertes", "olives marinées",
  ],
  "tomato-paste": [
    "concentré de tomate", "double concentré", "purée de tomate",
    "concentré tomate", "sauce tomate", "coulis de tomate",
  ],
  "harissa": [
    "harissa", "harissa forte", "harissa douce", "harissa maison",
  ],
  "ras-el-hanout": [
    "ras el hanout", "ras-el-hanout", "épices marocaines", "epices marocaines",
    "mélange d'épices",
  ],
  "cumin": [
    "cumin", "graines de cumin", "cumin en poudre", "cumin moulu",
  ],
  "paprika": [
    "paprika", "paprika doux", "piment paprika", "paprika fumé",
  ],
  "black-pepper": [
    "poivre noir", "poivre", "poivre en grains", "poivre moulu",
  ],
  "cinnamon": [
    "cannelle", "cannelle en poudre", "cannelle bâton", "cannelle moulue",
  ],
  "ginger": [
    "gingembre", "gingembre en poudre", "gingembre frais", "gingembre moulu",
  ],
  "parsley": [
    "persil", "persil plat", "persil frisé", "bouquet de persil",
  ],
  "cilantro": [
    "coriandre", "coriandre fraîche", "coriandre en poudre",
    "bouquet de coriandre",
  ],
  "mint": [
    "menthe", "menthe fraîche", "bouquet de menthe", "menthe verte",
  ],
  "honey": [
    "miel", "miel pur", "miel toutes fleurs", "miel d'acacia",
    "miel de fleurs",
  ],
  "preserved-lemons": [
    "citrons confits", "citron confit", "citrons marinés",
    "citrons beldi", "citron beldi",
  ],
}

async function main() {
  console.log("\n[seed-french-aliases] Starting...\n")

  const ingredients = await prisma.ingredient.findMany({
    select: { id: true, slug: true, name: true },
  })

  const slugToId = new Map(ingredients.map((i) => [i.slug, i.id]))

  let totalAdded = 0
  let notFound = 0

  for (const [slug, aliases] of Object.entries(ALIASES)) {
    const ingredientId = slugToId.get(slug)
    if (!ingredientId) {
      console.warn(`  WARNING: ingredient slug "${slug}" not found in DB — skipping`)
      notFound++
      continue
    }

    const result = await prisma.ingredientAlias.createMany({
      data: aliases.map((alias) => ({ ingredientId, alias })),
      skipDuplicates: true,
    })

    console.log(`  ${ingredients.find(i => i.slug === slug)?.name.padEnd(22)} +${result.count} aliases`)
    totalAdded += result.count
  }

  console.log(`\nDone. Added ${totalAdded} new aliases across ${Object.keys(ALIASES).length - notFound} ingredients.`)
  if (notFound > 0) console.log(`${notFound} slugs not found in DB.`)
  console.log()

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
