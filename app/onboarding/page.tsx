"use client"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
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
  Store,
  MapPin,
} from "lucide-react"

const steps = [
  { id: 1, title: "About you", icon: User },
  { id: 2, title: "Your goal", icon: Target },
  { id: 3, title: "Cuisines", icon: UtensilsCrossed },
  { id: 4, title: "Allergies", icon: AlertCircle },
  { id: 5, title: "Budget", icon: Wallet },
]

const fitnessGoals = [
  { value: "lose_weight", label: "Lose Weight", emoji: "🔥", desc: "Calorie deficit plan" },
  { value: "gain_muscle", label: "Gain Muscle", emoji: "💪", desc: "High protein plan" },
  { value: "maintain", label: "Stay Healthy", emoji: "⚖️", desc: "Balanced nutrition" },
  { value: "eat_better", label: "Eat Better", emoji: "🥗", desc: "Improve food quality" },
]

const activityLevels = [
  { value: "sedentary", label: "Sedentary", desc: "Little or no exercise" },
  { value: "light", label: "Light", desc: "1-3 days/week" },
  { value: "moderate", label: "Moderate", desc: "3-5 days/week" },
  { value: "very_active", label: "Very Active", desc: "6-7 days/week" },
]

const cuisineOptions = [
  { value: "moroccan", label: "Moroccan", emoji: "🇲🇦" },
  { value: "mediterranean", label: "Mediterranean", emoji: "🫒" },
  { value: "healthy", label: "Healthy Essentials", emoji: "🥗" },
  { value: "french", label: "French", emoji: "🇫🇷" },
  { value: "middle_eastern", label: "Middle Eastern", emoji: "🧆" },
]

const allergyOptions = [
  { value: "gluten", label: "Gluten", emoji: "🌾" },
  { value: "lactose", label: "Lactose", emoji: "🥛" },
  { value: "peanuts", label: "Peanuts", emoji: "🥜" },
  { value: "shellfish", label: "Shellfish", emoji: "🦐" },
  { value: "eggs", label: "Eggs", emoji: "🥚" },
  { value: "soy", label: "Soy", emoji: "🫘" },
]

const cityOptions = ["Casablanca", "Rabat", "Marrakech", "Tangier", "Fes", "Agadir"]

const marketTierOptions = [
  { value: "souk", label: "Souk Saver", desc: "Lowest realistic local market prices" },
  { value: "supermarket", label: "Supermarket", desc: "Balanced branded + fresh shopping" },
  { value: "premium", label: "Premium", desc: "Higher-end and convenience-heavy basket" },
]

const INPUT_CLASS =
  "w-full px-3 py-3 rounded-xl border border-gray-200 bg-white outline-none text-center text-lg font-semibold transition-colors focus:border-[#2D5F5D] focus:ring-1 focus:ring-[#2D5F5D]"

