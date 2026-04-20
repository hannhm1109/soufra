"use client"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { useOnboardingStore } from "@/lib/onboarding-store"
import { calculateCalories } from "@/lib/nutrition"
import { assessBudgetFeasibility } from "@/lib/budget-utils"
import {
  User,
  Target,
  UtensilsCrossed,
  AlertCircle,
  Wallet,
  ChevronRight,
  ChevronLeft,
  Check,
  ShoppingBag,
  ShoppingCart,
  Star,
} from "lucide-react"

const steps = [
  { id: 1, title: "About you", icon: User },
  { id: 2, title: "Your goal", icon: Target },
  { id: 3, title: "Cuisines", icon: UtensilsCrossed },
  { id: 4, title: "Allergies", icon: AlertCircle },
  { id: 5, title: "Budget", icon: Wallet },
]

const fitnessGoals = [
  { value: "lose_weight", label: "Lose Weight",  img: "/icons/lose-weight.png",  iconBg: "#FEF2F2", desc: "Calorie deficit plan" },
  { value: "gain_muscle", label: "Gain Muscle",  img: "/icons/gain-muscle.png",  iconBg: "#EFF6FF", desc: "High protein plan"    },
  { value: "maintain",    label: "Stay Healthy", img: "/icons/stay-healthy.png", iconBg: "#F0FDF4", desc: "Balanced nutrition"   },
  { value: "eat_better",  label: "Eat Better",   img: "/icons/eat-better.png",   iconBg: "#FFF7ED", desc: "Improve food quality" },
]

const activityLevels = [
  { value: "sedentary",   label: "Sedentary",   desc: "No exercise" },
  { value: "light",       label: "Light",       desc: "1-3 d/wk"    },
  { value: "moderate",    label: "Moderate",    desc: "3-5 d/wk"    },
  { value: "very_active", label: "Very Active", desc: "6-7 d/wk"    },
]

const cuisineOptions = [
  { value: "moroccan",       label: "Moroccan",           img: "/icons/morrocan.png",       iconBg: "#FFFBEB", tagline: "Tagine, couscous & harira"       },
  { value: "mediterranean",  label: "Mediterranean",      img: "/icons/mediterranean.png",  iconBg: "#F0F9FF", tagline: "Grilled fish, salads & olive oil" },
  { value: "healthy",        label: "Healthy Essentials", img: "/icons/healthy.png",        iconBg: "#F0FDF4", tagline: "Clean proteins & simple sides"    },
  { value: "middle_eastern", label: "Middle Eastern",     img: "/icons/middle-eastern.png", iconBg: "#F5F3FF", tagline: "Falafel, lentils & wraps"         },
  { value: "italian",        label: "Italian",            img: "/icons/italian.png",        iconBg: "#FEF2F2", tagline: "Pasta, risotto & simple sauces"   },
]

const allergyOptions = [
  { value: "gluten",    label: "Gluten",    img: "/icons/allergy-gluten.png"    },
  { value: "lactose",   label: "Lactose",   img: "/icons/allergy-lactose.png"   },
  { value: "peanuts",   label: "Peanuts",   img: "/icons/allergy-peanuts.png"   },
  { value: "shellfish", label: "Shellfish", img: "/icons/allergy-shellfish.png" },
  { value: "eggs",      label: "Eggs",      img: "/icons/allergy-eggs.png"      },
  { value: "soy",       label: "Soy",       img: "/icons/allergy-soy.png"       },
]


const marketTierOptions = [
  { value: "souk",        label: "Souk",        icon: ShoppingBag,  desc: "Local market prices" },
  { value: "supermarket", label: "Supermarket",  icon: ShoppingCart, desc: "Branded + fresh"      },
  { value: "premium",     label: "Premium",      icon: Star,         desc: "Higher-end basket"    },
]

const INPUT_CLASS =
  "w-full px-3 py-3 rounded-xl border border-gray-200 bg-white outline-none text-center text-lg font-semibold transition-colors focus:border-[#2D5F5D] focus:ring-1 focus:ring-[#2D5F5D]"

const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94]

