"use client"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

export default function BackButton() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.back()}
      className="inline-flex items-center gap-2 mb-6 text-sm font-medium transition-opacity hover:opacity-70"
      style={{ color: "#2D5F5D" }}
    >
      <ArrowLeft size={16} />
      Back
    </button>
  )
}
