"use client"
import { Printer } from "lucide-react"

export default function PrintGroceryButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{ backgroundColor: "white", color: "#2D5F5D", border: "2px solid #E5E7EB" }}>
      <Printer size={16} />
      Print / PDF
    </button>
  )
}
