"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Sparkles, Loader2, Brain, AlertCircle, ThumbsUp, ChefHat, Zap, Clock } from "lucide-react"
import { toast } from "sonner"

const LS_KEY = "soufra_last_generated"

function useLastGenerated() {
  const [hoursAgo, setHoursAgo] = useState<number | null>(() => {
    if (typeof window === "undefined") return null
    const ts = localStorage.getItem(LS_KEY)
    if (!ts) return null
    const diff = (Date.now() - parseInt(ts)) / 3600000
    return diff < 24 ? Math.floor(diff) : null
  })

  const stamp = () => {
    localStorage.setItem(LS_KEY, String(Date.now()))
    setHoursAgo(0)
  }

  return { hoursAgo, stamp }
}

interface Insights {
  totalRatings:        number
  totalLiked:          number
  totalDisliked:       number
  favoriteCuisines:    string[]
  preferredDifficulty: string | null
  preferredTags:       string[]
}

export default function GenerateButton({ ratingCount = 0 }: { ratingCount?: number }) {
  const router  = useRouter()
  const [loading,  setLoading]  = useState(false)
  const [insights, setInsights] = useState<Insights | null>(null)
  const [error,    setError]    = useState("")
  const { hoursAgo, stamp } = useLastGenerated()

  const handleGenerate = async () => {
    setLoading(true)
    setError("")
    setInsights(null)

    try {
      const res  = await fetch("/api/meal-plans/generate", { method: "POST" })
      const data = await res.json()

      if (res.ok) {
        stamp()
        if (data.adapted && data.insights) {
          setInsights(data.insights)
          toast.success("Plan personalised from your taste profile!", { duration: 4000 })
        } else {
          toast.success("Your meal plan is ready!")
        }
        router.refresh()
      } else {
        setError(data.error || "Generation failed. Please try again.")
        toast.error("Generation failed. Please try again.")
      }
    } catch {
      setError("Network error. Please try again.")
      toast.error("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex items-center gap-3">
        {/* Rating count badge */}
        {ratingCount > 0 && (
          <div
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium"
            style={{ backgroundColor: "#F0F7F7", color: "#2D5F5D" }}>
            <Brain size={12} />
            AI trained on {ratingCount} ratings
          </div>
        )}

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-100 disabled:scale-100 disabled:opacity-70 text-sm sm:text-base"
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
      </div>

      {/* Cooldown hint */}
      {hoursAgo !== null && !loading && !error && (
        <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
          style={{ backgroundColor: "#F0F7F7", color: "#6B7280" }}>
          <Clock size={11} style={{ color: "#9CA3AF" }} />
          {hoursAgo === 0
            ? "Just generated — replacing will lose your current plan"
            : `Last generated ${hoursAgo}h ago`}
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
          style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
          <AlertCircle size={12} />
          {error}
        </div>
      )}

      {/* AI insight card */}
      {insights && !loading && !error && (
        <div
          className="rounded-2xl p-4 w-full max-w-sm"
          style={{ backgroundColor: "#F0F7F7", border: "1px solid #D1E7E7" }}>
          <div className="flex items-center gap-2 mb-3">
            <Brain size={14} style={{ color: "#2D5F5D" }} />
            <span className="text-xs font-bold" style={{ color: "#2D5F5D" }}>
              Plan personalised from your {insights.totalRatings} ratings
            </span>
          </div>

          <div className="space-y-1.5">
            {insights.favoriteCuisines.length > 0 && (
              <div className="flex items-center gap-2 text-xs" style={{ color: "#4B5563" }}>
                <ThumbsUp size={11} style={{ color: "#27AE60" }} />
                Prioritised: {insights.favoriteCuisines.join(", ")} cuisine
              </div>
            )}
            {insights.preferredDifficulty && (
              <div className="flex items-center gap-2 text-xs" style={{ color: "#4B5563" }}>
                <ChefHat size={11} style={{ color: "#E67E22" }} />
                Matched your preferred difficulty: {insights.preferredDifficulty}
              </div>
            )}
            {insights.preferredTags.length > 0 && (
              <div className="flex items-center gap-2 text-xs" style={{ color: "#4B5563" }}>
                <Zap size={11} style={{ color: "#D4A574" }} />
                More of what you love: {insights.preferredTags.slice(0, 3).join(", ")}
              </div>
            )}
            <div className="flex items-center gap-2 text-xs mt-2 pt-2"
              style={{ color: "#9CA3AF", borderTop: "1px solid #D1E7E7" }}>
              {insights.totalLiked} liked · {insights.totalDisliked} disliked · cross-plan variety applied
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
