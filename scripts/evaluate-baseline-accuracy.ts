// Baseline price accuracy evaluation — thesis experimental results.
//
// Ground truth:  PriceSnapshot rows from Aswak Assalam scraper.
//                Unit price is re-derived from (packagePrice ÷ packageQty in defaultUnit)
//                to avoid the raw unitPrice rate-conversion bug.
//
// Prediction:    BaselineIngredientPrice for the same ingredient + market tier.
//
// Methodology:   For each Aswak snapshot with valid package data, find the
//                corresponding baseline price and compute the prediction error.
//                Mirrors how the resolver falls back to baseline before any
//                fresh snapshot is available.
//
// Usage:
//   npx tsx scripts/evaluate-baseline-accuracy.ts

import { PrismaClient } from "@prisma/client"
import { convertToBaseUnits } from "../lib/pricing/normalize"

const prisma = new PrismaClient()

interface DataPoint {
  ingredientName: string
  category: string
  defaultUnit: string
  actualPrice: number      // MAD per defaultUnit — from Aswak snapshot
  baselinePrice: number    // MAD per defaultUnit — from BaselineIngredientPrice
  absError: number
  pctError: number
  signedError: number      // positive = baseline overestimates, negative = underestimates
  capturedAt: Date
  packageInfo: string      // e.g. "34.95 MAD / 500g"
}

