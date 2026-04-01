"use client"
import { useState, Suspense } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import AuthLayout from "@/components/auth-layout"

const INPUT_CLASS =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none transition-colors focus:border-[#2D5F5D] focus:ring-1 focus:ring-[#2D5F5D] text-sm"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const registered = searchParams.get("registered")
  const reset = searchParams.get("reset")

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid email or password")
      setLoading(false)
    } else {
      router.push("/dashboard")
    }
  }

  return (
    <AuthLayout
      tagline="Your AI nutrition companion"
      description="Personalized meal plans rooted in Moroccan & Mediterranean cuisine tradition"
      stats={[
        { number: "21", label: "Meals planned" },
        { number: "100+", label: "Local recipes" },
        { number: "0", label: "Food waste" },
      ]}
    >
      <h2 className="text-3xl font-bold mb-2" style={{ color: "#2C3E50" }}>
        Welcome back
      </h2>
      <p className="mb-8" style={{ color: "#6B7280" }}>
        Sign in to your account
      </p>

      {registered && (
        <div className="mb-4 p-3 rounded-xl text-sm text-green-700 bg-green-50 border border-green-100">
          Account created! Sign in to continue.
        </div>
      )}

      {reset && (
        <div className="mb-4 p-3 rounded-xl text-sm text-green-700 bg-green-50 border border-green-100">
          Password reset successfully. Sign in with your new password.
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm text-red-600 bg-red-50 border border-red-100">
          {error}
        </div>
      )}

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
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-sm font-medium" style={{ color: "#2C3E50" }}>
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium hover:underline"
              style={{ color: "#2D5F5D" }}
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
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

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: "#E67E22" }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-sm text-gray-400">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button
        onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        className="w-full py-3 rounded-xl font-medium border border-gray-200 bg-white flex items-center justify-center gap-3 transition-shadow hover:shadow-md"
        style={{ color: "#2C3E50" }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Continue with Google
      </button>

      <p className="text-center mt-6 text-sm text-gray-500">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold hover:underline" style={{ color: "#2D5F5D" }}>
          Create one
        </Link>
      </p>
    </AuthLayout>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
