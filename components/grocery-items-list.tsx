"use client"
import { useState } from "react"

interface GroceryItem {
  id: string
  name: string
  quantity: string
  category: string
  price: number | null
  checked: boolean
}

interface Props {
  grouped: Record<string, GroceryItem[]>
  categoryEmojis: Record<string, string>
}

export default function GroceryItemsList({ grouped, categoryEmojis }: Props) {
  const [checked, setChecked] = useState<Record<string, boolean>>({})

  const toggleItem = (id: string) => {
    setChecked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([category, items]) => (
        <div
          key={category}
          className="rounded-2xl p-6"
          style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>

          <h3 className="font-bold mb-4 flex items-center gap-2" style={{ color: "#2C3E50" }}>
            <span>{categoryEmojis[category] || "🛒"}</span>
            {category}
            <span
              className="text-xs px-2 py-0.5 rounded-full ml-1"
              style={{ backgroundColor: "#F0F7F7", color: "#2D5F5D" }}>
              {items.length} items
            </span>
          </h3>

          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className="flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all hover:shadow-sm"
                style={{
                  backgroundColor: checked[item.id] ? "#F0FFF4" : "#FDFAF6",
                  opacity: checked[item.id] ? 0.6 : 1,
                }}>
                <div className="flex items-center gap-3">
                  <div
                    className="w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all"
                    style={{
                      borderColor: checked[item.id] ? "#27AE60" : "#D1D5DB",
                      backgroundColor: checked[item.id] ? "#27AE60" : "white",
                    }}>
                    {checked[item.id] && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    )}
                  </div>
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: "#2C3E50",
                      textDecoration: checked[item.id] ? "line-through" : "none",
                    }}>
                    {item.name}
                  </span>
                </div>
                <span
                  className="text-sm font-semibold"
                  style={{ color: "#2D5F5D" }}>
                  ~{item.price} DH
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}