export default function OnboardingPage() {
  const router = useRouter()
  const { step, data, setStep, updateData } = useOnboardingStore()
  const [loading, setLoading] = useState(false)
  const [direction, setDirection] = useState<"right" | "left">("right")

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
    setLoading(true)
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    if (res.ok) {
      router.push("/dashboard")
    } else {
      setLoading(false)
    }
  }

  const step1Valid = !!data.gender && !!data.age && !!data.weight && !!data.height

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
        <div key={step} className={`w-full max-w-lg ${direction === "right" ? "step-enter-right" : "step-enter-left"}`}>
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
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#2D5F5D" }}>
                  <Target size={32} color="white" />
                </div>
                <h2 className="text-3xl font-bold mb-2" style={{ color: "#2C3E50" }}>What&apos;s your goal?</h2>
                <p style={{ color: "#6B7280" }}>We&apos;ll tailor your meal plan around it</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {fitnessGoals.map((goal) => {
                  const selected = data.fitnessGoal === goal.value
                  return (
                    <button
                      key={goal.value}
                      onClick={() => updateData({ fitnessGoal: goal.value })}
                      className="p-4 rounded-2xl border-2 text-left transition-all duration-200 hover:shadow-md active:scale-[0.97]"
                      style={{
                        borderColor: selected ? "#2D5F5D" : "#E5E7EB",
                        backgroundColor: selected ? "#F0F7F7" : "white",
                        transform: selected ? "scale(1.02)" : "scale(1)",
                      }}
                    >
                      <div className="text-3xl mb-2">{goal.emoji}</div>
                      <div className="font-semibold" style={{ color: "#2C3E50" }}>{goal.label}</div>
                      <div className="text-sm" style={{ color: "#6B7280" }}>{goal.desc}</div>
                      {selected && (
                        <div className="mt-2 flex items-center gap-1 text-xs font-medium" style={{ color: "#2D5F5D" }}>
                          <Check size={12} /> Selected
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              <div>
                <p className="text-sm font-medium mb-3" style={{ color: "#2C3E50" }}>Activity Level</p>
                <div className="grid grid-cols-2 gap-3">
                  {activityLevels.map((level) => {
                    const selected = data.activityLevel === level.value
                    return (
                      <button
                        key={level.value}
                        onClick={() => updateData({ activityLevel: level.value })}
                        className="p-3 rounded-xl border-2 text-left transition-all duration-200 hover:shadow-sm active:scale-[0.97]"
                        style={{
                          borderColor: selected ? "#2D5F5D" : "#E5E7EB",
                          backgroundColor: selected ? "#F0F7F7" : "white",
                        }}
                      >
                        <div className="font-medium text-sm flex items-center justify-between" style={{ color: "#2C3E50" }}>
                          {level.label}
                          {selected && <Check size={14} style={{ color: "#2D5F5D" }} />}
                        </div>
                        <div className="text-xs" style={{ color: "#6B7280" }}>{level.desc}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#2D5F5D" }}>
                  <UtensilsCrossed size={32} color="white" />
                </div>
                <h2 className="text-3xl font-bold mb-2" style={{ color: "#2C3E50" }}>Favorite cuisines?</h2>
                <p style={{ color: "#6B7280" }}>Pick all that you love</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {cuisineOptions.map((cuisine) => {
                  const selected = data.cuisines.includes(cuisine.value)
                  return (
                    <button
                      key={cuisine.value}
                      onClick={() => toggleArray("cuisines", cuisine.value)}
                      className="p-4 rounded-2xl border-2 flex items-center gap-3 transition-all duration-200 hover:shadow-md active:scale-[0.97]"
                      style={{
                        borderColor: selected ? "#2D5F5D" : "#E5E7EB",
                        backgroundColor: selected ? "#F0F7F7" : "white",
                        transform: selected ? "scale(1.02)" : "scale(1)",
                      }}
                    >
                      <span className="text-2xl">{cuisine.emoji}</span>
                      <span className="font-medium flex-1 text-left" style={{ color: "#2C3E50" }}>{cuisine.label}</span>
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
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#E67E22" }}>
                  <AlertCircle size={32} color="white" />
                </div>
                <h2 className="text-3xl font-bold mb-2" style={{ color: "#2C3E50" }}>Any allergies?</h2>
                <p style={{ color: "#6B7280" }}>We&apos;ll make sure to avoid these completely</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {allergyOptions.map((allergy) => {
                  const selected = data.allergies.includes(allergy.value)
                  return (
                    <button
                      key={allergy.value}
                      onClick={() => toggleArray("allergies", allergy.value)}
                      className="p-4 rounded-2xl border-2 flex items-center gap-3 transition-all duration-200 hover:shadow-md active:scale-[0.97]"
                      style={{
                        borderColor: selected ? "#E67E22" : "#E5E7EB",
                        backgroundColor: selected ? "#FFF7F0" : "white",
                        transform: selected ? "scale(1.02)" : "scale(1)",
                      }}
                    >
                      <span className="text-2xl">{allergy.emoji}</span>
                      <span className="font-medium flex-1 text-left" style={{ color: "#2C3E50" }}>{allergy.label}</span>
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
                className="w-full p-3 rounded-xl border-2 text-center transition-all duration-200 hover:shadow-sm active:scale-[0.98]"
                style={{
                  borderColor: data.allergies.length === 0 ? "#2D5F5D" : "#E5E7EB",
                  backgroundColor: data.allergies.length === 0 ? "#F0F7F7" : "white",
                  color: "#2C3E50",
                }}
              >
                {data.allergies.length === 0
                  ? <span className="flex items-center justify-center gap-2 font-medium"><Check size={16} style={{ color: "#2D5F5D" }} /> No allergies</span>
                  : "None - I eat everything"}
              </button>
            </div>
          )}

          {step === 5 && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: "#27AE60" }}>
                  <Wallet size={32} color="white" />
                </div>
                <h2 className="text-3xl font-bold mb-2" style={{ color: "#2C3E50" }}>Weekly food budget?</h2>
                <p style={{ color: "#6B7280" }}>We&apos;ll match your groceries to how and where you shop</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#2C3E50" }}>Primary city</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3 top-3.5" style={{ color: "#9CA3AF" }} />
                    <select
                      value={data.city}
                      onChange={(e) => updateData({ city: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white outline-none text-base transition-colors focus:border-[#27AE60] focus:ring-1 focus:ring-[#27AE60]"
                    >
                      {cityOptions.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Store size={16} style={{ color: "#2D5F5D" }} />
                    <p className="text-sm font-medium" style={{ color: "#2C3E50" }}>Shopping style</p>
                  </div>
                  <div className="grid gap-3">
                    {marketTierOptions.map((option) => {
                      const selected = data.marketTier === option.value
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => updateData({ marketTier: option.value })}
                          className="p-4 rounded-xl border-2 text-left transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
                          style={{
                            borderColor: selected ? "#2D5F5D" : "#E5E7EB",
                            backgroundColor: selected ? "#F0F7F7" : "white",
                          }}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-sm" style={{ color: "#2C3E50" }}>{option.label}</p>
                            {selected && <Check size={14} style={{ color: "#2D5F5D" }} />}
                          </div>
                          <p className="text-xs" style={{ color: "#9CA3AF" }}>{option.desc}</p>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { value: "150", label: "150 DH", desc: "Very tight" },
                    { value: "250", label: "250 DH", desc: "Balanced" },
                    { value: "350", label: "350 DH", desc: "Comfortable" },
                    { value: "500", label: "500 DH", desc: "Premium" },
                  ].map((option) => {
                    const selected = data.weeklyBudget === option.value
                    return (
                      <button
                        key={option.value}
                        onClick={() => updateData({ weeklyBudget: option.value })}
                        className="p-4 rounded-2xl border-2 text-center transition-all duration-200 hover:shadow-md active:scale-[0.97]"
                        style={{
                          borderColor: selected ? "#27AE60" : "#E5E7EB",
                          backgroundColor: selected ? "#F0FFF4" : "white",
                          transform: selected ? "scale(1.02)" : "scale(1)",
                        }}
                      >
                        <div className="text-xl font-bold" style={{ color: "#2C3E50" }}>{option.label}</div>
                        <div className="text-sm" style={{ color: "#6B7280" }}>{option.desc}</div>
                        {selected && <div className="mt-1 text-xs font-medium" style={{ color: "#27AE60" }}>Selected</div>}
                      </button>
                    )
                  })}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "#2C3E50" }}>Or enter a custom amount</label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="300"
                      value={data.weeklyBudget}
                      onChange={(e) => updateData({ weeklyBudget: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none text-lg transition-colors focus:border-[#27AE60] focus:ring-1 focus:ring-[#27AE60]"
                    />
                    <span className="absolute right-4 top-3.5 font-medium" style={{ color: "#6B7280" }}>DH</span>
                  </div>
                </div>

                {previewCalories && (
                  <div
                    className="rounded-2xl p-4"
                    style={{
                      backgroundColor:
                        budgetAssessment.status === "unrealistic" ? "#FEF2F2" :
                        budgetAssessment.status === "tight" ? "#FFF7ED" :
                        "#F0FFF4",
                    }}
                  >
                    <p
                      className="text-sm font-semibold mb-1"
                      style={{
                        color:
                          budgetAssessment.status === "unrealistic" ? "#B91C1C" :
                          budgetAssessment.status === "tight" ? "#C2410C" :
                          "#166534",
                      }}
                    >
                      Reality check for {previewCalories} kcal/day
                    </p>
                    <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
                      {budgetAssessment.message}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-4 mt-8">
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
                disabled={step === 1 && !step1Valid}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#2D5F5D" }}
              >
                Continue
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all active:scale-[0.98]"
                style={{ backgroundColor: "#E67E22" }}
              >
                Let&apos;s go! 🍽️
                <ChevronRight size={18} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
