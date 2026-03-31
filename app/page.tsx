"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Sparkles, ShoppingCart, Brain, UtensilsCrossed,
  ChevronRight, Star, Check, ArrowRight, Ban, AlertTriangle, Trash2,
  SlidersHorizontal, CalendarDays, ShoppingBasket
} from "lucide-react"

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false)
  const [visible, setVisible] = useState<Record<string, boolean>>({})
  const refs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  useEffect(() => {
    const observers: IntersectionObserver[] = []
    Object.entries(refs.current).forEach(([key, el]) => {
      if (!el) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible(prev => ({ ...prev, [key]: true }))
          }
        },
        { threshold: 0.1 }
      )
      observer.observe(el)
      observers.push(observer)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [])

  const setRef = (key: string) => (el: HTMLDivElement | null) => {
    refs.current[key] = el
  }

  return (
    <div style={{ backgroundColor: "#FDFAF6", fontFamily: "var(--font-inter)" }}>

      {/* NAVBAR */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          backgroundColor: scrolled ? "rgba(253,250,246,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(10px)" : "none",
          boxShadow: scrolled ? "0 2px 20px rgba(0,0,0,0.08)" : "none",
          padding: scrolled ? "12px 0" : "20px 0"
        }}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Soufra" width={36} height={36} />
            <span
              className="text-2xl font-bold"
              style={{ color: "#2D5F5D", fontFamily: "var(--font-playfair)" }}>
              Soufra
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {["Features", "How it works", "About"].map(item => (
              <a
                key={item}
                href={`#${item.toLowerCase().replaceAll(" ", "-")}`}
                className="text-sm font-medium transition-colors hover:opacity-70"
                style={{ color: "#2C3E50" }}>
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium px-4 py-2 rounded-xl transition-all"
              style={{ color: "#2D5F5D" }}>
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white transition-all hover:shadow-lg hover:scale-105"
              style={{ backgroundColor: "#E67E22" }}>
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="min-h-screen flex items-center relative overflow-hidden pt-20">

        {/* Background pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232D5F5D' fill-opacity='1'%3E%3Cpath d='M50 50v-10h-4v10h-10v4h10v10h4v-10h10v-4h-10zm0-40V0h-4v10h-10v4h10v10h4V14h10v-4h-10zM10 50v-10H6v10H-4v4h10v10h4v-10h10v-4H10zM10 10V0H6v10H-4v4h10v10h4V14h10v-4H10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Decorative circles */}
        <div
          className="absolute top-20 right-0 w-96 h-96 rounded-full opacity-10"
          style={{ backgroundColor: "#D4A574", transform: "translate(30%, -20%)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10"
          style={{ backgroundColor: "#2D5F5D", transform: "translate(-30%, 30%)" }}
        />

        <div className="max-w-6xl mx-auto px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left - Text */}
            <div>
              {/* Badge */}
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8"
                style={{ backgroundColor: "#F0F7F7", color: "#2D5F5D" }}>
                <Sparkles size={14} />
                AI-powered meal planning
              </div>

              <h1
                className="text-6xl lg:text-7xl font-bold leading-tight mb-6"
                style={{ color: "#2C3E50", fontFamily: "var(--font-playfair)" }}>
                Your table,
                <br />
                <span style={{ color: "#2D5F5D" }}>your</span>
                <span style={{ color: "#D4A574" }}> way.</span>
              </h1>

              <p
                className="text-xl leading-relaxed mb-8 max-w-lg"
                style={{ color: "#6B7280" }}>
                The first AI nutrition assistant that truly understands
                <strong style={{ color: "#2C3E50" }}> Moroccan and Mediterranean cuisine</strong>.
                Personalized meal plans, smart grocery lists, real prices.
              </p>

              {/* Social proof */}
              <div className="flex items-center gap-3 mb-8">
                <div className="flex -space-x-2">
                  {["#E67E22", "#2D5F5D", "#D4A574", "#27AE60"].map((color, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: color }}>
                      {["H", "A", "M", "F"][i]}
                    </div>
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Star key={i} size={12} fill="#E67E22" style={{ color: "#E67E22" }} />
                    ))}
                  </div>
                  <p className="text-xs" style={{ color: "#6B7280" }}>
                    Loved by food enthusiasts across Morocco & the Mediterranean
                  </p>
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex items-center gap-4">
                <Link
                  href="/register"
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white text-lg transition-all hover:shadow-xl hover:scale-105"
                  style={{ backgroundColor: "#E67E22" }}>
                  Start for free
                  <ArrowRight size={20} />
                </Link>
                <a
                  href="#how-it-works"
                  className="flex items-center gap-2 px-6 py-4 rounded-2xl font-medium transition-all hover:shadow-md"
                  style={{ color: "#2D5F5D", backgroundColor: "white", border: "2px solid #E5E7EB" }}>
                  See how it works
                </a>
              </div>
            </div>

            {/* Right - Dashboard preview */}
            <div className="relative hidden lg:block">
              {/* Main card */}
              <div
                className="rounded-3xl p-6 shadow-2xl"
                style={{ backgroundColor: "white" }}>

                {/* Mini dashboard */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-bold" style={{ color: "#2C3E50" }}>
                      Good morning, Hanane 👋
                    </p>
                    <p className="text-xs" style={{ color: "#6B7280" }}>
                      Your weekly meal plan is ready
                    </p>
                  </div>
                  <div
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white flex items-center gap-1"
                    style={{ backgroundColor: "#E67E22" }}>
                    <Sparkles size={12} />
                    AI Generated
                  </div>
                </div>

                {/* Meal preview grid */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[
                    { name: "Msemen", cal: 380, cuisine: "🇲🇦", color: "#FFF7F0" },
                    { name: "Tagine Poulet", cal: 520, cuisine: "🇲🇦", color: "#FFF7F0" },
                    { name: "Harira", cal: 280, cuisine: "🇲🇦", color: "#FFF7F0" },
                    { name: "Ratatouille", cal: 320, cuisine: "🇫🇷", color: "#F0F7FF" },
                    { name: "Avocado Toast", cal: 420, cuisine: "🥗", color: "#F0FFF4" },
                    { name: "Couscous", cal: 490, cuisine: "🇲🇦", color: "#FFF7F0" },
                    { name: "Quiche", cal: 550, cuisine: "🇫🇷", color: "#F0F7FF" },
                    { name: "Shakshuka", cal: 380, cuisine: "🧆", color: "#FFF0F0" },
                  ].map((meal, i) => (
                    <div
                      key={i}
                      className="p-2 rounded-xl"
                      style={{ backgroundColor: meal.color }}>
                      <p className="text-xs mb-1">{meal.cuisine}</p>
                      <p className="text-xs font-semibold leading-tight"
                        style={{ color: "#2C3E50", fontSize: "10px" }}>
                        {meal.name}
                      </p>
                      <p className="text-xs" style={{ color: "#E67E22", fontSize: "10px" }}>
                        🔥{meal.cal}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Budget bar */}
                <div
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: "#F0F7F7" }}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: "#2D5F5D", fontWeight: 600 }}>
                      🛒 Weekly Grocery Budget
                    </span>
                    <span style={{ color: "#27AE60", fontWeight: 600 }}>
                      245 / 300 DH ✓
                    </span>
                  </div>
                  <div className="h-2 rounded-full" style={{ backgroundColor: "#E5E7EB" }}>
                    <div
                      className="h-2 rounded-full"
                      style={{ width: "82%", backgroundColor: "#27AE60" }}
                    />
                  </div>
                </div>
              </div>

              {/* Floating cards */}
              <div
                className="absolute -top-6 -right-6 p-4 rounded-2xl shadow-lg"
                style={{ backgroundColor: "#2D5F5D" }}>
                <p className="text-xs text-white opacity-70">This week</p>
                <p className="text-2xl font-bold" style={{ color: "#D4A574" }}>21</p>
                <p className="text-xs text-white opacity-70">meals planned</p>
              </div>

              <div
                className="absolute -bottom-6 -left-6 p-4 rounded-2xl shadow-lg flex items-center gap-3"
                style={{ backgroundColor: "white" }}>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "#F0FFF4" }}>
                  <Brain size={20} style={{ color: "#27AE60" }} />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: "#2C3E50" }}>
                    AI Learning
                  </p>
                  <p className="text-xs" style={{ color: "#6B7280" }}>
                    Plan adapted from your taste
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BANNER */}
      <section style={{ backgroundColor: "#2D5F5D" }} className="py-12">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: "21", label: "Meals per week", suffix: "" },
              { number: "100", label: "Moroccan & Mediterranean recipes", suffix: "+" },
              { number: "0", label: "Food waste goal", suffix: "" },
              { number: "30", label: "Seconds to generate", suffix: "s" },
            ].map(({ number, label, suffix }) => (
              <div key={label} className="text-center">
                <p className="text-4xl font-bold mb-1" style={{ color: "#D4A574" }}>
                  {number}{suffix}
                </p>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section id="features" className="py-24">
        <div
          ref={setRef("problem")}
          className="max-w-6xl mx-auto px-6"
          style={{
            opacity: visible.problem ? 1 : 0,
            transform: visible.problem ? "translateY(0)" : "translateY(40px)",
            transition: "all 0.7s ease"
          }}>
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3"
              style={{ color: "#E67E22" }}>
              Sound familiar?
            </p>
            <h2
              className="text-4xl font-bold mb-4"
              style={{ color: "#2C3E50", fontFamily: "var(--font-playfair)" }}>
              Other apps don't get you
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "#6B7280" }}>
              Generic nutrition apps were built for a different culture. Soufra was built for yours.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Ban,
                problem: "Generic meal plans",
                desc: "Apps suggest quinoa bowls when you want tagine. No understanding of Moroccan or Mediterranean cuisine, no cultural context, no real recipes.",
                color: "#FFF7F0",
                border: "#E67E22",
                iconColor: "#E67E22",
              },
              {
                icon: AlertTriangle,
                problem: "Budget surprises",
                desc: "You follow the meal plan then get shocked at the supermarket. No real prices, no budget tracking, no Moroccan market awareness.",
                color: "#FFF0F0",
                border: "#E74C3C",
                iconColor: "#E74C3C",
              },
              {
                icon: Trash2,
                problem: "Food goes to waste",
                desc: "Every app plans meals independently. Nobody tells you that leftover chicken from Monday can become Tuesday's couscous.",
                color: "#F0F7FF",
                border: "#3498DB",
                iconColor: "#3498DB",
              },
            ].map(({ icon: Icon, problem, desc, color, border, iconColor }) => (
              <div
                key={problem}
                className="relative p-8 rounded-3xl border-2 transition-all hover:shadow-lg hover:-translate-y-1 overflow-hidden"
                style={{ backgroundColor: color, borderColor: border }}>
                {/* Watermark icon */}
                <div
                  className="absolute -bottom-4 -right-4 pointer-events-none"
                  style={{ opacity: 0.08 }}>
                  <Icon size={140} style={{ color: iconColor }} strokeWidth={1} />
                </div>
                <h3 className="text-xl font-bold mb-3 relative z-10" style={{ color: "#2C3E50" }}>
                  {problem}
                </h3>
                <p className="relative z-10" style={{ color: "#6B7280", lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section
        className="py-24"
        style={{ backgroundColor: "#2D5F5D" }}>
        <div
          ref={setRef("features")}
          className="max-w-6xl mx-auto px-6"
          style={{
            opacity: visible.features ? 1 : 0,
            transform: visible.features ? "translateY(0)" : "translateY(40px)",
            transition: "all 0.7s ease"
          }}>

          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3"
              style={{ color: "#D4A574" }}>
              Everything you need
            </p>
            <h2
              className="text-4xl font-bold text-white mb-4"
              style={{ fontFamily: "var(--font-playfair)" }}>
              Built different, built for you
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: Sparkles,
                title: "AI Meal Planning",
                desc: "Tell us your goals, allergies and cuisine preferences. Get 21 personalized recipes in under 30 seconds. Authentic Moroccan tagines, Mediterranean favorites, and nourishing healthy essentials.",
                highlight: "21 meals in 30 seconds",
                color: "#E67E22",
              },
              {
                icon: Brain,
                title: "Learns Your Taste",
                desc: "Rate recipes you love or skip. After just a few interactions, the AI detects your patterns and adapts every future plan to match your unique taste profile.",
                highlight: "Gets smarter every week",
                color: "#D4A574",
              },
              {
                icon: ShoppingCart,
                title: "Smart Grocery Lists",
                desc: "Every ingredient from your 21 meals, automatically aggregated, categorized and priced in DH. Budget tracker shows you exactly what you'll spend before you shop.",
                highlight: "Budget tracked in DH",
                color: "#27AE60",
              },
              {
                icon: UtensilsCrossed,
                title: "Cultural Intelligence",
                desc: "The only app that knows the difference between msemen and meloui, understands Mediterranean sharing culture, and brings the warmth of both traditions to your table.",
                highlight: "100+ authentic recipes",
                color: "#3498DB",
              },
            ].map(({ icon: Icon, title, desc, highlight, color }) => (
              <div
                key={title}
                className="p-8 rounded-3xl transition-all hover:shadow-xl hover:-translate-y-1"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                  style={{ backgroundColor: `${color}30` }}>
                  <Icon size={24} style={{ color }} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                <p className="mb-4" style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>
                  {desc}
                </p>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ backgroundColor: `${color}20`, color }}>
                  <Check size={12} />
                  {highlight}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24">
        <div
          ref={setRef("howItWorks")}
          className="max-w-6xl mx-auto px-6"
          style={{
            opacity: visible.howItWorks ? 1 : 0,
            transform: visible.howItWorks ? "translateY(0)" : "translateY(40px)",
            transition: "all 0.7s ease"
          }}>

          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3"
              style={{ color: "#E67E22" }}>
              Simple as 1, 2, 3
            </p>
            <h2
              className="text-4xl font-bold mb-4"
              style={{ color: "#2C3E50", fontFamily: "var(--font-playfair)" }}>
              How Soufra works
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">

            {/* Connector line */}
            <div
              className="hidden md:block absolute top-16 left-1/3 right-1/3 h-0.5"
              style={{ backgroundColor: "#E5E7EB" }}
            />

            {[
              {
                step: "01",
                title: "Tell us about you",
                desc: "Set your fitness goals, cuisine preferences, allergies and weekly budget. Takes less than 2 minutes.",
                icon: SlidersHorizontal,
                color: "#FFF7F0",
                iconColor: "#E67E22",
              },
              {
                step: "02",
                title: "Get your meal plan",
                desc: "AI generates 21 culturally authentic recipes tailored exactly to your profile. Breakfast, lunch and dinner sorted.",
                icon: CalendarDays,
                color: "#F0F7F7",
                iconColor: "#2D5F5D",
              },
              {
                step: "03",
                title: "Shop smarter",
                desc: "Your grocery list is automatically created with estimated DH prices. Check items off as you shop.",
                icon: ShoppingBasket,
                color: "#F0FFF4",
                iconColor: "#27AE60",
              },
            ].map(({ step, title, desc, icon: Icon, color, iconColor }) => (
              <div key={step} className="text-center relative">
                <div
                  className="w-32 h-32 rounded-3xl flex items-center justify-center mx-auto mb-6"
                  style={{ backgroundColor: color }}>
                  <Icon size={48} style={{ color: iconColor }} strokeWidth={1.5} />
                </div>
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: "#2D5F5D", marginTop: "-8px" }}>
                  {step.replace("0", "")}
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: "#2C3E50" }}>
                  {title}
                </h3>
                <p style={{ color: "#6B7280", lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section
        id="about"
        className="py-24 relative overflow-hidden"
        style={{ backgroundColor: "#2C3E50" }}>

        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4A574' fill-opacity='1'%3E%3Cpath d='M50 50v-10h-4v10h-10v4h10v10h4v-10h10v-4h-10zm0-40V0h-4v10h-10v4h10v10h4V14h10v-4h-10zM10 50v-10H6v10H-4v4h10v10h4v-10h10v-4H10zM10 10V0H6v10H-4v4h10v10h4V14h10v-4H10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div
          ref={setRef("cta")}
          className="max-w-4xl mx-auto px-6 text-center relative z-10"
          style={{
            opacity: visible.cta ? 1 : 0,
            transform: visible.cta ? "translateY(0)" : "translateY(40px)",
            transition: "all 0.7s ease"
          }}>

          <div className="text-6xl mb-6">🍽️</div>

          <h2
            className="text-5xl font-bold text-white mb-6"
            style={{ fontFamily: "var(--font-playfair)" }}>
            Ready to eat better,
            <br />
            <span style={{ color: "#D4A574" }}>the Soufra way?</span>
          </h2>

          <p className="text-xl mb-10" style={{ color: "rgba(255,255,255,0.7)" }}>
            Join food lovers across Morocco and the Mediterranean who've discovered
            the joy of culturally intelligent meal planning.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/register"
              className="flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-white text-lg transition-all hover:shadow-2xl hover:scale-105"
              style={{ backgroundColor: "#E67E22" }}>
              Start for free
              <ChevronRight size={20} />
            </Link>
            <Link
              href="/login"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-medium text-lg transition-all hover:shadow-lg"
              style={{
                backgroundColor: "rgba(255,255,255,0.1)",
                color: "white",
                border: "2px solid rgba(255,255,255,0.2)"
              }}>
              Sign in
            </Link>
          </div>

          <p className="mt-6 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Free to use · No credit card required · Setup in 2 minutes
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8" style={{ backgroundColor: "#1a2530" }}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Soufra" width={28} height={28} />
            <span className="font-bold" style={{ color: "#D4A574", fontFamily: "var(--font-playfair)" }}>
              Soufra
            </span>
          </div>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            Made with ❤️ for Moroccan & Mediterranean food lovers
          </p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Sign in
            </Link>
            <Link href="/register" className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}