"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Loader2, Brain, AlertCircle } from "lucide-react"

export default function GenerateButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [adapted, setAdapted] = useState(false)
  const [error, setError] = useState("")

  const handleGenerate = async () => {
    setLoading(true)
    setError("")
    setAdapted(false)
    try {
      const res = await fetch("/api/meal-plans/generate", { method: "POST" })
      const data = await res.json()

      if (res.ok) {
        if (data.adapted) setAdapted(true)
        router.refresh()
      } else {
        setError("Generation failed. Please try again.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-100 disabled:scale-100 disabled:opacity-70"
        style={{ backgroundColor: "#E67E22" }}
      >
        {loading ? (
          <>
            <Loader2 size={20} className="animate-spin" />
            AI is thinking... (~30s)
          </>
        ) : (
          <>
            <Sparkles size={20} />
            Generate New Plan
          </>
        )}
      </button>

      {error && !loading && (
        <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
          style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      {adapted && !loading && !error && (
        <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
          style={{ backgroundColor: "#F0F7F7", color: "#2D5F5D" }}>
          <Brain size={12} />
          Plan adapted from your feedback!
        </div>
      )}
    </div>
  )
}
