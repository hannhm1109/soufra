import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

interface ParsedItem {
  name: string
  quantity?: string
  unit?: string
  price?: number
}

interface ParsedReceipt {
  storeName?: string
  total?: number
  items: ParsedItem[]
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

  // ── Save receipt to DB ────────────────────────────────────────
  const receipt = await prisma.receipt.create({
    data: {
      userId: user.id,
      storeName: parsed.storeName ?? null,
      city: user.city ?? null,
      totalMad: parsed.total ?? null,
      purchasedAt: new Date(),
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

  for (const receiptItem of receipt.items) {
    if (!receiptItem.priceMad || !receiptItem.normalizedName) continue

    // Find matching ingredient by alias or slug
    const ingredient = await prisma.ingredient.findFirst({
      where: {
        OR: [
          { slug: { contains: receiptItem.normalizedName, mode: "insensitive" } },
          { name: { contains: receiptItem.normalizedName, mode: "insensitive" } },
          { aliases: { some: { alias: { contains: receiptItem.normalizedName, mode: "insensitive" } } } },
        ],
      },
    })

    if (ingredient) {
      // Link receipt item to ingredient
      await prisma.receiptItem.update({
        where: { id: receiptItem.id },
        data: { ingredientId: ingredient.id },
      })

      // Save as a price point
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
          capturedAt: new Date(),
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
