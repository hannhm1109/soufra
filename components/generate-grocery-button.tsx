"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart, Loader2 } from "lucide-react"

export default function GenerateGroceryButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/grocery/generate", { method: "POST" })
      if (res.ok) {
        router.refresh()
      } else {
        alert("Generate a meal plan first!")
      }
    } catch {
      alert("Something went wrong!")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:shadow-lg disabled:opacity-70"
      style={{ backgroundColor: "#2D5F5D" }}>
      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <ShoppingCart size={18} />
          Generate Grocery List
        </>
      )}
    </button>
  )
}