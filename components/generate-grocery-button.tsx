"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { ShoppingCart, Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function GenerateGroceryButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/grocery/generate", { method: "POST" })
      if (res.ok) {
        const data = await res.json()
        if (data.assessment?.status === "unrealistic") {
          toast.warning(data.assessment.message)
        } else {
          toast.success("Grocery list ready!")
        }
        router.refresh()
      } else {
        toast.error("Generate a meal plan first!")
      }
    } catch {
      toast.error("Something went wrong. Please try again.")
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
