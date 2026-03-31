"use client"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, CheckCircle } from "lucide-react"
import AuthLayout from "@/components/auth-layout"

const INPUT_CLASS =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none transition-colors focus:border-[#2D5F5D] focus:ring-1 focus:ring-[#2D5F5D] text-sm"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <AuthLayout tagline="Your AI nutrition companion" description="">
        <div className="text-center py-8">
          <p className="text-red-500 mb-4">Invalid or missing reset link.</p>
          <Link href="/forgot-password" className="font-semibold text-sm hover:underline" style={{ color: "#2D5F5D" }}>
            Request a new link
          </Link>
        </div>
      </AuthLayout>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords don't match")
      return
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setLoading(true)

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Something went wrong")
      setLoading(false)
      return
    }

    setDone(true)
    setTimeout(() => router.push("/login?reset=true"), 2500)
  }

  if (done) {
    return (
      <AuthLayout tagline="Your AI nutrition companion" description="">
        <div className="text-center py-8">
          <CheckCircle size={56} className="mx-auto mb-4" style={{ color: "#2D5F5D" }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: "#2C3E50" }}>Password updated!</h2>
          <p className="text-sm text-gray-500">Redirecting you to sign in...</p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout tagline="Your AI nutrition companion" description="">
      <h2 className="text-3xl font-bold mb-2" style={{ color: "#2C3E50" }}>
        Set new password
      </h2>
      <p className="mb-8" style={{ color: "#6B7280" }}>
        Choose a strong password for your account.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm text-red-600 bg-red-50 border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "#2C3E50" }}>
            New Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              className={`${INPUT_CLASS} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "#9CA3AF" }}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "#2C3E50" }}>
            Confirm New Password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className={`${INPUT_CLASS} pr-12`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "#9CA3AF" }}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: "#E67E22" }}
        >
          {loading ? "Updating..." : "Update password"}
        </button>
      </form>
    </AuthLayout>
  )
}
