// One-shot: print raw snapshot data for specific slugs so we can see
// exactly what the scraper stored and why predictions are wrong.
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const SLUGS = ["tomatoes", "couscous", "rice", "milk"]

async function main() {
  for (const slug of SLUGS) {
    const ing = await prisma.ingredient.findUnique({ where: { slug } })
    if (!ing) { console.log(`\n${slug}: NOT FOUND IN DB`); continue }

    const snaps = await prisma.priceSnapshot.findMany({
      where: { ingredientId: ing.id, source: { not: "receipt" } },
      orderBy: { capturedAt: "desc" },
      take: 3,
    })

    console.log(`\n── ${slug} (defaultUnit: ${ing.defaultUnit}) ──────────────────`)
    for (const s of snaps) {
      console.log(`  packagePrice:   ${s.packagePrice}`)
      console.log(`  packageQty:     ${s.packageQuantityValue} ${s.packageQuantityUnit}`)
      console.log(`  unitPrice:      ${s.unitPrice}`)
      console.log(`  unitBaseUnit:   ${s.unitBaseUnit}`)
      console.log(`  capturedAt:     ${s.capturedAt.toISOString().slice(0,10)}`)
      console.log()
    }
  }
  await prisma.$disconnect()
}

main().catch(e => { console.error(e); process.exit(1) })
