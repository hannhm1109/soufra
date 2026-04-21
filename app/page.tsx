"use client"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Sparkles, ShoppingCart, Brain, UtensilsCrossed,
  ChevronRight, Check, ArrowRight, Flame
} from "lucide-react"

// Sample week data — realistic Moroccan + Mediterranean week
const SAMPLE_WEEK = [
  {
    day: "Mon",
    breakfast: { name: "Msemen with Honey & Argan", cal: 380 },
    lunch:     { name: "Chicken Tagine with Preserved Lemon", cal: 520 },
    dinner:    { name: "Harira Soup + Dates", cal: 310 },
  },
  {
    day: "Tue",
    breakfast: { name: "Oat Bowl with Banana & Almonds", cal: 360 },
    lunch:     { name: "Couscous with Seven Vegetables", cal: 540 },
    dinner:    { name: "Grilled Sardines & Chermoula Salad", cal: 290 },
  },
  {
    day: "Wed",
    breakfast: { name: "Batbout with Egg & Cheese", cal: 400 },
    lunch:     { name: "Shakshuka with Crusty Bread", cal: 480 },
    dinner:    { name: "Lentil Soup & Olive Oil Drizzle", cal: 320 },
  },
  {
    day: "Thu",
    breakfast: { name: "Greek Yogurt with Dates & Walnuts", cal: 340 },
    lunch:     { name: "Lamb Kefta with Roasted Tomatoes", cal: 510 },
    dinner:    { name: "Tabbouleh + Hummus + Pita", cal: 350 },
  },
  {
    day: "Fri",
    breakfast: { name: "Semolina Porridge with Raisins", cal: 390 },
    lunch:     { name: "Friday Couscous with Tfaya", cal: 560 },
    dinner:    { name: "Zaalouk & Warm Bread", cal: 280 },
  },
  {
    day: "Sat",
    breakfast: { name: "Avocado & Egg Toast (Moroccan spiced)", cal: 420 },
    lunch:     { name: "Bastilla au Poulet", cal: 530 },
    dinner:    { name: "Grilled Chicken & Seasonal Salad", cal: 300 },
  },
  {
    day: "Sun",
    breakfast: { name: "Creamy Oats with Almond Butter", cal: 370 },
    lunch:     { name: "Mediterranean Stuffed Peppers", cal: 490 },
    dinner:    { name: "Light Vegetable Tagine", cal: 310 },
  },
]

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
        ([entry]) => { if (entry.isIntersecting) setVisible(prev => ({ ...prev, [key]: true })) },
        { threshold: 0.1 }
      )
      observer.observe(el)
      observers.push(observer)
    })
    return () => observers.forEach(o => o.disconnect())
  }, [])

  const setRef = (key: string) => (el: HTMLDivElement | null) => { refs.current[key] = el }

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
            <Image src="/logo.png" alt="Soufra" width={48} height={48} />
            <span className="text-2xl font-bold" style={{ color: "#2D5F5D", fontFamily: "var(--font-playfair)" }}>
              Soufra
            </span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            {[["Why Soufra", "#features"], ["Sample week", "#sample"], ["How it works", "#how-it-works"]].map(([label, href]) => (
              <a key={label} href={href}
                className="text-sm font-medium transition-colors hover:opacity-70"
                style={{ color: "#2C3E50" }}>
                {label}
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="text-sm font-medium px-4 py-2 rounded-xl transition-all"
              style={{ color: "#2D5F5D" }}>
              Sign in
            </Link>
            <Link href="/register"
              className="text-sm font-semibold px-5 py-2.5 rounded-xl text-white transition-all hover:shadow-lg hover:scale-105"
              style={{ backgroundColor: "#E67E22" }}>
              Build my meal plan
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="min-h-screen flex items-center relative overflow-hidden pt-20">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%232D5F5D' fill-opacity='1'%3E%3Cpath d='M50 50v-10h-4v10h-10v4h10v10h4v-10h10v-4h-10zm0-40V0h-4v10h-10v4h10v10h4V14h10v-4h-10zM10 50v-10H6v10H-4v4h10v10h4v-10h10v-4H10zM10 10V0H6v10H-4v4h10v10h4V14h10v-4H10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />
        <div className="absolute top-20 right-0 w-96 h-96 rounded-full opacity-10"
          style={{ backgroundColor: "#D4A574", transform: "translate(30%, -20%)" }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full opacity-10"
          style={{ backgroundColor: "#2D5F5D", transform: "translate(-30%, 30%)" }} />

        <div className="max-w-6xl mx-auto px-6 w-full">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-8"
                style={{ backgroundColor: "#F0F7F7", color: "#2D5F5D" }}>
                <span>🇲🇦</span>
                Meal planning built for Moroccan kitchens
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold leading-tight mb-6"
                style={{ color: "#2C3E50", fontFamily: "var(--font-playfair)" }}>
                21 meals.
                <br />
                <span style={{ color: "#2D5F5D" }}>One week.</span>
                <br />
                <span style={{ color: "#D4A574" }}>Your budget.</span>
              </h1>

              <p className="text-xl leading-relaxed mb-8 max-w-lg" style={{ color: "#6B7280" }}>
                Soufra creates a full 7-day meal plan with <strong style={{ color: "#2C3E50" }}>Moroccan and Mediterranean recipes</strong>,
                a grocery list priced in MAD, and nutrition targets tailored to your body.
              </p>

              {/* Proof chips */}
              <div className="flex flex-wrap items-center gap-3 mb-8">
                {[
                  { label: "21 meals per week" },
                  { label: "Grocery list in MAD" },
                  { label: "Adapts to your taste" },
                ].map(({ label }) => (
                  <div key={label}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{ backgroundColor: "#F0F7F7", color: "#2D5F5D", border: "1px solid #D4E8E7" }}>
                    <Check size={13} strokeWidth={2.5} />
                    {label}
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="flex items-center gap-4 flex-wrap">
                <Link href="/register"
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white text-lg transition-all hover:shadow-xl hover:scale-105"
                  style={{ backgroundColor: "#E67E22" }}>
                  Build my meal plan
                  <ArrowRight size={20} />
                </Link>
                <a href="#sample"
                  className="flex items-center gap-2 px-6 py-4 rounded-2xl font-medium transition-all hover:shadow-md"
                  style={{ color: "#2D5F5D", backgroundColor: "white", border: "2px solid #E5E7EB" }}>
                  See a sample week
                </a>
              </div>

              <p className="mt-4 text-sm" style={{ color: "#9CA3AF" }}>
                Free to use. No credit card. Setup in 2 minutes.
              </p>
            </div>

            {/* Right — simplified product mock */}
            <div className="relative hidden lg:block">
              <div className="rounded-3xl p-6 shadow-2xl" style={{ backgroundColor: "white" }}>

                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="font-bold" style={{ color: "#2C3E50" }}>Good morning, Sara</p>
                    <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>Monday — Week of Apr 14</p>
                  </div>
                  <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white"
                    style={{ backgroundColor: "#2D5F5D" }}>
                    <Sparkles size={11} />
                    Plan ready
                  </span>
                </div>

                {/* Today's 3 meals */}
                <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#9CA3AF" }}>
                  Today&apos;s meals
                </p>
                <div className="space-y-2.5 mb-5">
                  {[
                    { label: "Breakfast", meal: "Msemen with Honey & Argan Oil", cal: 380, color: "#FFF7F0", dot: "#E67E22" },
                    { label: "Lunch",     meal: "Chicken Tagine with Preserved Lemon", cal: 520, color: "#F0F7F7", dot: "#2D5F5D" },
                    { label: "Dinner",    meal: "Harira Soup + Dates",  cal: 310, color: "#F5F3FF", dot: "#6366F1" },
                  ].map(({ label, meal, cal, color, dot }) => (
                    <div key={label} className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: color }}>
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium" style={{ color: "#9CA3AF" }}>{label}</p>
                        <p className="text-sm font-semibold truncate" style={{ color: "#2C3E50" }}>{meal}</p>
                      </div>
                      <span className="text-xs font-medium flex-shrink-0" style={{ color: "#E67E22" }}>
                        {cal} kcal
                      </span>
                    </div>
                  ))}
                </div>

                {/* Budget module */}
                <div className="p-4 rounded-2xl" style={{ backgroundColor: "#F0F7F7" }}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold" style={{ color: "#2D5F5D" }}>
                      Weekly grocery budget
                    </span>
                    <span className="text-sm font-bold" style={{ color: "#27AE60" }}>480 / 600 DH</span>
                  </div>
                  <div className="h-2 rounded-full" style={{ backgroundColor: "#D4E8E7" }}>
                    <div className="h-2 rounded-full" style={{ width: "80%", backgroundColor: "#27AE60" }} />
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: "#2D5F5D" }}>120 DH under budget</p>
                </div>
              </div>

              {/* Floating chip */}
              <div className="absolute -bottom-5 -left-6 p-4 rounded-2xl shadow-lg flex items-center gap-3"
                style={{ backgroundColor: "white" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: "#F0FFF4" }}>
                  <Brain size={20} style={{ color: "#27AE60" }} />
                </div>
                <div>
                  <p className="text-xs font-bold" style={{ color: "#2C3E50" }}>Adapted to your taste</p>
                  <p className="text-xs" style={{ color: "#6B7280" }}>Learns from your ratings</p>
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
              { number: "21", label: "Meals planned per week" },
              { number: "100+", label: "Moroccan & Mediterranean recipes" },
              { number: "MAD", label: "Grocery prices in dirhams" },
              { number: "30s", label: "To generate a full plan" },
            ].map(({ number, label }) => (
              <div key={label} className="text-center">
                <p className="text-4xl font-bold mb-1" style={{ color: "#D4A574" }}>{number}</p>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section id="features" className="py-24">
        <div ref={setRef("problem")} className="max-w-6xl mx-auto px-6"
          style={{ opacity: visible.problem ? 1 : 0, transform: visible.problem ? "translateY(0)" : "translateY(40px)", transition: "all 0.7s ease" }}>
          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#E67E22" }}>
              Why Soufra
            </p>
            <h2 className="text-4xl font-bold mb-4" style={{ color: "#2C3E50", fontFamily: "var(--font-playfair)" }}>
              Most meal planners were not built<br />for how people eat in Morocco.
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "#6B7280" }}>
              Generic apps suggest quinoa bowls and price ingredients in euros. Soufra knows your kitchen.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                img: "/icons/problem-recipes.png",
                problem: "Recipes that fit your kitchen",
                desc: "Not quinoa and kale. Tagine, couscous, harira, msemen, bastilla — real Moroccan and Mediterranean dishes made from ingredients you actually buy at the souk.",
                color: "#FFF7F0",
                border: "#E67E22",
              },
              {
                img: "/icons/problem-price.png",
                problem: "Prices in real dirhams",
                desc: "The grocery list shows estimated costs in MAD based on Moroccan market pricing — souk, supermarket, or premium. You see your weekly spend before you shop.",
                color: "#F0FFF4",
                border: "#27AE60",
              },
              {
                img: "/icons/problem-waste.png",
                problem: "Plans that reduce waste",
                desc: "Leftover chicken tagine becomes tomorrow's lunch. Soufra connects your meals across the week so nothing goes to waste and your grocery list stays lean.",
                color: "#F0F7FF",
                border: "#3498DB",
              },
            ].map(({ img, problem, desc, color, border }) => (
              <div key={problem}
                className="p-8 rounded-3xl border-2 transition-all hover:shadow-lg hover:-translate-y-1"
                style={{ backgroundColor: color, borderColor: border }}>
                <div className="w-14 h-14 mb-4">
                  <img src={img} alt={problem} className="w-full h-full object-contain" />
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: "#2C3E50" }}>{problem}</h3>
                <p style={{ color: "#6B7280", lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SAMPLE WEEK SECTION */}
      <section id="sample" className="py-24" style={{ backgroundColor: "#F7F4F0" }}>
        <div ref={setRef("sample")} className="max-w-6xl mx-auto px-6"
          style={{ opacity: visible.sample ? 1 : 0, transform: visible.sample ? "translateY(0)" : "translateY(40px)", transition: "all 0.7s ease" }}>
          <div className="text-center mb-12">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#E67E22" }}>
              What you get
            </p>
            <h2 className="text-4xl font-bold mb-4" style={{ color: "#2C3E50", fontFamily: "var(--font-playfair)" }}>
              A full week, ready in 30 seconds
            </h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: "#6B7280" }}>
              Here is what a Soufra week looks like for a user targeting weight loss, with a 600 DH supermarket budget.
            </p>
          </div>

          {/* Week grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
            {SAMPLE_WEEK.map((day) => (
              <div key={day.day} className="rounded-2xl p-4 flex flex-col gap-3"
                style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
                <p className="text-xs font-bold uppercase tracking-widest text-center" style={{ color: "#2D5F5D" }}>
                  {day.day}
                </p>
                {[
                  { meal: day.breakfast, bg: "#FFF7F0", dot: "#E67E22" },
                  { meal: day.lunch,     bg: "#F0F7F7", dot: "#2D5F5D" },
                  { meal: day.dinner,    bg: "#F5F3FF", dot: "#6366F1" },
                ].map(({ meal, bg, dot }, i) => (
                  <div key={i} className="p-2.5 rounded-xl" style={{ backgroundColor: bg }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: dot }} />
                      <span className="text-xs font-medium" style={{ color: dot }}>
                        {["B", "L", "D"][i]}
                      </span>
                    </div>
                    <p className="text-xs font-semibold leading-snug" style={{ color: "#2C3E50", fontSize: "10px" }}>
                      {meal.name}
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#9CA3AF", fontSize: "10px" }}>
                      {meal.cal} kcal
                    </p>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Summary chips */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {[
              { icon: <Flame size={14} />, label: "~1,210 kcal/day · weight-loss goal", color: "#E67E22", bg: "#FFF7F0" },
              { icon: <ShoppingCart size={14} />, label: "Est. 480 DH / week — supermarket basket", color: "#2D5F5D", bg: "#F0F7F7" },
              { icon: <UtensilsCrossed size={14} />, label: "Moroccan + Mediterranean recipes", color: "#6366F1", bg: "#F5F3FF" },
            ].map(({ icon, label, color, bg }) => (
              <div key={label}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium"
                style={{ backgroundColor: bg, color }}>
                {icon}
                {label}
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <p className="text-sm mb-4" style={{ color: "#9CA3AF" }}>
              Your plan adapts to your calorie target, allergies, cuisine preferences, and budget.
            </p>
            <Link href="/register"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-white text-lg transition-all hover:shadow-xl hover:scale-105"
              style={{ backgroundColor: "#E67E22" }}>
              Build my meal plan
              <ArrowRight size={20} />
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24" style={{ backgroundColor: "#2D5F5D" }}>
        <div ref={setRef("features")} className="max-w-6xl mx-auto px-6"
          style={{ opacity: visible.features ? 1 : 0, transform: visible.features ? "translateY(0)" : "translateY(40px)", transition: "all 0.7s ease" }}>

          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#D4A574" }}>
              Why it works
            </p>
            <h2 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: "var(--font-playfair)" }}>
              Why Soufra feels more useful<br />after the first week
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                img: "/icons/feature-ai.png",
                title: "A weekly plan matched to your body",
                desc: "Your calorie target is calculated from your age, weight, height, and fitness goal. Every meal fits your target — breakfast at 25%, lunch at 40%, dinner at 35%.",
                highlight: "Calorie-matched to you",
                color: "#E67E22",
              },
              {
                img: "/icons/feature-brain.png",
                title: "Gets better every time you rate",
                desc: "Like a recipe? Dislike one? After a few ratings, Soufra detects your patterns — preferred cuisines, difficulty, cooking time — and adapts every future plan accordingly.",
                highlight: "Learns from your feedback",
                color: "#D4A574",
              },
              {
                img: "/icons/feature-grocery.png",
                title: "Grocery list with real Moroccan prices",
                desc: "Every ingredient across all 21 meals is aggregated, categorized, and priced in MAD. Choose your market tier — souk, supermarket, or premium. See your total before you shop.",
                highlight: "Priced in MAD",
                color: "#27AE60",
              },
              {
                img: "/icons/feature-recipe.png",
                title: "Recipes made for your kitchen",
                desc: "100+ Moroccan and Mediterranean recipes using ingredients from any Moroccan market. Tagines, couscous, harira, bastilla, shakshuka, stuffed vegetables — no exotic substitutes.",
                highlight: "100+ authentic recipes",
                color: "#3498DB",
              },
            ].map(({ img, title, desc, highlight, color }) => (
              <div key={title}
                className="p-8 rounded-3xl transition-all hover:-translate-y-1"
                style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 p-2"
                  style={{ backgroundColor: `${color}30` }}>
                  <img src={img} alt={title} className="w-full h-full object-contain" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
                <p className="mb-4" style={{ color: "rgba(255,255,255,0.7)", lineHeight: 1.7 }}>{desc}</p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold"
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
        <div ref={setRef("howItWorks")} className="max-w-6xl mx-auto px-6"
          style={{ opacity: visible.howItWorks ? 1 : 0, transform: visible.howItWorks ? "translateY(0)" : "translateY(40px)", transition: "all 0.7s ease" }}>

          <div className="text-center mb-16">
            <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: "#E67E22" }}>
              Simple as 1, 2, 3
            </p>
            <h2 className="text-4xl font-bold mb-4" style={{ color: "#2C3E50", fontFamily: "var(--font-playfair)" }}>
              From setup to grocery list in minutes
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-16 left-1/3 right-1/3 h-0.5"
              style={{ backgroundColor: "#E5E7EB" }} />
            {[
              {
                step: "1",
                title: "Tell us about you",
                desc: "Set your fitness goal, cuisine preferences, allergies, shopping style, and weekly grocery budget. Takes under 2 minutes.",
                img: "/icons/how-setup.png",
                color: "#FFF7F0",
              },
              {
                step: "2",
                title: "Get your 21-meal plan",
                desc: "Soufra generates breakfast, lunch, and dinner for 7 days — tailored to your calories, preferences, and budget. Done in 30 seconds.",
                img: "/icons/how-plan.png",
                color: "#F0F7F7",
              },
              {
                step: "3",
                title: "Shop with your list",
                desc: "Your grocery list is auto-generated with estimated prices in MAD. Check items off as you shop. Scan receipts to improve future price estimates.",
                img: "/icons/how-shop.png",
                color: "#F0FFF4",
              },
            ].map(({ step, title, desc, img, color }) => (
              <div key={step} className="text-center relative">
                <div className="w-32 h-32 rounded-3xl flex items-center justify-center mx-auto mb-6 p-7"
                  style={{ backgroundColor: color }}>
                  <img src={img} alt={title} className="w-full h-full object-contain" />
                </div>
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ backgroundColor: "#2D5F5D", marginTop: "-8px" }}>
                  {step}
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: "#2C3E50" }}>{title}</h3>
                <p style={{ color: "#6B7280", lineHeight: 1.7 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="about" className="py-24 relative overflow-hidden" style={{ backgroundColor: "#2C3E50" }}>
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23D4A574' fill-opacity='1'%3E%3Cpath d='M50 50v-10h-4v10h-10v4h10v10h4v-10h10v-4h-10zm0-40V0h-4v10h-10v4h10v10h4V14h10v-4h-10zM10 50v-10H6v10H-4v4h10v10h4v-10h10v-4H10zM10 10V0H6v10H-4v4h10v10h4V14h10v-4H10z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")` }} />

        <div ref={setRef("cta")} className="max-w-4xl mx-auto px-6 text-center relative z-10"
          style={{ opacity: visible.cta ? 1 : 0, transform: visible.cta ? "translateY(0)" : "translateY(40px)", transition: "all 0.7s ease" }}>

          <h2 className="text-5xl font-bold text-white mb-6" style={{ fontFamily: "var(--font-playfair)" }}>
            Your first meal plan
            <br />
            <span style={{ color: "#D4A574" }}>is 30 seconds away.</span>
          </h2>

          <p className="text-xl mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>
            Tell Soufra your goal, your budget, and your favourite cuisines.
            Get a full week of Moroccan and Mediterranean meals — with your grocery list in MAD.
          </p>

          <p className="text-sm mb-10" style={{ color: "rgba(255,255,255,0.4)" }}>
            21 meals. Grocery list included. Budget-aware in MAD.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register"
              className="flex items-center gap-2 px-10 py-4 rounded-2xl font-bold text-white text-lg transition-all hover:shadow-2xl hover:scale-105"
              style={{ backgroundColor: "#E67E22" }}>
              Build my meal plan
              <ChevronRight size={20} />
            </Link>
            <Link href="/login"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-medium text-lg transition-all hover:shadow-lg"
              style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "white", border: "2px solid rgba(255,255,255,0.2)" }}>
              Sign in
            </Link>
          </div>

          <p className="mt-6 text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
            Free to use. No credit card required.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8" style={{ backgroundColor: "#1a2530" }}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Soufra" width={36} height={36} />
            <span className="font-bold" style={{ color: "#D4A574", fontFamily: "var(--font-playfair)" }}>Soufra</span>
          </div>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>
            Built for Moroccan and Mediterranean kitchens
          </p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Sign in</Link>
            <Link href="/register" className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Register</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
