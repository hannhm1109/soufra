"use client"
import { useState } from "react"
import Link from "next/link"
import { Mail } from "lucide-react"
import AuthLayout from "@/components/auth-layout"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    // Always show success — never reveal whether email exists
    setSubmitted(true)
    setLoading(false)
  }

  return (
    <AuthLayout
      tagline="Your AI nutrition companion"
      description="Personalized meal plans rooted in Moroccan & Mediterranean cuisine tradition"
    >
      {submitted ? (
        <div className="text-center py-8">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: "#E8F5E9" }}
          >
            <Mail size={28} style={{ color: "#2D5F5D" }} />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: "#2C3E50" }}>
            Check your inbox
          </h2>
          <p className="text-sm mb-8 max-w-xs mx-auto" style={{ color: "#6B7280" }}>
            If an account with <strong>{email}</strong> exists, you&apos;ll receive a reset link shortly.
          </p>
          <Link
            href="/login"
            className="text-sm font-semibold hover:underline"
            style={{ color: "#2D5F5D" }}
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <>
          <h2 className="text-3xl font-bold mb-2" style={{ color: "#2C3E50" }}>
            Forgot password?
          </h2>
          <p className="mb-8" style={{ color: "#6B7280" }}>
            Enter your email and we&apos;ll send you a reset link.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "#2C3E50" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none transition-colors focus:border-[#2D5F5D] focus:ring-1 focus:ring-[#2D5F5D] text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: "#E67E22" }}
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>

          <p className="text-center mt-6 text-sm text-gray-500">
            Remember your password?{" "}
            <Link href="/login" className="font-semibold hover:underline" style={{ color: "#2D5F5D" }}>
              Sign in
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  )
}
