"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import {
  LayoutDashboard,
  ShoppingCart,
  Heart,
  Settings,
  LogOut,
  ChefHat,
} from "lucide-react"
import { signOut } from "next-auth/react"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/grocery", label: "Grocery List", icon: ShoppingCart },
  { href: "/favorites", label: "Favorites", icon: Heart },
  { href: "/settings", label: "Settings", icon: Settings },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <div
        className="hidden lg:flex fixed left-0 top-0 h-screen w-64 flex-col p-6 z-50"
        style={{ backgroundColor: "#2D5F5D" }}>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-10">
          <Image src="/logo.png" alt="Soufra" width={64} height={64} />
          <span
            className="text-2xl font-bold"
            style={{ color: "#D4A574", fontFamily: "var(--font-playfair)" }}>
            Soufra
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                style={{
                  backgroundColor: active ? "rgba(212,165,116,0.2)" : "transparent",
                  color: active ? "#D4A574" : "rgba(255,255,255,0.7)",
                }}>
                <Icon size={20} />
                <span className="font-medium">{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Recipes link */}
        <Link
          href="/recipes"
          className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4 transition-all"
          style={{
            backgroundColor: "rgba(230,126,34,0.2)",
            color: "#E67E22",
          }}>
          <ChefHat size={20} />
          <span className="font-medium">Browse Recipes</span>
        </Link>

        {/* Logout */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full"
          style={{ color: "rgba(255,255,255,0.5)" }}>
          <LogOut size={20} />
          <span className="font-medium">Sign out</span>
        </button>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-4 py-3"
        style={{
          backgroundColor: "#2D5F5D",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.15)"
        }}>
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all">
              <Icon
                size={22}
                style={{ color: active ? "#D4A574" : "rgba(255,255,255,0.6)" }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: active ? "#D4A574" : "rgba(255,255,255,0.6)" }}>
                {label.split(" ")[0]}
              </span>
            </Link>
          )
        })}

        {/* Logout on mobile */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all">
          <LogOut size={22} style={{ color: "rgba(255,255,255,0.6)" }} />
          <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.6)" }}>
            Logout
          </span>
        </button>
      </div>
    </>
  )
}