async function main() {
  console.log("\n[evaluate-baseline-accuracy] Loading Aswak snapshot data...\n")

  const snapshots = await prisma.priceSnapshot.findMany({
    where: {
      source: "aswak_shop",
      ingredientId: { not: null },
      packageQuantityValue: { not: null, gt: 0 },
      packageQuantityUnit: { not: null },
      isPromo: false,
    },
    include: {
      ingredient: true,
    },
    orderBy: { capturedAt: "desc" },
  })

  console.log(`Found ${snapshots.length} Aswak snapshots with package data`)

  const baselines = await prisma.baselineIngredientPrice.findMany({
    where: { marketTier: "supermarket" },
  })
  const baselineMap = new Map(baselines.map((b) => [b.ingredientId, b]))

  console.log(`Found ${baselines.length} baseline prices\n`)

  const dataPoints: DataPoint[] = []
  let skipped = 0
  const skipReasons: Record<string, number> = {}

  // Use only the most recent snapshot per ingredient to avoid double-counting
  const latestByIngredient = new Map<string, typeof snapshots[0]>()
  for (const snap of snapshots) {
    if (!snap.ingredientId) continue
    const existing = latestByIngredient.get(snap.ingredientId)
    if (!existing || snap.capturedAt > existing.capturedAt) {
      latestByIngredient.set(snap.ingredientId, snap)
    }
  }

  for (const snap of latestByIngredient.values()) {
    const ing = snap.ingredient
    if (!ing || !snap.packageQuantityValue || !snap.packageQuantityUnit) {
      skipped++
      skipReasons["missing fields"] = (skipReasons["missing fields"] ?? 0) + 1
      continue
    }

    const defaultUnit = ing.defaultUnit
    const pkgUnit: string = snap.packageQuantityUnit
    const pkgQtyInDefaultUnit = convertToBaseUnits(snap.packageQuantityValue, pkgUnit, defaultUnit)

    if (!pkgQtyInDefaultUnit || pkgQtyInDefaultUnit <= 0) {
      skipped++
      const key = `no unit conversion (${pkgUnit}→${defaultUnit})`
      skipReasons[key] = (skipReasons[key] ?? 0) + 1
      continue
    }

    // Derive actual unit price correctly: MAD per defaultUnit
    const actualPrice = Number(snap.packagePrice) / pkgQtyInDefaultUnit

    // Sanity bounds: 0.5–5000 MAD per defaultUnit
    if (actualPrice < 0.5 || actualPrice > 5000) {
      skipped++
      skipReasons[`price out of bounds (${actualPrice.toFixed(2)} MAD/${defaultUnit})`] =
        (skipReasons[`price out of bounds (${actualPrice.toFixed(2)} MAD/${defaultUnit})`] ?? 0) + 1
      continue
    }

    const ingredientId: string = ing.id
    const baseline = baselineMap.get(ingredientId)
    if (!baseline || Number(baseline.unitPrice) <= 0) {
      skipped++
      skipReasons["no baseline price"] = (skipReasons["no baseline price"] ?? 0) + 1
      continue
    }

    const baselinePrice = Number(baseline.unitPrice)
    const absError = Math.abs(actualPrice - baselinePrice)
    const pctError = (absError / actualPrice) * 100
    const signedError = baselinePrice - actualPrice

    dataPoints.push({
      ingredientName: ing.name,
      category: ing.category,
      defaultUnit,
      actualPrice,
      baselinePrice,
      absError,
      pctError,
      signedError,
      capturedAt: snap.capturedAt,
      packageInfo: `${Number(snap.packagePrice).toFixed(2)} MAD / ${snap.packageQuantityValue}${pkgUnit}`,
    })
  }

  if (dataPoints.length === 0) {
    console.log(`No valid data points. Skipped ${skipped} snapshots:`)
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
  const within10 = dataPoints.filter((d) => d.pctError <= 10).length
  const within20 = dataPoints.filter((d) => d.pctError <= 20).length
  const within30 = dataPoints.filter((d) => d.pctError <= 30).length

  // ── By category ─────────────────────────────────────────────────────────────
  const byCategory = new Map<string, DataPoint[]>()
  for (const d of dataPoints) {
    if (!byCategory.has(d.category)) byCategory.set(d.category, [])
    byCategory.get(d.category)!.push(d)
  }

  // ── Print report ─────────────────────────────────────────────────────────────
  const L70 = "═".repeat(70)
  const D70 = "─".repeat(70)

  console.log("\n" + L70)
  console.log("  SOUFRA — BASELINE vs ASWAK PRICE ACCURACY REPORT")
  console.log(L70)
  console.log(`  Evaluation date:     ${new Date().toISOString().slice(0, 10)}`)
  console.log(`  Data points (n):     ${n}  (${skipped} snapshots skipped)`)
  console.log(`  Snapshot date range: 2026-04-26 → 2026-05-17`)
  console.log(`  Ground truth source: Aswak Assalam online catalog (scraped)`)
  console.log(`  Prediction source:   Soufra internal baseline price catalog`)
  console.log(`  Market tier:         supermarket`)
  console.log(D70)
  console.log("\n  OVERALL METRICS\n")
  console.log(`  MAE  (Mean Absolute Error):       ${mae.toFixed(2)} MAD`)
  console.log(`  MAPE (Mean Abs % Error):          ${mape.toFixed(1)}%`)
  console.log(`  RMSE:                             ${rmse.toFixed(2)} MAD`)
  console.log(`  Bias (+ = overestimate):          ${bias >= 0 ? "+" : ""}${bias.toFixed(2)} MAD`)
  console.log(`  Within ±10%:                      ${within10}/${n} (${pct(within10, n)}%)`)
  console.log(`  Within ±20%:                      ${within20}/${n} (${pct(within20, n)}%)`)
  console.log(`  Within ±30%:                      ${within30}/${n} (${pct(within30, n)}%)`)

  console.log("\n" + D70)
  console.log("\n  BY CATEGORY\n")
  console.log(
    "  " +
      "Category".padEnd(24) +
      "n".padEnd(5) +
      "MAE".padEnd(14) +
      "MAPE".padEnd(10) +
      "±20%".padEnd(10) +
      "Bias"
  )
  console.log("  " + "─".repeat(68))

  for (const [cat, pts] of [...byCategory.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const catMae = pts.reduce((s, d) => s + d.absError, 0) / pts.length
    const catMape = pts.reduce((s, d) => s + d.pctError, 0) / pts.length
    const catBias = pts.reduce((s, d) => s + d.signedError, 0) / pts.length
    const catW20 = pts.filter((d) => d.pctError <= 20).length
    console.log(
      "  " +
        cat.slice(0, 22).padEnd(24) +
        String(pts.length).padEnd(5) +
        `${catMae.toFixed(2)} MAD`.padEnd(14) +
        `${catMape.toFixed(1)}%`.padEnd(10) +
        `${pct(catW20, pts.length)}%`.padEnd(10) +
        `${catBias >= 0 ? "+" : ""}${catBias.toFixed(2)}`
    )
  }

  console.log("\n" + D70)
  console.log("\n  5 WORST PREDICTIONS (highest % error)\n")
  printTable([...dataPoints].sort((a, b) => b.pctError - a.pctError).slice(0, 5))

  console.log("\n  5 BEST PREDICTIONS (lowest % error)\n")
  printTable([...dataPoints].sort((a, b) => a.pctError - b.pctError).slice(0, 5))

  if (skipped > 0) {
    console.log("\n" + D70)
    console.log(`\n  SKIPPED SNAPSHOTS (${skipped} total)\n`)
    for (const [reason, count] of Object.entries(skipReasons)) {
      console.log(`  ${count}x — ${reason}`)
    }
  }

  console.log("\n" + L70 + "\n")

  await prisma.$disconnect()
}

function pct(n: number, total: number): string {
  return ((n / total) * 100).toFixed(0)
}

function printTable(pts: DataPoint[]) {
  console.log(
    "  " +
      "Ingredient".padEnd(22) +
      "Actual".padEnd(14) +
      "Baseline".padEnd(14) +
      "Error%".padEnd(10) +
      "Package"
  )
  console.log("  " + "─".repeat(70))
  for (const d of pts) {
    console.log(
      "  " +
        d.ingredientName.slice(0, 20).padEnd(22) +
        `${d.actualPrice.toFixed(2)}/${d.defaultUnit}`.padEnd(14) +
        `${d.baselinePrice.toFixed(2)}/${d.defaultUnit}`.padEnd(14) +
        `${d.pctError.toFixed(0)}%`.padEnd(10) +
        d.packageInfo
    )
  }
}

main().catch((err) => {
  console.error("Fatal:", err)
  process.exit(1)
})
