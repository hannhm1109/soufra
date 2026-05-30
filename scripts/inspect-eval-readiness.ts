// One-off DB inspection: what data is available for the price-accuracy evaluation?
//
//   npx tsx scripts/inspect-eval-readiness.ts
//
// Reports counts of ingredients, baseline prices, scraped snapshots, receipts,
// receipt-line ground-truth rows, and the most recent cron runs. Use this to
// understand whether the evaluation will compare against scraped snapshots or
// fall back to the curated baseline catalog.

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const [
    ingredientCount,
    baselineCount,
    snapshotCount,
    snapshotBySource,
    receiptCount,
    receiptLineCount,
    receiptLinesWithIngredient,
    recentCron,
    latestSnapshot,
  ] = await Promise.all([
    prisma.ingredient.count(),
    prisma.baselineIngredientPrice.count(),
    prisma.priceSnapshot.count(),
    prisma.priceSnapshot.groupBy({ by: ["source"], _count: { _all: true } }),
    prisma.receipt.count(),
    prisma.receiptLinePrice.count(),
    prisma.receiptLinePrice.count({ where: { ingredientId: { not: null }, totalPrice: { not: null, gt: 0 } } }),
    prisma.cronLog.findMany({ orderBy: { startedAt: "desc" }, take: 3 }),
    prisma.priceSnapshot.findFirst({ orderBy: { capturedAt: "desc" }, select: { capturedAt: true, source: true } }),
  ])

  console.log("\n══════════════════════════════════════════════════════════════════════")
  console.log("  SOUFRA — EVAL READINESS REPORT")
  console.log("══════════════════════════════════════════════════════════════════════\n")

  console.log("  Predictor data (what the resolver uses to predict prices)")
  console.log("  ──────────────────────────────────────────────────────────────────")
  console.log(`    Ingredients in catalog:           ${ingredientCount}`)
  console.log(`    BaselineIngredientPrice rows:     ${baselineCount}`)
  console.log(`    PriceSnapshot rows (total):       ${snapshotCount}`)
  for (const row of snapshotBySource) {
    console.log(`      └─ source=${String(row.source).padEnd(20)} ${row._count._all}`)
  }
  if (latestSnapshot) {
    console.log(`    Most recent snapshot:             ${latestSnapshot.capturedAt.toISOString().slice(0, 10)} (${latestSnapshot.source})`)
  }
  console.log()

  console.log("  Ground-truth data (what the evaluation compares against)")
  console.log("  ──────────────────────────────────────────────────────────────────")
  console.log(`    Receipts ingested:                ${receiptCount}`)
  console.log(`    ReceiptLinePrice rows (total):    ${receiptLineCount}`)
  console.log(`    └─ with matched ingredient+price: ${receiptLinesWithIngredient}  ← becomes eval data points`)
  console.log()

  console.log("  Recent cron runs")
  console.log("  ──────────────────────────────────────────────────────────────────")
  if (recentCron.length === 0) {
    console.log("    No cron runs logged yet.")
  } else {
    for (const log of recentCron) {
      const date = log.startedAt.toISOString().slice(0, 16).replace("T", " ")
      console.log(`    ${date} UTC  ${log.job.padEnd(15)} ${log.success ? "✓" : "✗"}  ${log.snapshotsCreated} snapshots, ${log.errors} errors`)
    }
  }
  console.log()

  console.log("  Verdict")
  console.log("  ──────────────────────────────────────────────────────────────────")
  if (receiptLinesWithIngredient > 0) {
    console.log(`    ✓ Eval will run on ${receiptLinesWithIngredient} data points.`)
  } else {
    console.log("    ✗ No eval data yet — populate ReceiptLinePrice rows first.")
  }
  if (snapshotCount === 0) {
    console.log("    ⚠ No PriceSnapshot data — the eval will compare against the BASELINE catalog only.")
    console.log("      To test the full scraped-price predictor, run the price-sync cron at least once.")
  } else {
    const scrapeCount = snapshotBySource.find((r) => r.source === "aswak_shop")?._count._all ?? 0
    console.log(`    ${scrapeCount > 0 ? "✓" : "⚠"} ${scrapeCount} scraped snapshots available as predictions.`)
  }

  console.log()
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
