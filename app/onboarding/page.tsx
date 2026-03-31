"use client"
import { useOnboardingStore } from "@/lib/onboarding-store"
import { useRouter } from "next/navigation"
import { useState } from "react"
import {
  User, Target, UtensilsCrossed,
  AlertCircle, Wallet, ChevronRight,
  ChevronLeft, Check
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

export default function OnboardingPage() {
  const router = useRouter()
  const { step, data, setStep, updateData } = useOnboardingStore()
  const [loading, setLoading] = useState(false)

  const toggleArray = (field: "cuisines" | "allergies", value: string) => {
    const current = data[field]
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    updateData({ [field]: updated })
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

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#FDFAF6" }}>

      {/* Header */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color: "#2D5F5D", fontFamily: "var(--font-playfair)" }}>
            Soufra
          </span>
        </div>
        <span className="text-sm" style={{ color: "#6B7280" }}>
          Step {step} of 5
        </span>
      </div>

      {/* Progress bar */}
      <div className="px-6 mb-8">
        <div className="h-2 rounded-full" style={{ backgroundColor: "#E5E7EB" }}>
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${(step / 5) * 100}%`,
              backgroundColor: "#2D5F5D"
            }}
          />
        </div>
        <div className="flex justify-between mt-2">
          {steps.map((s) => (
            <span key={s.id} className="text-xs" style={{
              color: step >= s.id ? "#2D5F5D" : "#9CA3AF",
              fontWeight: step === s.id ? 600 : 400
            }}>
              {s.title}
            </span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-lg">

          {/* STEP 1 - Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "#2D5F5D" }}>
                  <User size={32} color="white" />
                </div>
                <h2 className="text-3xl font-bold mb-2" style={{ color: "#2C3E50" }}>
                  Tell us about yourself
                </h2>
                <p style={{ color: "#6B7280" }}>
                  This helps us calculate your perfect calorie target
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Age", field: "age", placeholder: "25", unit: "yrs" },
                  { label: "Weight", field: "weight", placeholder: "65", unit: "kg" },
                  { label: "Height", field: "height", placeholder: "170", unit: "cm" },
                ].map(({ label, field, placeholder, unit }) => (
                  <div key={field}>
                    <label className="block text-sm font-medium mb-1" style={{ color: "#2C3E50" }}>
                      {label}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder={placeholder}
                        value={data[field as keyof typeof data] as string}
                        onChange={(e) => updateData({ [field]: e.target.value })}
                        className="w-full px-3 py-3 rounded-xl border outline-none text-center text-lg font-semibold"
                        style={{ borderColor: "#E5E7EB", backgroundColor: "white" }}
                        onFocus={(e) => e.target.style.borderColor = "#2D5F5D"}
                        onBlur={(e) => e.target.style.borderColor = "#E5E7EB"}
                      />
                      <span className="absolute right-3 top-3 text-xs" style={{ color: "#9CA3AF" }}>
                        {unit}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2 - Fitness Goal */}
          {step === 2 && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "#2D5F5D" }}>
                  <Target size={32} color="white" />
                </div>
                <h2 className="text-3xl font-bold mb-2" style={{ color: "#2C3E50" }}>
                  What's your goal?
                </h2>
                <p style={{ color: "#6B7280" }}>We'll tailor your meal plan around it</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {fitnessGoals.map((goal) => (
                  <button
                    key={goal.value}
                    onClick={() => updateData({ fitnessGoal: goal.value })}
                    className="p-4 rounded-2xl border-2 text-left transition-all"
                    style={{
                      borderColor: data.fitnessGoal === goal.value ? "#2D5F5D" : "#E5E7EB",
                      backgroundColor: data.fitnessGoal === goal.value ? "#F0F7F7" : "white",
                    }}>
                    <div className="text-3xl mb-2">{goal.emoji}</div>
                    <div className="font-semibold" style={{ color: "#2C3E50" }}>{goal.label}</div>
                    <div className="text-sm" style={{ color: "#6B7280" }}>{goal.desc}</div>
                  </button>
                ))}
              </div>

              <div>
                <p className="text-sm font-medium mb-3" style={{ color: "#2C3E50" }}>
                  Activity Level
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {activityLevels.map((level) => (
                    <button
                      key={level.value}
                      onClick={() => updateData({ activityLevel: level.value })}
                      className="p-3 rounded-xl border-2 text-left transition-all"
                      style={{
                        borderColor: data.activityLevel === level.value ? "#2D5F5D" : "#E5E7EB",
                        backgroundColor: data.activityLevel === level.value ? "#F0F7F7" : "white",
                      }}>
                      <div className="font-medium text-sm" style={{ color: "#2C3E50" }}>{level.label}</div>
                      <div className="text-xs" style={{ color: "#6B7280" }}>{level.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3 - Cuisines */}
          {step === 3 && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "#2D5F5D" }}>
                  <UtensilsCrossed size={32} color="white" />
                </div>
                <h2 className="text-3xl font-bold mb-2" style={{ color: "#2C3E50" }}>
                  Favorite cuisines?
                </h2>
                <p style={{ color: "#6B7280" }}>Pick all that you love</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {cuisineOptions.map((cuisine) => (
                  <button
                    key={cuisine.value}
                    onClick={() => toggleArray("cuisines", cuisine.value)}
                    className="p-4 rounded-2xl border-2 flex items-center gap-3 transition-all"
                    style={{
                      borderColor: data.cuisines.includes(cuisine.value) ? "#2D5F5D" : "#E5E7EB",
                      backgroundColor: data.cuisines.includes(cuisine.value) ? "#F0F7F7" : "white",
                    }}>
                    <span className="text-2xl">{cuisine.emoji}</span>
                    <span className="font-medium" style={{ color: "#2C3E50" }}>{cuisine.label}</span>
                    {data.cuisines.includes(cuisine.value) && (
                      <Check size={16} className="ml-auto" style={{ color: "#2D5F5D" }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 4 - Allergies */}
          {step === 4 && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "#E67E22" }}>
                  <AlertCircle size={32} color="white" />
                </div>
                <h2 className="text-3xl font-bold mb-2" style={{ color: "#2C3E50" }}>
                  Any allergies?
                </h2>
                <p style={{ color: "#6B7280" }}>We'll make sure to avoid these completely</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {allergyOptions.map((allergy) => (
                  <button
                    key={allergy.value}
                    onClick={() => toggleArray("allergies", allergy.value)}
                    className="p-4 rounded-2xl border-2 flex items-center gap-3 transition-all"
                    style={{
                      borderColor: data.allergies.includes(allergy.value) ? "#E67E22" : "#E5E7EB",
                      backgroundColor: data.allergies.includes(allergy.value) ? "#FFF7F0" : "white",
                    }}>
                    <span className="text-2xl">{allergy.emoji}</span>
                    <span className="font-medium" style={{ color: "#2C3E50" }}>{allergy.label}</span>
                    {data.allergies.includes(allergy.value) && (
                      <Check size={16} className="ml-auto" style={{ color: "#E67E22" }} />
                    )}
                  </button>
                ))}
              </div>

              <button
                onClick={() => updateData({ allergies: [] })}
                className="w-full p-3 rounded-xl border-2 text-center transition-all"
                style={{
                  borderColor: data.allergies.length === 0 ? "#2D5F5D" : "#E5E7EB",
                  backgroundColor: data.allergies.length === 0 ? "#F0F7F7" : "white",
                  color: "#2C3E50"
                }}>
                No allergies ✓
              </button>
            </div>
          )}

          {/* STEP 5 - Budget */}
          {step === 5 && (
            <div>
              <div className="text-center mb-8">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                  style={{ backgroundColor: "#27AE60" }}>
                  <Wallet size={32} color="white" />
                </div>
                <h2 className="text-3xl font-bold mb-2" style={{ color: "#2C3E50" }}>
                  Weekly food budget?
                </h2>
                <p style={{ color: "#6B7280" }}>We'll keep your grocery list within budget</p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { value: "150", label: "150 DH", desc: "Budget friendly" },
                  { value: "250", label: "250 DH", desc: "Balanced" },
                  { value: "350", label: "350 DH", desc: "Comfortable" },
                  { value: "500", label: "500 DH", desc: "Premium" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateData({ weeklyBudget: option.value })}
                    className="p-4 rounded-2xl border-2 text-center transition-all"
                    style={{
                      borderColor: data.weeklyBudget === option.value ? "#27AE60" : "#E5E7EB",
                      backgroundColor: data.weeklyBudget === option.value ? "#F0FFF4" : "white",
                    }}>
                    <div className="text-xl font-bold" style={{ color: "#2C3E50" }}>{option.label}</div>
                    <div className="text-sm" style={{ color: "#6B7280" }}>{option.desc}</div>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "#2C3E50" }}>
                  Or enter custom amount
                </label>
                <div className="relative">
                  <input
                    type="number"
                    placeholder="300"
                    value={data.weeklyBudget}
                    onChange={(e) => updateData({ weeklyBudget: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border outline-none text-lg"
                    style={{ borderColor: "#E5E7EB", backgroundColor: "white" }}
                    onFocus={(e) => e.target.style.borderColor = "#27AE60"}
                    onBlur={(e) => e.target.style.borderColor = "#E5E7EB"}
                  />
                  <span className="absolute right-4 top-3 font-medium" style={{ color: "#6B7280" }}>DH</span>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-4 mt-8">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-6 py-3 rounded-xl border font-medium transition-all"
                style={{ borderColor: "#E5E7EB", color: "#6B7280", backgroundColor: "white" }}>
                <ChevronLeft size={18} />
                Back
              </button>
            )}

            {step < 5 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all"
                style={{ backgroundColor: "#2D5F5D" }}>
                Continue
                <ChevronRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-white transition-all"
                style={{ backgroundColor: loading ? "#6B7280" : "#E67E22" }}>
                {loading ? "Setting up..." : "Let's go! 🍽️"}
                {!loading && <ChevronRight size={18} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}