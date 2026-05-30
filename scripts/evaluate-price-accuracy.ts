// Price accuracy evaluation — thesis experimental results.
//
// Compares the resolver's predicted unit price against what was actually paid
// (ground truth from receipts ingested via POST /api/receipts/upload). Outputs
// MAE, MAPE, and per-category breakdown suitable for a thesis results section.
//
// Usage:
//   npx tsx scripts/evaluate-price-accuracy.ts
//
// Requires at least a few ingested receipts with matched ingredients.
// More receipts → more reliable metrics. Even 20–30 data points is enough
// for a master's thesis evaluation.

import { PrismaClient } from "@prisma/client"
import { convertToBaseUnits } from "../lib/pricing/normalize"
import { selectSnapshotUnitPrice } from "../lib/pricing/resolve"

const prisma = new PrismaClient()

interface DataPoint {
  ingredientName: string
  category: string
  actualUnitPrice: number
  predictedUnitPrice: number
  predictionSource: string
  confidenceLevel: string
  purchasedAt: Date
  absError: number
  pctError: number
  signedError: number // positive = overestimate, negative = underestimate
}

async function main() {
  console.log("\n[evaluate-price-accuracy] Loading receipt data...\n")

  // Load all receipt lines that have: matched ingredient + total price + quantity
  const receiptLines = await prisma.receiptLinePrice.findMany({
    where: {
      ingredientId: { not: null },
      totalPrice: { not: null, gt: 0 },
      quantityValue: { not: null, gt: 0 },
      quantityUnit: { not: null },
    },
    include: { ingredient: true },
    orderBy: { purchasedAt: "asc" },
  })

  console.log(`Found ${receiptLines.length} receipt lines with ingredient + price + quantity`)

  if (receiptLines.length === 0) {
    console.log("\nNo evaluation data yet.")
    console.log("How to get data: ingest receipts via POST /api/receipts/upload (GPT-4o-mini Vision OCR).")
    console.log("Each ingested receipt line with a confident ingredient match becomes one data point.\n")
    process.exit(0)
  }

  const dataPoints: DataPoint[] = []
  let skipped = 0
  const skipReasons: Record<string, number> = {}

  for (const line of receiptLines) {
    if (!line.ingredient || !line.totalPrice || !line.quantityValue || !line.quantityUnit) {
      skipped++
      skipReasons["missing fields"] = (skipReasons["missing fields"] ?? 0) + 1
      continue
    }

    // Convert receipt quantity to ingredient's default unit
    const qtyInDefaultUnit = convertToBaseUnits(
      line.quantityValue,
      line.quantityUnit,
      line.ingredient.defaultUnit
    )
    if (!qtyInDefaultUnit || qtyInDefaultUnit <= 0) {
      skipped++
      skipReasons[`no unit conversion (${line.quantityUnit}→${line.ingredient.defaultUnit})`] =
        (skipReasons[`no unit conversion (${line.quantityUnit}→${line.ingredient.defaultUnit})`] ?? 0) + 1
      continue
    }

    const actualUnitPrice = Number(line.totalPrice) / qtyInDefaultUnit

    // Sanity check — skip obvious outliers (price < 0.1 MAD or > 10000 MAD per unit)
    if (actualUnitPrice < 0.1 || actualUnitPrice > 10000) {
      skipped++
      skipReasons["price out of bounds"] = (skipReasons["price out of bounds"] ?? 0) + 1
      continue
    }

    // Find all recent non-receipt snapshots for this ingredient.
    // Apply the same selectSnapshotUnitPrice + minimum-price logic the resolver
    // uses, so the eval measures what users actually see (not raw DB values).
    const snapshots = await prisma.priceSnapshot.findMany({
      where: {
        ingredientId: line.ingredientId!,
        source: { not: "receipt" },
        capturedAt: { lte: line.purchasedAt },
        isPromo: false,
      },
      orderBy: { capturedAt: "desc" },
      take: 20,
    })

    let predictedUnitPrice: number | null = null
    let predictionSource = "none"
    let confidenceLevel = "none"

    // Pick the lowest plausible unit price across all recent snapshots.
    // Mirrors selectBestSnapshot: for a budget-planning app the most affordable
    // available unit price is the most useful prediction.
    for (const snapshot of snapshots) {
      const selected = selectSnapshotUnitPrice({
        rawUnitPrice: snapshot.unitPrice ? Number(snapshot.unitPrice) : null,
        rawBaseUnit: snapshot.unitBaseUnit,
        rawPackagePrice: Number(snapshot.packagePrice),
        packageQty: snapshot.packageQuantityValue,
        packageUnit: snapshot.packageQuantityUnit,
        defaultUnit: line.ingredient.defaultUnit,
      })
      if (selected !== null && (predictedUnitPrice === null || selected < predictedUnitPrice)) {
        predictedUnitPrice = selected
        predictionSource = String(snapshot.source)
        confidenceLevel = snapshot.confidenceLevel
      }
    }

    // Fall back to baseline catalog price
    if (!predictedUnitPrice) {
      const baseline = await prisma.baselineIngredientPrice.findFirst({
        where: {
          ingredientId: line.ingredientId!,
          marketTier: line.marketTier ?? "supermarket",
        },
        orderBy: { updatedAt: "desc" },
      })
      if (baseline) {
        predictedUnitPrice = Number(baseline.unitPrice)
        predictionSource = "baseline"
        confidenceLevel = "low"
      }
    }

    if (!predictedUnitPrice) {
      skipped++
      skipReasons["no prediction available"] = (skipReasons["no prediction available"] ?? 0) + 1
      continue
    }

    const absError = Math.abs(actualUnitPrice - predictedUnitPrice)
    const pctError = (absError / actualUnitPrice) * 100
    const signedError = predictedUnitPrice - actualUnitPrice

    dataPoints.push({
      ingredientName: line.ingredient.name,
      category: line.ingredient.category,
      actualUnitPrice,
      predictedUnitPrice,
      predictionSource,
      confidenceLevel,
      purchasedAt: line.purchasedAt,
      absError,
      pctError,
      signedError,
    })
  }

  if (dataPoints.length === 0) {
    console.log(`\nAll ${receiptLines.length} lines were skipped. Reasons:`)
    for (const [reason, count] of Object.entries(skipReasons)) {
      console.log(`  ${count}x — ${reason}`)
    }
    process.exit(0)
  }

  // ── Overall metrics ─────────────────────────────────────────────────────────
  const n = dataPoints.length
  const mae = dataPoints.reduce((s, d) => s + d.absError, 0) / n
  const mape = dataPoints.reduce((s, d) => s + d.pctError, 0) / n
  const bias = dataPoints.reduce((s, d) => s + d.signedError, 0) / n
  const rmse = Math.sqrt(dataPoints.reduce((s, d) => s + d.absError ** 2, 0) / n)
  const within10 = dataPoints.filter(d => d.pctError <= 10).length
  const within20 = dataPoints.filter(d => d.pctError <= 20).length
  const within30 = dataPoints.filter(d => d.pctError <= 30).length

  // ── By category ─────────────────────────────────────────────────────────────
  const byCategory = new Map<string, DataPoint[]>()
  for (const d of dataPoints) {
    if (!byCategory.has(d.category)) byCategory.set(d.category, [])
    byCategory.get(d.category)!.push(d)
  }

  // ── By confidence level ──────────────────────────────────────────────────────
  const byConfidence = new Map<string, DataPoint[]>()
  for (const d of dataPoints) {
    const key = d.predictionSource === "baseline" ? "baseline" : d.confidenceLevel
    if (!byConfidence.has(key)) byConfidence.set(key, [])
    byConfidence.get(key)!.push(d)
  }

  // ── By prediction source ─────────────────────────────────────────────────────
  const bySource = new Map<string, number>()
  for (const d of dataPoints) {
    bySource.set(d.predictionSource, (bySource.get(d.predictionSource) ?? 0) + 1)
  }

  // ── Print report ─────────────────────────────────────────────────────────────
  const line70 = "═".repeat(70)
  const dash70 = "─".repeat(70)

  console.log("\n" + line70)
  console.log("  SOUFRA — PRICE ACCURACY EVALUATION REPORT")
  console.log(line70)
  console.log(`  Evaluation date:    ${new Date().toISOString().slice(0, 10)}`)
  console.log(`  Data points (n):    ${n}  (${skipped} skipped)`)
  console.log(`  Receipt date range: ${dataPoints[0].purchasedAt.toISOString().slice(0, 10)} → ${dataPoints[n - 1].purchasedAt.toISOString().slice(0, 10)}`)
  console.log(dash70)
  console.log("\n  OVERALL METRICS\n")
  console.log(`  MAE  (Mean Absolute Error):       ${mae.toFixed(2)} MAD`)
  console.log(`  MAPE (Mean Abs % Error):          ${mape.toFixed(1)}%`)
  console.log(`  RMSE:                             ${rmse.toFixed(2)} MAD`)
  console.log(`  Bias (+ = overestimate):          ${bias >= 0 ? "+" : ""}${bias.toFixed(2)} MAD`)
  console.log(`  Within ±10%:                      ${within10}/${n} (${pct(within10, n)}%)`)
  console.log(`  Within ±20%:                      ${within20}/${n} (${pct(within20, n)}%)`)
  console.log(`  Within ±30%:                      ${within30}/${n} (${pct(within30, n)}%)`)

  console.log("\n" + dash70)
  console.log("\n  BY CATEGORY\n")
  console.log(
    "  " + "Category".padEnd(24) +
    "n".padEnd(5) +
    "MAE".padEnd(12) +
    "MAPE".padEnd(10) +
    "±20%".padEnd(10) +
    "Bias"
  )
  console.log("  " + "─".repeat(66))

  for (const [cat, pts] of [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const catMae = pts.reduce((s, d) => s + d.absError, 0) / pts.length
    const catMape = pts.reduce((s, d) => s + d.pctError, 0) / pts.length
    const catBias = pts.reduce((s, d) => s + d.signedError, 0) / pts.length
    const catW20 = pts.filter(d => d.pctError <= 20).length
    console.log(
      "  " + cat.slice(0, 22).padEnd(24) +
      String(pts.length).padEnd(5) +
      `${catMae.toFixed(2)} MAD`.padEnd(12) +
      `${catMape.toFixed(1)}%`.padEnd(10) +
      `${pct(catW20, pts.length)}%`.padEnd(10) +
      `${catBias >= 0 ? "+" : ""}${catBias.toFixed(2)}`
    )
  }

  console.log("\n" + dash70)
  console.log("\n  BY CONFIDENCE LEVEL\n")
  console.log(
    "  " + "Level".padEnd(20) +
    "n".padEnd(5) +
    "MAE".padEnd(12) +
    "MAPE".padEnd(10) +
    "±20%"
  )
  console.log("  " + "─".repeat(52))

  for (const [level, pts] of [...byConfidence.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const lvlMae = pts.reduce((s, d) => s + d.absError, 0) / pts.length
    const lvlMape = pts.reduce((s, d) => s + d.pctError, 0) / pts.length
    const lvlW20 = pts.filter(d => d.pctError <= 20).length
    console.log(
      "  " + level.padEnd(20) +
      String(pts.length).padEnd(5) +
      `${lvlMae.toFixed(2)} MAD`.padEnd(12) +
      `${lvlMape.toFixed(1)}%`.padEnd(10) +
      `${pct(lvlW20, pts.length)}%`
    )
  }

  console.log("\n" + dash70)
  console.log("\n  PREDICTION SOURCE BREAKDOWN\n")
  for (const [src, count] of [...bySource.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${src.padEnd(38)} ${count} (${pct(count, n)}%)`)
  }

  console.log("\n" + dash70)
  console.log("\n  5 WORST PREDICTIONS (highest % error)\n")
  printIngredientTable(
    [...dataPoints].sort((a, b) => b.pctError - a.pctError).slice(0, 5)
  )

  console.log("\n  5 BEST PREDICTIONS (lowest % error)\n")
  printIngredientTable(
    [...dataPoints].sort((a, b) => a.pctError - b.pctError).slice(0, 5)
  )

  if (skipped > 0) {
    console.log("\n" + dash70)
    console.log(`\n  SKIPPED LINES (${skipped} total)\n`)
    for (const [reason, count] of Object.entries(skipReasons)) {
      console.log(`  ${count}x — ${reason}`)
    }
  }

  console.log("\n" + line70 + "\n")

  await prisma.$disconnect()
}

function pct(n: number, total: number): string {
  return ((n / total) * 100).toFixed(0)
}

function printIngredientTable(pts: DataPoint[]) {
  console.log(
    "  " + "Ingredient".padEnd(28) +
    "Actual".padEnd(12) +
    "Predicted".padEnd(12) +
    "Error%".padEnd(10) +
    "Source"
  )
  console.log("  " + "─".repeat(68))
  for (const d of pts) {
    console.log(
      "  " + d.ingredientName.slice(0, 26).padEnd(28) +
      `${d.actualUnitPrice.toFixed(2)} MAD`.padEnd(12) +
      `${d.predictedUnitPrice.toFixed(2)} MAD`.padEnd(12) +
      `${d.pctError.toFixed(0)}%`.padEnd(10) +
      d.predictionSource
    )
  }
}

main().catch(err => {
  console.error("Fatal:", err)
  process.exit(1)
})
