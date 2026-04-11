"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { Eye, EyeOff, Check, X } from "lucide-react"
import AuthLayout from "@/components/auth-layout"

const INPUT_CLASS =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none transition-colors focus:border-[#2D5F5D] focus:ring-1 focus:ring-[#2D5F5D] text-sm"

function getPasswordStrength(password: string) {
  if (password.length === 0) return null
  if (password.length < 8) return { label: "Too short", color: "#EF4444", width: "20%" }

  let score = 0
  if (/[A-Z]/.test(password))        score++ // uppercase
  if (/[a-z]/.test(password))        score++ // lowercase
  if (/[0-9]/.test(password))        score++ // number
  if (/[^A-Za-z0-9]/.test(password)) score++ // special char
  if (password.length >= 12)         score++ // length bonus

  if (score <= 1) return { label: "Weak",   color: "#F97316", width: "33%" }
  if (score <= 3) return { label: "Good",   color: "#EAB308", width: "66%" }
  return                 { label: "Strong", color: "#22C55E", width: "100%" }
}

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const strength = getPasswordStrength(password)
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords don't match")
      setLoading(false)
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim().toLowerCase(), password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || "Something went wrong")
        return
      }

      // Don't auto-login — the write goes to the direct DB URL and reads
      // go through the pooler, so the new user may not be visible yet.
      // The login page shows a clear "Account created!" banner.
      router.push("/login?registered=true")
    } catch {
      setError("Network error. Please check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      tagline="Start your journey"
      description="Join the community discovering the joy of culturally intelligent meal planning"
    >
      <h2 className="text-3xl font-bold mb-2" style={{ color: "#2C3E50" }}>
        Create account
      </h2>
      <p className="mb-8" style={{ color: "#6B7280" }}>
        Start planning smarter meals today
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-xl text-sm text-red-600 bg-red-50 border border-red-100">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "#2C3E50" }}>
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            className={INPUT_CLASS}
          />
        </div>

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
          <label className="block text-sm font-medium mb-1" style={{ color: "#2C3E50" }}>
            Password
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

          {/* Password strength bar */}
          {strength && (
            <div className="mt-2">
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: strength.width, backgroundColor: strength.color }}
                />
              </div>
              <p className="text-xs mt-1 font-medium" style={{ color: strength.color }}>
                {strength.label}
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: "#2C3E50" }}>
            Confirm Password
          </label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className={`${INPUT_CLASS} pr-12`}
              style={{
                borderColor: passwordsMismatch ? "#EF4444" : passwordsMatch ? "#22C55E" : undefined,
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              style={{ color: "#9CA3AF" }}
            >
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
            {passwordsMatch && (
              <Check size={16} className="absolute right-10 top-1/2 -translate-y-1/2 text-green-500" />
            )}
            {passwordsMismatch && (
              <X size={16} className="absolute right-10 top-1/2 -translate-y-1/2 text-red-500" />
            )}
          </div>
          {passwordsMismatch && (
            <p className="text-xs mt-1 text-red-500">Passwords don&apos;t match</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || passwordsMismatch}
          className="w-full py-3 rounded-xl font-semibold text-white transition-opacity disabled:opacity-60"
          style={{ backgroundColor: "#E67E22" }}
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-4">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-sm text-gray-400">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <button
        onClick={() => signIn("google", { callbackUrl: "/onboarding" })}
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
        Already have an account?{" "}
        <Link href="/login" className="font-semibold hover:underline" style={{ color: "#2D5F5D" }}>
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
