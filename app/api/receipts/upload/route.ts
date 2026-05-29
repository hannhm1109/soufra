import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { matchIngredient, type IngredientRow } from "@/lib/pricing/matching"
import { parseQuantity, UNIT_NORMALIZE } from "@/lib/pricing/normalize"
import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Only learn a price from a receipt line when the ingredient match is confident.
// Below this we keep the line for the user's records but don't pollute pricing data.
const MIN_MATCH_CONFIDENCE = 0.6

interface ParsedItem {
  name: string
  quantity?: string
  unit?: string
  price?: number
}

interface ParsedReceipt {
  storeName?: string
  total?: number
  purchasedAt?: string
  items: ParsedItem[]
}

// Parse a receipt date string, rejecting garbage and future dates.
// Falls back to "now" so an unreadable date never blocks the upload.
function parseReceiptDate(raw: unknown): Date {
  if (typeof raw === "string" && raw.trim()) {
    const parsed = new Date(raw.trim())
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() >= 2015 && parsed <= tomorrow) {
      return parsed
    }
  }
  return new Date()
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { imageBase64, mimeType } = await req.json()
  if (!imageBase64 || !mimeType) {
    return NextResponse.json({ error: "Image required" }, { status: 400 })
  }

  // ── Call GPT-4o Vision ────────────────────────────────────────
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}`, detail: "high" },
          },
          {
            type: "text",
            text: `You are a receipt parser for Moroccan grocery stores. Extract all items from this receipt image.

Return ONLY valid JSON with this exact structure:
{
  "storeName": "store name or null",
  "total": total amount in MAD as number or null,
  "purchasedAt": "purchase date in YYYY-MM-DD format or null",
  "items": [
    {
      "name": "item name in English",
      "quantity": "quantity string e.g. '2', '500g', '1kg'",
      "unit": "unit e.g. 'kg', 'g', 'piece', 'liter' or null",
      "price": price in MAD as number or null
    }
  ]
}

Rules:
- Translate Arabic or French item names to English
- Normalize item names (e.g. "POULET" → "chicken", "TOMATES" → "tomatoes")
- If you cannot read a price clearly, set it to null
- For purchasedAt, read the transaction date printed on the receipt; if absent or unreadable, set it to null
- Include ALL line items you can see
- Do not include totals, subtotals, taxes, or discounts as items`,
          },
        ],
      },
    ],
    max_tokens: 2000,
    response_format: { type: "json_object" },
  })

  const raw = completion.choices[0].message.content
  if (!raw) return NextResponse.json({ error: "No response from AI" }, { status: 500 })

  let parsed: ParsedReceipt
  try {
    parsed = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "Failed to parse receipt" }, { status: 500 })
  }

  const items = Array.isArray(parsed.items) ? parsed.items : []
  const purchasedAt = parseReceiptDate(parsed.purchasedAt)

  // ── Save receipt to DB ────────────────────────────────────────
  const receipt = await prisma.receipt.create({
    data: {
      userId: user.id,
      storeName: parsed.storeName ?? null,
      city: user.city ?? null,
      totalMad: parsed.total ?? null,
      purchasedAt,
      status: "reviewed",
      items: {
        create: items.map(item => ({
          rawName: item.name,
          normalizedName: item.name.toLowerCase().trim(),
          quantityText: item.quantity ?? null,
          unit: item.unit ?? null,
          priceMad: item.price ?? null,
          confidence: item.price != null ? 0.9 : 0.5,
        })),
      },
    },
    include: { items: true },
  })

  // ── Price learning: match items to ingredients ────────────────
  let pricesLearned = 0
  const marketTier = user.marketTier ?? "supermarket"
  const city = user.city ?? "Casablanca"

  // Load the ingredient catalog once and reuse the same 6-step matcher the
  // store-scrape pipeline uses, instead of a loose substring query that can
  // mis-link "chicken" → "chicken-breast" and corrupt the learned prices.
  const ingredientRows: Array<IngredientRow & { defaultUnit: string }> =
    await prisma.ingredient.findMany({
      select: { id: true, slug: true, name: true, category: true, defaultUnit: true, aliases: { select: { alias: true } } },
    })

  for (const receiptItem of receipt.items) {
    if (!receiptItem.priceMad || !receiptItem.normalizedName) continue

    const match = matchIngredient({
      normalizedProductName: receiptItem.normalizedName,
      ingredients: ingredientRows,
    })

    if (match && match.confidenceScore >= MIN_MATCH_CONFIDENCE) {
      const ingredient = ingredientRows.find((i) => i.id === match.ingredientId)!
      // Link receipt item to ingredient
      await prisma.receiptItem.update({
        where: { id: receiptItem.id },
        data: { ingredientId: ingredient.id },
      })

      // Legacy price point (kept for backward compatibility)
      await prisma.pricePoint.create({
        data: {
          ingredientId: ingredient.id,
          sourceType: "receipt",
          sourceName: parsed.storeName ?? "receipt",
          city,
          tier: marketTier as "souk" | "supermarket" | "premium",
          unit: receiptItem.unit ?? ingredient.defaultUnit,
          priceMad: receiptItem.priceMad,
          confidence: 0.85,
          capturedAt: purchasedAt,
        },
      })

      // Parse quantity so the resolver can derive unitPrice
      const parsedQty = receiptItem.quantityText ? parseQuantity(receiptItem.quantityText) : null
      const qtyValue = parsedQty?.value ?? null
      const qtyUnit = parsedQty?.unit
        ? (UNIT_NORMALIZE[parsedQty.unit] ?? parsedQty.unit)
        : (receiptItem.unit ?? null)

      // New: write a PriceSnapshot so the v2 resolver picks up this receipt price
      await prisma.priceSnapshot.create({
        data: {
          ingredientId: ingredient.id,
          source: "receipt",
          city,
          marketTier: marketTier as "souk" | "supermarket" | "premium",
          packagePrice: receiptItem.priceMad,
          packageQuantityValue: qtyValue,
          packageQuantityUnit: qtyUnit,
          // unitPrice is derived by the resolver from packagePrice / packageQty
          isPromo: false,
          inStock: true,
          confidenceLevel: "medium",
          confidenceScore: 0.82,
          capturedAt: purchasedAt,
          // Expires after 60 days — receipt data goes stale
          expiresAt: new Date(purchasedAt.getTime() + 60 * 24 * 60 * 60 * 1000),
          metadata: { storeName: parsed.storeName ?? null },
        },
      })

      // New: structured receipt line for future receipt-average resolution
      await prisma.receiptLinePrice.create({
        data: {
          receiptId: receipt.id,
          ingredientId: ingredient.id,
          rawName: receiptItem.rawName,
          normalizedName: receiptItem.normalizedName,
          quantityValue: qtyValue,
          quantityUnit: qtyUnit,
          totalPrice: receiptItem.priceMad,
          city,
          marketTier: marketTier as "souk" | "supermarket" | "premium",
          purchasedAt,
          confidenceScore: 0.82,
        },
      })

      pricesLearned++
    }
  }

  return NextResponse.json({
    success: true,
    receiptId: receipt.id,
    storeName: receipt.storeName,
    totalMad: receipt.totalMad,
    itemsFound: receipt.items.length,
    pricesLearned,
    items: receipt.items.map(i => ({
      name: i.rawName,
      quantity: i.quantityText,
      price: i.priceMad,
    })),
  })
}
