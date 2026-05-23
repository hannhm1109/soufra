"use client"
import { useState } from "react"
import { motion } from "framer-motion"
import { ChevronDown, ChevronUp, Beef, Leaf, Apple, Milk, Wheat, FlaskConical, ShoppingBasket, Check, Info } from "lucide-react"

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}
const cardVariants = {
  hidden: { opacity: 0, y: 18 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] as [number,number,number,number] } },
}

interface GroceryItem {
  id: string
  name: string
  quantity: string
  category: string
  price: number | null
  checked: boolean
}

interface ResolutionLog {
  chosenSource: string | null
  resolutionMethod: string
  confidenceLevel: string
  explanation: string
}

interface Props {
  grouped: Record<string, GroceryItem[]>
  categoryEmojis: Record<string, string>
  resolutionLogs?: Record<string, ResolutionLog>
}

const categoryIcons: Record<string, React.ReactNode> = {
  "Meat & Protein": <Beef     size={16} />,
  "Vegetables":     <Leaf     size={16} />,
  "Fruits":         <Apple    size={16} />,
  "Dairy":          <Milk     size={16} />,
  "Grains":         <Wheat    size={16} />,
  "Pantry & Spices":<FlaskConical size={16} />,
  "Other":          <ShoppingBasket size={16} />,
}

const categoryColors: Record<string, { icon: string; bg: string; bar: string }> = {
  "Meat & Protein": { icon: "#E67E22", bg: "#FFF7F0", bar: "#E67E22" },
  "Vegetables":     { icon: "#27AE60", bg: "#F0FFF4", bar: "#27AE60" },
  "Fruits":         { icon: "#E74C3C", bg: "#FFF5F5", bar: "#E74C3C" },
  "Dairy":          { icon: "#3498DB", bg: "#EFF6FF", bar: "#3498DB" },
  "Grains":         { icon: "#D4A574", bg: "#FFFBEB", bar: "#D4A574" },
  "Pantry & Spices":{ icon: "#8B5CF6", bg: "#F5F3FF", bar: "#8B5CF6" },
  "Other":          { icon: "#2D5F5D", bg: "#F0F7F7", bar: "#2D5F5D" },
}

const defaultColor = { icon: "#2D5F5D", bg: "#F0F7F7", bar: "#2D5F5D" }

