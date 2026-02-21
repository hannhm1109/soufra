"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Something went wrong")
      setLoading(false)
    } else {
      router.push("/login?registered=true")
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* LEFT SIDE */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ backgroundColor: "#2D5F5D" }}>
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4A574' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative z-10 text-center">
          <Image src="/logo.png" alt="Soufra Logo" width={160} height={160} className="mx-auto mb-8" />
          <h1 className="text-5xl font-bold mb-4"
            style={{ color: "#D4A574", fontFamily: "var(--font-playfair)" }}>
            Soufra
          </h1>
          <p className="text-xl text-white opacity-90 mb-2">Start your journey</p>
          <p className="text-white opacity-60 text-sm max-w-xs mx-auto">
            Join thousands discovering the joy of culturally intelligent meal planning
          </p>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8"
        style={{ backgroundColor: "#FDFAF6" }}>
        <div className="w-full max-w-md">

          <div className="lg:hidden text-center mb-8">
            <Image src="/logo.png" alt="Soufra Logo" width={110} height={110} className="mx-auto mb-4" />
          </div>

          <h2 className="text-3xl font-bold mb-2" style={{ color: "#2C3E50" }}>
            Create account
          </h2>
          <p className="mb-8" style={{ color: "#6B7280" }}>
            Start planning smarter meals today
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm text-red-600"
              style={{ backgroundColor: "#FEE2E2" }}>
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
                className="w-full px-4 py-3 rounded-xl border outline-none transition-all"
                style={{ borderColor: "#E5E7EB", backgroundColor: "white" }}
                onFocus={(e) => e.target.style.borderColor = "#2D5F5D"}
                onBlur={(e) => e.target.style.borderColor = "#E5E7EB"}
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
                className="w-full px-4 py-3 rounded-xl border outline-none transition-all"
                style={{ borderColor: "#E5E7EB", backgroundColor: "white" }}
                onFocus={(e) => e.target.style.borderColor = "#2D5F5D"}
                onBlur={(e) => e.target.style.borderColor = "#E5E7EB"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: "#2C3E50" }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl border outline-none transition-all"
                style={{ borderColor: "#E5E7EB", backgroundColor: "white" }}
                onFocus={(e) => e.target.style.borderColor = "#2D5F5D"}
                onBlur={(e) => e.target.style.borderColor = "#E5E7EB"}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all"
              style={{
                backgroundColor: loading ? "#6B7280" : "#E67E22",
                cursor: loading ? "not-allowed" : "pointer",
              }}>
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="text-center mt-6 text-sm" style={{ color: "#6B7280" }}>
            Already have an account?{" "}
            <Link href="/login"
              className="font-semibold hover:underline"
              style={{ color: "#2D5F5D" }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}