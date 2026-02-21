"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Loader2 } from "lucide-react"

export default function GenerateButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/meal-plans/generate", {
        method: "POST",
      })

      if (res.ok) {
        router.refresh()
      } else {
        alert("Something went wrong, try again!")
      }
    } catch (error) {
      alert("Something went wrong, try again!")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={loading}
      className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105 disabled:scale-100 disabled:opacity-70"
      style={{ backgroundColor: "#E67E22" }}>
      {loading ? (
        <>
          <Loader2 size={20} className="animate-spin" />
          Generating... (~30s)
        </>
      ) : (
        <>
          <Sparkles size={20} />
          Generate New Plan
        </>
      )}
    </button>
  )
}