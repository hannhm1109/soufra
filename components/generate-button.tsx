"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Loader2, Brain } from "lucide-react"

export default function GenerateButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [adapted, setAdapted] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/meal-plans/generate", {
        method: "POST",
      })

      const data = await res.json()

      if (res.ok) {
        if (data.adapted) setAdapted(true)
        router.refresh()
      } else {
        alert("Something went wrong, try again!")
      }
    } catch {
      alert("Something went wrong, try again!")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:scale-105 disabled:scale-100 disabled:opacity-70"
        style={{ backgroundColor: "#E67E22" }}>
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

      {adapted && !loading && (
        <div
          className="flex items-center gap-2 text-xs px-3 py-1 rounded-full"
          style={{ backgroundColor: "#F0F7F7", color: "#2D5F5D" }}>
          <Brain size={12} />
          Plan adapted from your feedback!
        </div>
      )}
    </div>
  )
}