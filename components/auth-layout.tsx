import Image from "next/image"
import Link from "next/link"

interface Stat {
  number: string
  label: string
}

interface AuthLayoutProps {
  tagline: string
  description: string
  stats?: Stat[]
  children: React.ReactNode
}

export default function AuthLayout({ tagline, description, stats, children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex">

      {/* LEFT SIDE — teal panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ backgroundColor: "#2D5F5D" }}
      >
        <Link
          href="/"
          className="absolute top-6 left-6 text-sm font-medium flex items-center gap-1 transition-opacity hover:opacity-60"
          style={{ color: "rgba(255,255,255,0.55)" }}
        >
          ← Home
        </Link>

        {/* Zellige-inspired background pattern */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4A574' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative z-10 text-center">
          <Link href="/" className="inline-block">
            <Image
              src="/logo.png"
              alt="Soufra Logo"
              width={160}
              height={160}
              className="mx-auto mb-8"
            />
          </Link>
          <Link href="/">
            <h1
              className="text-5xl font-bold mb-4 hover:opacity-80 transition-opacity"
              style={{ color: "#D4A574", fontFamily: "var(--font-playfair)" }}
            >
              Soufra
            </h1>
          </Link>
          <p className="text-xl text-white opacity-90 mb-2">{tagline}</p>
          <p className="text-white opacity-60 text-sm max-w-xs mx-auto">{description}</p>

          {stats && (
            <div className="mt-12 grid grid-cols-3 gap-6">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-bold" style={{ color: "#D4A574" }}>
                    {stat.number}
                  </div>
                  <div className="text-white opacity-60 text-xs mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE — form area */}
      <div
        className="w-full lg:w-1/2 flex items-center justify-center p-8 relative"
        style={{ backgroundColor: "#FDFAF6" }}
      >
        {/* Mobile: back to home */}
        <Link
          href="/"
          className="lg:hidden absolute top-6 left-6 text-sm font-medium"
          style={{ color: "#2D5F5D" }}
        >
          ← Home
        </Link>

        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <Link href="/" className="inline-block">
              <Image
                src="/logo.png"
                alt="Soufra Logo"
                width={110}
                height={110}
                className="mx-auto mb-4"
              />
            </Link>
            <Link href="/">
              <h1
                className="text-3xl font-bold hover:opacity-70 transition-opacity"
                style={{ color: "#2D5F5D", fontFamily: "var(--font-playfair)" }}
              >
                Soufra
              </h1>
            </Link>
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