const stepVariants = {
  enter: (dir: string) => ({ x: dir === "right" ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: string) => ({ x: dir === "right" ? -48 : 48, opacity: 0 }),
}

export default function OnboardingPage() {
  const router = useRouter()
  const { step, data, setStep, updateData } = useOnboardingStore()
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [direction, setDirection] = useState<"right" | "left">("right")
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const previewCalories = useMemo(() => calculateCalories(data), [data])
  const budgetAssessment = useMemo(
    () =>
      assessBudgetFeasibility({
        calorieTarget: previewCalories,
        weeklyBudget: data.weeklyBudget ? Number.parseFloat(data.weeklyBudget) : null,
        marketTier: (data.marketTier as "souk" | "supermarket" | "premium") || "supermarket",
        cuisineCount: data.cuisines.length,
      }),
    [data, previewCalories]
  )

  const toggleArray = (field: "cuisines" | "allergies", value: string) => {
    const current = data[field]
    const updated = current.includes(value)
      ? current.filter((entry) => entry !== value)
      : [...current, value]
    updateData({ [field]: updated })
  }

  const goNext = () => {
    setDirection("right")
    setStep(step + 1)
  }

  const goBack = () => {
    setDirection("left")
    setStep(step - 1)
  }

  const handleFinish = async () => {
    if (!step5Valid) return
    setLoading(true)
    setSubmitError("")
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        router.push("/dashboard")
      } else {
        const body = await res.json().catch(() => ({}))
        setSubmitError(body.error || "Something went wrong. Please try again.")
        setLoading(false)
      }
    } catch {
      setSubmitError("Network error. Please check your connection and try again.")
      setLoading(false)
    }
  }

  const step1Valid = !!data.gender && !!data.age && !!data.weight && !!data.height
  const step2Valid = !!data.fitnessGoal && !!data.activityLevel
  const step3Valid = data.cuisines.length > 0
  const step5Valid =
    Number.isFinite(Number.parseFloat(data.weeklyBudget)) &&
    Number.parseFloat(data.weeklyBudget) > 0

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: "#FDFAF6" }}>
        <div className="text-7xl mb-8" style={{ animation: "dotBounce 1.2s ease-in-out infinite" }}>🍽️</div>
        <h2 className="text-2xl font-bold mb-2" style={{ color: "#2C3E50", fontFamily: "var(--font-playfair)" }}>
          Building your meal plan...
        </h2>
        <p className="text-sm mb-8" style={{ color: "#9CA3AF" }}>
          Personalizing recipes and pricing just for you
        </p>
        <div className="flex gap-2">
          {[0, 150, 300].map((delay) => (
            <div
              key={delay}
              className="w-2.5 h-2.5 rounded-full dot-bounce"
              style={{ backgroundColor: "#2D5F5D", animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FDFAF6" }}>
      <div className="p-6 flex items-center justify-between">
        <span className="text-2xl font-bold" style={{ color: "#2D5F5D", fontFamily: "var(--font-playfair)" }}>
          Soufra
        </span>
        <span className="text-sm font-medium px-3 py-1 rounded-full" style={{ backgroundColor: "#E8F0EF", color: "#2D5F5D" }}>
          {step} / 5
        </span>
      </div>

      <div className="px-6 mb-8">
        <div className="h-1.5 rounded-full mb-5" style={{ backgroundColor: "#E5E7EB" }}>
          <div
            className="h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${(step / 5) * 100}%`, backgroundColor: "#2D5F5D" }}
          />
        </div>

        <div className="flex justify-between">
          {steps.map((item) => {
            const Icon = item.icon
            const done = step > item.id
            const current = step === item.id
            return (
              <div key={item.id} className="flex flex-col items-center gap-1.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    backgroundColor: done ? "#2D5F5D" : current ? "white" : "#F3F4F6",
                    border: current ? "2px solid #2D5F5D" : "2px solid transparent",
                    boxShadow: current ? "0 0 0 3px #E8F0EF" : "none",
                  }}
                >
                  {done ? <Check size={16} color="white" strokeWidth={2.5} /> : <Icon size={16} color={current ? "#2D5F5D" : "#9CA3AF"} />}
                </div>
                <span className="text-[10px] font-medium hidden sm:block" style={{ color: current || done ? "#2D5F5D" : "#9CA3AF" }}>
                  {item.title}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={step}
          custom={direction}
          variants={stepVariants}
          initial={mounted ? "enter" : false}
          animate="center"
          exit="exit"
          transition={{ duration: 0.28, ease: EASE }}
          className="w-full max-w-lg"
        >
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#2D5F5D" }}>
                  <User size={32} color="white" />
                </div>
                <h2 className="text-3xl font-bold mb-2" style={{ color: "#2C3E50" }}>Tell us about yourself</h2>
                <p style={{ color: "#6B7280" }}>This helps us calculate your calorie target accurately</p>
              </div>

              <div>
                <p className="text-sm font-medium mb-3 text-center" style={{ color: "#6B7280" }}>
                  Biological sex <span style={{ color: "#9CA3AF" }}>for calorie calculation</span>
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: "male", label: "Male", emoji: "♂" },
                    { value: "female", label: "Female", emoji: "♀" },
                  ].map((option) => {
                    const selected = data.gender === option.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => updateData({ gender: option.value })}
                        className="p-4 rounded-2xl border-2 flex items-center justify-center gap-2 transition-all duration-200 hover:shadow-md active:scale-[0.97]"
                        style={{
                          borderColor: selected ? "#2D5F5D" : "#E5E7EB",
                          backgroundColor: selected ? "#F0F7F7" : "white",
                          transform: selected ? "scale(1.02)" : "scale(1)",
                        }}
                      >
                        <span className="text-xl">{option.emoji}</span>
                        <span className="font-semibold" style={{ color: selected ? "#2D5F5D" : "#2C3E50" }}>{option.label}</span>
                        {selected && <Check size={16} style={{ color: "#2D5F5D" }} />}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Age", field: "age", placeholder: "25", unit: "yrs" },
                  { label: "Weight", field: "weight", placeholder: "65", unit: "kg" },
                  { label: "Height", field: "height", placeholder: "170", unit: "cm" },
                ].map(({ label, field, placeholder, unit }) => (
                  <div key={field}>
                    <label className="block text-sm font-medium mb-1" style={{ color: "#2C3E50" }}>{label}</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder={placeholder}
                        value={data[field as keyof typeof data] as string}
                        onChange={(e) => updateData({ [field]: e.target.value })}
                        className={INPUT_CLASS}
                      />
                      <span className="absolute right-3 top-3.5 text-xs" style={{ color: "#9CA3AF" }}>{unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "#2D5F5D" }}>
                  <Target size={24} color="white" />
                </div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: "#2C3E50" }}>What&apos;s your goal?</h2>
                <p className="text-sm" style={{ color: "#6B7280" }}>We&apos;ll tailor your meal plan around it</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                {fitnessGoals.map((goal) => {
                  const selected = data.fitnessGoal === goal.value
                  return (
                    <button
                      key={goal.value}
                      onClick={() => updateData({ fitnessGoal: goal.value })}
                      className="p-3 rounded-2xl border-2 text-left transition-all duration-200 hover:shadow-md active:scale-[0.97]"
                      style={{
                        borderColor: selected ? "#2D5F5D" : "#E5E7EB",
                        backgroundColor: selected ? "#F0F7F7" : "white",
                        transform: selected ? "scale(1.02)" : "scale(1)",
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center p-1.5"
                          style={{ backgroundColor: goal.iconBg }}
                        >
                          <img src={goal.img} alt={goal.label} className="w-full h-full object-contain" />
                        </div>
                        {selected && (
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: "#2D5F5D" }}
                          >
                            <Check size={11} color="white" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <div className="font-semibold text-sm" style={{ color: "#2C3E50" }}>{goal.label}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{goal.desc}</div>
                    </button>
                  )
                })}
              </div>

              <div>
                <p className="text-sm font-medium mb-2.5" style={{ color: "#2C3E50" }}>Activity Level</p>
                <div className="grid grid-cols-4 gap-2">
                  {activityLevels.map((level) => {
                    const selected = data.activityLevel === level.value
                    return (
                      <button
                        key={level.value}
                        onClick={() => updateData({ activityLevel: level.value })}
                        className="py-2.5 px-1.5 rounded-xl border-2 text-center transition-all duration-200 hover:shadow-sm active:scale-[0.97]"
                        style={{
                          borderColor: selected ? "#2D5F5D" : "#E5E7EB",
                          backgroundColor: selected ? "#F0F7F7" : "white",
                        }}
                      >
                        <div className="font-semibold text-xs" style={{ color: selected ? "#2D5F5D" : "#2C3E50" }}>
                          {level.label}
                        </div>
                        <div className="text-[10px] mt-0.5 leading-tight" style={{ color: "#9CA3AF" }}>
                          {level.desc}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "#2D5F5D" }}>
                  <UtensilsCrossed size={24} color="white" />
                </div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: "#2C3E50" }}>Favorite cuisines?</h2>
                <p className="text-sm" style={{ color: "#6B7280" }}>Pick all that you love — mix and match freely</p>
              </div>

              <div className="space-y-2">
                {cuisineOptions.map((cuisine) => {
                  const selected = data.cuisines.includes(cuisine.value)
                  return (
                    <button
                      key={cuisine.value}
                      onClick={() => toggleArray("cuisines", cuisine.value)}
                      className="w-full p-3 rounded-2xl border-2 flex items-center gap-3 text-left transition-all duration-200 hover:shadow-md active:scale-[0.98]"
                      style={{
                        borderColor: selected ? "#2D5F5D" : "#E5E7EB",
                        backgroundColor: selected ? "#F0F7F7" : "white",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 p-1.5"
                        style={{ backgroundColor: cuisine.iconBg }}
                      >
                        <img src={cuisine.img} alt={cuisine.label} className="w-full h-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm" style={{ color: "#2C3E50" }}>{cuisine.label}</div>
                        <div className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{cuisine.tagline}</div>
                      </div>
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200"
                        style={{
                          borderColor: selected ? "#2D5F5D" : "#D1D5DB",
                          backgroundColor: selected ? "#2D5F5D" : "transparent",
                        }}
                      >
                        {selected && <Check size={11} color="white" strokeWidth={3} />}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "#E67E22" }}>
                  <AlertCircle size={24} color="white" />
                </div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: "#2C3E50" }}>Any allergies?</h2>
                <p className="text-sm" style={{ color: "#6B7280" }}>We&apos;ll make sure to avoid these completely</p>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                {allergyOptions.map((allergy) => {
                  const selected = data.allergies.includes(allergy.value)
                  return (
                    <button
                      key={allergy.value}
                      onClick={() => toggleArray("allergies", allergy.value)}
                      className="p-3 rounded-2xl border-2 flex items-center gap-3 transition-all duration-200 hover:shadow-md active:scale-[0.97]"
                      style={{
                        borderColor: selected ? "#E67E22" : "#E5E7EB",
                        backgroundColor: selected ? "#FFF7F0" : "white",
                        transform: selected ? "scale(1.02)" : "scale(1)",
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 p-1.5"
                        style={{ backgroundColor: "#FFF7ED" }}
                      >
                        <img src={allergy.img} alt={allergy.label} className="w-full h-full object-contain" />
                      </div>
                      <span className="font-medium text-sm flex-1 text-left" style={{ color: "#2C3E50" }}>{allergy.label}</span>
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200"
                        style={{
                          borderColor: selected ? "#E67E22" : "#D1D5DB",
                          backgroundColor: selected ? "#E67E22" : "transparent",
                        }}
                      >
                        {selected && <Check size={11} color="white" strokeWidth={3} />}
                      </div>
                    </button>
                  )
                })}
              </div>

              <button
                onClick={() => updateData({ allergies: [] })}
                className="w-full p-3 rounded-xl border-2 flex items-center justify-center gap-2 font-medium text-sm transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                style={{
                  borderColor: data.allergies.length === 0 ? "#2D5F5D" : "#E5E7EB",
                  backgroundColor: data.allergies.length === 0 ? "#F0F7F7" : "white",
                  color: data.allergies.length === 0 ? "#2D5F5D" : "#6B7280",
                }}
              >
                {data.allergies.length === 0 && <Check size={15} strokeWidth={2.5} />}
                None — I eat everything
              </button>
            </div>
          )}

          {step === 5 && (
            <div>
              <div className="text-center mb-5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: "#27AE60" }}>
                  <Wallet size={24} color="white" />
                </div>
                <h2 className="text-2xl font-bold mb-1" style={{ color: "#2C3E50" }}>Weekly food budget?</h2>
                <p className="text-sm" style={{ color: "#6B7280" }}>We&apos;ll match your groceries to how and where you shop</p>
              </div>

              <div className="space-y-4">
                {/* City input */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>Your city</p>
                  <input
                    type="text"
                    placeholder="e.g. Casablanca, Rabat, Fes…"
                    value={data.city}
                    onChange={(e) => updateData({ city: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white outline-none text-sm transition-colors focus:border-[#27AE60] focus:ring-1 focus:ring-[#27AE60]"
                  />
                </div>

                {/* Shopping style */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>Shopping style</p>
                  <div className="grid grid-cols-3 gap-2">
                    {marketTierOptions.map((option) => {
                      const selected = data.marketTier === option.value
                      const TierIcon = option.icon
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateData({ marketTier: option.value })}
                          className="py-3 px-2 rounded-xl border-2 text-center transition-all duration-150 hover:shadow-sm active:scale-[0.97]"
                          style={{
                            borderColor: selected ? "#2D5F5D" : "#E5E7EB",
                            backgroundColor: selected ? "#F0F7F7" : "white",
                          }}
                        >
                          <TierIcon size={18} className="mx-auto mb-1" style={{ color: selected ? "#2D5F5D" : "#9CA3AF" }} />
                          <div className="font-semibold text-xs" style={{ color: selected ? "#2D5F5D" : "#2C3E50" }}>{option.label}</div>
                          <div className="text-[10px] mt-0.5 leading-tight" style={{ color: "#9CA3AF" }}>{option.desc}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Budget presets */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#9CA3AF" }}>Weekly budget</p>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: "150", label: "150", desc: "Tight"    },
                      { value: "250", label: "250", desc: "Balanced" },
                      { value: "350", label: "350", desc: "Comfy"    },
                      { value: "500", label: "500", desc: "Premium"  },
                    ].map((option) => {
                      const selected = data.weeklyBudget === option.value
                      return (
                        <button
                          key={option.value}
                          onClick={() => updateData({ weeklyBudget: option.value })}
                          className="py-2.5 px-1 rounded-xl border-2 text-center transition-all duration-200 hover:shadow-sm active:scale-[0.97]"
                          style={{
                            borderColor: selected ? "#27AE60" : "#E5E7EB",
                            backgroundColor: selected ? "#F0FFF4" : "white",
                          }}
                        >
                          <div className="text-sm font-bold" style={{ color: "#2C3E50" }}>{option.label}</div>
                          <div className="text-[10px]" style={{ color: "#9CA3AF" }}>DH</div>
                          <div className="text-[10px] leading-tight" style={{ color: "#6B7280" }}>{option.desc}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Custom input */}
                <div className="relative">
                  <input
                    type="number"
                    placeholder="Or type a custom amount"
                    value={data.weeklyBudget}
                    onChange={(e) => updateData({ weeklyBudget: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white outline-none text-sm transition-colors focus:border-[#27AE60] focus:ring-1 focus:ring-[#27AE60]"
                  />
                  <span className="absolute right-4 top-2.5 text-sm font-medium" style={{ color: "#9CA3AF" }}>DH</span>
                </div>

                {/* Reality check */}
                {previewCalories && (
                  <div
                    className="rounded-xl p-3"
                    style={{
                      backgroundColor:
                        budgetAssessment.status === "unrealistic" ? "#FEF2F2" :
                        budgetAssessment.status === "tight"        ? "#FFF7ED" :
                        "#F0FFF4",
                    }}
                  >
                    <p
                      className="text-xs font-semibold mb-1"
                      style={{
                        color:
                          budgetAssessment.status === "unrealistic" ? "#B91C1C" :
                          budgetAssessment.status === "tight"        ? "#C2410C" :
                          "#166534",
                      }}
                    >
                      Reality check · {previewCalories} kcal/day
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
                      {budgetAssessment.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {submitError && (
            <div className="mt-6 p-3 rounded-xl text-sm text-red-600 bg-red-50 border border-red-100">
              {submitError}
            </div>
          )}

          <div className="flex gap-4 mt-4">
            {step > 1 && (
              <button
                onClick={goBack}
                className="flex items-center gap-2 px-6 py-3 rounded-xl border font-medium transition-all hover:shadow-sm active:scale-[0.97]"
                style={{ borderColor: "#E5E7EB", color: "#6B7280", backgroundColor: "white" }}
              >
                <ChevronLeft size={18} />
                Back
              </button>
            )}

            {step < 5 ? (
              <button
                onClick={goNext}
                disabled={
                  (step === 1 && !step1Valid) ||
                  (step === 2 && !step2Valid) ||
                  (step === 3 && !step3Valid)
                }
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#2D5F5D" }}
              >
                Continue
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={!step5Valid || loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#E67E22" }}
              >
                Let&apos;s go! 🍽️
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
