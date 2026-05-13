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
  History,
} from "lucide-react"
import { signOut } from "next-auth/react"

export default function Sidebar() {
  const pathname = usePathname()

  const navItems = [
    { href: "/dashboard", label: "Dashboard",  icon: LayoutDashboard },
    { href: "/grocery",   label: "Grocery",    icon: ShoppingCart },
    { href: "/favorites", label: "Favorites",  icon: Heart },
    { href: "/history",   label: "History",    icon: History },
    { href: "/settings",  label: "Settings",   icon: Settings },
  ]

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
        <nav className="flex-1 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 group"
                style={{
                  backgroundColor: active ? "rgba(212,165,116,0.2)" : "transparent",
                  color: active ? "#D4A574" : "rgba(255,255,255,0.65)",
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.08)" }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent" }}
              >
                <Icon size={20} />
                <span className="font-medium">{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Browse Recipes */}
        <Link
          href="/recipes"
          className="flex items-center gap-3 px-4 py-3 rounded-xl mb-3 transition-all duration-150"
          style={{ backgroundColor: "rgba(230,126,34,0.2)", color: "#E67E22" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(230,126,34,0.3)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(230,126,34,0.2)"}
        >
          <ChefHat size={20} />
          <span className="font-medium">Recipes</span>
        </Link>

        {/* Sign out */}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 w-full text-left"
          style={{ color: "rgba(255,255,255,0.45)" }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLElement).style.backgroundColor = "rgba(255,255,255,0.08)"
            ;(e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)"
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.backgroundColor = "transparent"
            ;(e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.45)"
          }}
        >
          <LogOut size={20} />
          <span className="font-medium">Sign out</span>
        </button>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div
        className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          backgroundColor: "#2D5F5D",
          boxShadow: "0 -2px 20px rgba(0,0,0,0.18)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}>
        <div className="flex items-center justify-around px-2 pt-2 pb-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl transition-all duration-200"
                style={{
                  backgroundColor: active ? "rgba(212,165,116,0.22)" : "transparent",
                  minWidth: "52px",
                }}>
                <Icon
                  size={21}
                  style={{ color: active ? "#D4A574" : "rgba(255,255,255,0.55)" }}
                />
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: active ? "#D4A574" : "rgba(255,255,255,0.55)" }}>
                  {label.split(" ")[0]}
                </span>
                {active && (
                  <div className="w-1 h-1 rounded-full" style={{ backgroundColor: "#D4A574" }} />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}