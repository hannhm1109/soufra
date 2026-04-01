"use client"
import { useState, useEffect } from "react"
import { ThumbsUp, ThumbsDown } from "lucide-react"
import { toast } from "sonner"

export default function FeedbackButtons({ recipeId }: { recipeId: string }) {
  const [liked, setLiked] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)

  // Load existing feedback
  useEffect(() => {
    fetch(`/api/feedback?recipeId=${recipeId}`)
      .then(res => res.json())
      .then(data => setLiked(data.liked))
  }, [recipeId])

  const handleFeedback = async (value: boolean) => {
    setLoading(true)
    
    // If clicking same button, it means toggle off - for now just update
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipeId, liked: value }),
    })

    if (res.ok) {
      setLiked(value)
      if (value) toast.success("Added to your favorites!")
      else toast("Got it — we'll adjust your future plans")
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-3">
      <p className="text-sm font-medium" style={{ color: "#6B7280" }}>
        Rate this recipe:
      </p>
      
      {/* Like button */}
      <button
        onClick={() => handleFeedback(true)}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all font-medium text-sm"
        style={{
          borderColor: liked === true ? "#27AE60" : "#E5E7EB",
          backgroundColor: liked === true ? "#F0FFF4" : "white",
          color: liked === true ? "#27AE60" : "#6B7280",
        }}>
        <ThumbsUp size={16} />
        Love it
      </button>

      {/* Dislike button */}
      <button
        onClick={() => handleFeedback(false)}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all font-medium text-sm"
        style={{
          borderColor: liked === false ? "#E74C3C" : "#E5E7EB",
          backgroundColor: liked === false ? "#FFF0F0" : "white",
          color: liked === false ? "#E74C3C" : "#6B7280",
        }}>
        <ThumbsDown size={16} />
        Not for me
      </button>
    </div>
  )
}