export default function GroceryItemsList({ grouped, resolutionLogs }: Props) {
  // Init checked state from DB values
  const initialChecked: Record<string, boolean> = {}
  for (const items of Object.values(grouped)) {
    for (const item of items) {
      initialChecked[item.id] = item.checked
    }
  }

  const [checked, setChecked]     = useState<Record<string, boolean>>(initialChecked)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [saving, setSaving]       = useState<Record<string, boolean>>({})
  const [expanded, setExpanded]   = useState<Record<string, boolean>>({})

  const toggleItem = async (id: string) => {
    const next = !checked[id]
    setChecked(prev => ({ ...prev, [id]: next }))   // optimistic
    setSaving(prev => ({ ...prev, [id]: true }))

    try {
      await fetch("/api/grocery/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, checked: next }),
      })
    } catch {
      // revert on error
      setChecked(prev => ({ ...prev, [id]: !next }))
    } finally {
      setSaving(prev => ({ ...prev, [id]: false }))
    }
  }

  const clearChecked = async () => {
    const checkedIds = Object.entries(checked).filter(([, v]) => v).map(([k]) => k)
    setChecked(prev => {
      const next = { ...prev }
      checkedIds.forEach(id => { next[id] = false })
      return next
    })
    await Promise.all(
      checkedIds.map(id =>
        fetch("/api/grocery/items", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, checked: false }),
        })
      )
    )
  }

  const totalItems   = Object.values(grouped).flat().length
  const checkedCount = Object.values(checked).filter(Boolean).length

  return (
    <div>
      {/* Top bar: overall progress + clear button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "#E5E7EB", width: "120px" }}>
            <div
              className="h-2 rounded-full transition-all duration-500"
              style={{
                width: `${totalItems ? (checkedCount / totalItems) * 100 : 0}%`,
                backgroundColor: "#27AE60",
              }}
            />
          </div>
          <span className="text-sm font-medium" style={{ color: "#6B7280" }}>
            {checkedCount} / {totalItems} items
          </span>
        </div>
        {checkedCount > 0 && (
          <button
            onClick={clearChecked}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
            style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
            Clear checked
          </button>
        )}
      </div>

      {/* Category cards */}
      <motion.div className="space-y-4" variants={listVariants} initial="hidden" animate="show">
        {Object.entries(grouped).map(([category, items]) => {
          const checkedInCat = items.filter(i => checked[i.id]).length
          const isCollapsed   = collapsed[category] ?? false
          const colors        = categoryColors[category] ?? defaultColor
          const allDone       = checkedInCat === items.length

          return (
            <motion.div
              key={category}
              variants={cardVariants}
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>

              {/* Category header — clickable to collapse */}
              <button
                onClick={() => setCollapsed(prev => ({ ...prev, [category]: !isCollapsed }))}
                className="w-full px-5 py-4 flex items-center gap-3 transition-colors"
                style={{ backgroundColor: isCollapsed ? "#FAFAFA" : "white" }}>

                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: colors.bg, color: colors.icon }}>
                  {categoryIcons[category] ?? <ShoppingBasket size={16} />}
                </div>

                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm" style={{ color: "#2C3E50" }}>{category}</span>
                    {allDone && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"
                        style={{ backgroundColor: "#F0FFF4", color: "#27AE60" }}>
                        <Check size={10} /> Done
                      </span>
                    )}
                  </div>
                  {/* Mini progress */}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="h-1.5 rounded-full overflow-hidden flex-1" style={{ backgroundColor: "#F3F4F6", maxWidth: "80px" }}>
                      <div
                        className="h-1.5 rounded-full transition-all duration-500"
                        style={{
                          width: `${(checkedInCat / items.length) * 100}%`,
                          backgroundColor: colors.bar,
                        }}
                      />
                    </div>
                    <span className="text-xs" style={{ color: "#9CA3AF" }}>
                      {checkedInCat}/{items.length}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="text-xs px-2 py-1 rounded-full font-medium"
                    style={{ backgroundColor: colors.bg, color: colors.icon }}>
                    {items.length} items
                  </span>
                  {isCollapsed
                    ? <ChevronDown size={16} style={{ color: "#9CA3AF" }} />
                    : <ChevronUp   size={16} style={{ color: "#9CA3AF" }} />}
                </div>
              </button>

              {/* Items list */}
              {!isCollapsed && (
                <div className="px-4 pb-4 pt-1 space-y-1.5">
                  {items.map((item) => {
                    const isChecked  = checked[item.id]
                    const isSaving   = saving[item.id]
                    const log        = resolutionLogs?.[item.id]
                    const isExpanded = !!expanded[item.id]

                    const methodLabel: Record<string, string> = {
                      exact_snapshot:    "Live catalog snapshot",
                      recent_receipt_avg:"Receipt average",
                      baseline:          "Baseline estimate",
                      category_fallback: "Category fallback",
                    }
                    const confStyle: Record<string, { bg: string; color: string }> = {
                      high:   { bg: "#F0FFF4", color: "#166534" },
                      medium: { bg: "#FFFBEB", color: "#92400E" },
                      low:    { bg: "#FFF1F2", color: "#991B1B" },
                    }
                    const isLive = log?.resolutionMethod === "exact_snapshot" || log?.resolutionMethod === "recent_receipt_avg"

                    return (
                      <div key={item.id}>
                        <div
                          onClick={() => !isSaving && toggleItem(item.id)}
                          className="group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-150"
                          style={{
                            backgroundColor: isChecked ? "#F0FFF4" : "#FAFAFA",
                            borderLeft: isChecked ? "3px solid #27AE60" : "3px solid transparent",
                          }}
                          onMouseEnter={e => {
                            if (!isChecked) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#F0F7F7"
                          }}
                          onMouseLeave={e => {
                            if (!isChecked) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#FAFAFA"
                          }}>

                          {/* Checkbox */}
                          <div
                            className="w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200"
                            style={{
                              borderColor: isChecked ? "#27AE60" : "#D1D5DB",
                              backgroundColor: isChecked ? "#27AE60" : "white",
                              transform: isSaving ? "scale(0.9)" : "scale(1)",
                            }}>
                            {isChecked && <Check size={11} color="white" strokeWidth={3} />}
                          </div>

                          {/* Name */}
                          <span
                            className="flex-1 text-sm font-medium transition-all"
                            style={{
                              color: isChecked ? "#9CA3AF" : "#2C3E50",
                              textDecoration: isChecked ? "line-through" : "none",
                            }}>
                            {item.name}
                          </span>

                          {/* Right: quantity + price + info button */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: "#F3F4F6", color: "#6B7280" }}>
                              {item.quantity}
                            </span>
                            {item.price != null && (
                              <span className="text-sm font-semibold" style={{ color: isChecked ? "#9CA3AF" : "#2D5F5D" }}>
                                ~{item.price} DH
                              </span>
                            )}
                            {log && (
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  setExpanded(prev => ({ ...prev, [item.id]: !prev[item.id] }))
                                }}
                                title="Why this price?"
                                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                                style={{
                                  backgroundColor: isExpanded ? "#EFF6FF" : "#F3F4F6",
                                  color: isExpanded ? "#3B82F6" : "#9CA3AF",
                                }}>
                                <Info size={12} />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Price explainer panel */}
                        {log && isExpanded && (
                          <div
                            className="mx-3 mb-1 p-3 rounded-xl text-xs"
                            style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span
                                className="px-2 py-0.5 rounded-full font-semibold"
                                style={{
                                  backgroundColor: isLive ? "#F0FFF4" : "#FFFBEB",
                                  color: isLive ? "#166534" : "#92400E",
                                }}>
                                {log.chosenSource ?? "Baseline"}
                              </span>
                              <span
                                className="px-2 py-0.5 rounded-full font-semibold capitalize"
                                style={confStyle[log.confidenceLevel] ?? confStyle.low}>
                                {log.confidenceLevel} confidence
                              </span>
                              <span
                                className="px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: "#F1F5F9", color: "#475569" }}>
                                {methodLabel[log.resolutionMethod] ?? log.resolutionMethod}
                              </span>
                            </div>
                            <p style={{ color: "#64748B", lineHeight: "1.5" }}>{log.explanation}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </motion.div>
          )
        })}
      </motion.div>
    </div>
  )
}
