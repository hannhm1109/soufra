// Scheduled price-sync cron endpoint.
//
// Recommended schedule (Vercel Cron or external scheduler):
//   - Full sync:  0 3 * * *    (nightly at 03:00 UTC)
//   - Produce/meat only:  0 7 * * 1-6  (weekday mornings, optional)
//
// vercel.json entry:
//   { "path": "/api/cron/price-sync", "schedule": "0 3 * * *" }
//
// The endpoint is idempotent — safe to retry on failure.
// On source failure, it logs and continues; grocery generation is unaffected
// because it falls back to existing snapshots and the baseline catalog.

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { aswakAdapter } from "@/lib/pricing/sources/aswak"
import { seedBaselinePrices } from "@/lib/pricing/sources/baseline"
import { ingestAdapter, pruneStaleSnapshots } from "@/lib/pricing/ingest"
import type { IngestResult } from "@/lib/pricing/ingest"

export const maxDuration = 300 // 5-min Vercel limit for cron functions

function isAuthorized(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return process.env.NODE_ENV !== "production"
  const auth = req.headers.get("authorization")
  return auth === `Bearer ${cronSecret}`
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startedAt = new Date()
  const results: {
    baseline?: { seeded: number; skipped: number; errors: number }
    adapters: IngestResult[]
    pruned?: number
    errors: string[]
  } = { adapters: [], errors: [] }

  // ── 1. Seed / refresh baseline prices ────────────────────────────────────
  try {
    results.baseline = await seedBaselinePrices()
    console.log("[price-sync] baseline seeded:", results.baseline)
  } catch (err) {
    const msg = `baseline seed failed: ${(err as Error).message}`
    console.error("[price-sync]", msg)
    results.errors.push(msg)
    // Continue — grocery generation still works with old baseline
  }

  // ── 2. Run catalog adapters ───────────────────────────────────────────────
  // Add more adapters here as new sources are built (aswak_catalog_pdf, etc.)
  const adapters = [aswakAdapter]

  for (const adapter of adapters) {
    try {
      const result = await ingestAdapter(adapter)
      results.adapters.push(result)
      console.log(`[price-sync] ${adapter.source} done:`, result)
    } catch (err) {
      const msg = `${adapter.source} adapter failed: ${(err as Error).message}`
      console.error("[price-sync]", msg)
      results.errors.push(msg)
      results.adapters.push({
        adapter: adapter.source,
        pagesProcessed: 0,
        productsFound: 0,
        productsIngested: 0,
        matchesCreated: 0,
        snapshotsCreated: 0,
        errors: 1,
        durationMs: 0,
      })
    }
  }

  // ── 3. Prune stale snapshots ──────────────────────────────────────────────
  try {
    results.pruned = await pruneStaleSnapshots()
    console.log(`[price-sync] pruned ${results.pruned} stale snapshots`)
  } catch (err) {
    const msg = `prune failed: ${(err as Error).message}`
    console.error("[price-sync]", msg)
    results.errors.push(msg)
  }

  const finishedAt = new Date()
  const totalSnapshots = results.adapters.reduce((s, r) => s + r.snapshotsCreated, 0)
  const totalProductsFound = results.adapters.reduce((s, r) => s + r.productsFound, 0)
  const totalErrors = results.adapters.reduce((s, r) => s + r.errors, 0) + results.errors.length

  // Write audit log — awaited before response so Vercel doesn't kill it mid-flight
  try {
    await prisma.cronLog.create({
      data: {
        job: "price-sync",
        startedAt,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        success: totalErrors === 0,
        baselineSeeded: results.baseline?.seeded ?? 0,
        productsFound: totalProductsFound,
        snapshotsCreated: totalSnapshots,
        errors: totalErrors,
        warnings: results.errors,
        metadata: { adapters: results.adapters.map(a => a.adapter) },
      },
    })
  } catch (err) {
    console.error("[price-sync] cronLog write failed:", (err as Error).message)
  }

  return NextResponse.json({
    success: totalErrors === 0,
    startedAt,
    finishedAt,
    baseline: results.baseline,
    adapters: results.adapters,
    pruned: results.pruned,
    summary: {
      totalSnapshotsCreated: totalSnapshots,
      totalErrors,
      warnings: results.errors,
    },
  })
}
