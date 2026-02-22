"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Save, Check } from "lucide-react"

const cuisineOptions = [
  { value: "moroccan", label: "Moroccan", emoji: "🇲🇦" },
  { value: "french", label: "French", emoji: "🇫🇷" },
  { value: "mediterranean", label: "Mediterranean", emoji: "🫒" },
  { value: "italian", label: "Italian", emoji: "🇮🇹" },
  { value: "middle_eastern", label: "Middle Eastern", emoji: "🧆" },
  { value: "healthy", label: "Healthy/Clean", emoji: "🥗" },
]

const allergyOptions = [
  { value: "gluten", label: "Gluten", emoji: "🌾" },
  { value: "lactose", label: "Lactose", emoji: "🥛" },
  { value: "peanuts", label: "Peanuts", emoji: "🥜" },
  { value: "shellfish", label: "Shellfish", emoji: "🦐" },
  { value: "eggs", label: "Eggs", emoji: "🥚" },
  { value: "soy", label: "Soy", emoji: "🫘" },
]

const fitnessGoals = [
  { value: "lose_weight", label: "Lose Weight", emoji: "🔥" },
  { value: "gain_muscle", label: "Gain Muscle", emoji: "💪" },
  { value: "maintain", label: "Stay Healthy", emoji: "⚖️" },
  { value: "eat_better", label: "Eat Better", emoji: "🥗" },
]

const activityLevels = [
  { value: "sedentary", label: "Sedentary", desc: "Little or no exercise" },
  { value: "light", label: "Light", desc: "1-3 days/week" },
  { value: "moderate", label: "Moderate", desc: "3-5 days/week" },
  { value: "very_active", label: "Very Active", desc: "6-7 days/week" },
]

interface Props {
  user: {
    name: string
    age: string
    weight: string
    height: string
    fitnessGoal: string
    activityLevel: string
    cuisines: string[]
    allergies: string[]
    weeklyBudget: string
  }
}

export default function SettingsForm({ user }: Props) {
  const router = useRouter()
  const [data, setData] = useState(user)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  const update = (field: string, value: any) => {
    setData(prev => ({ ...prev, [field]: value }))
  }

  const toggleArray = (field: "cuisines" | "allergies", value: string) => {
    const current = data[field]
    const updated = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value]
    update(field, updated)
  }

  const handleSave = async () => {
    setLoading(true)
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      router.refresh()
    }
    setLoading(false)
  }

  const inputStyle = {
    borderColor: "#E5E7EB",
    backgroundColor: "white",
  }

  return (
    <div className="space-y-6">

      {/* Personal Info */}
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h2 className="font-bold text-lg mb-4" style={{ color: "#2C3E50" }}>
          👤 Personal Info
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium mb-1" style={{ color: "#2C3E50" }}>
              Full Name
            </label>
            <input
              type="text"
              value={data.name}
              onChange={e => update("name", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border outline-none"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = "#2D5F5D"}
              onBlur={e => e.target.style.borderColor = "#E5E7EB"}
            />
          </div>
          {[
            { label: "Age", field: "age", unit: "yrs" },
            { label: "Weight", field: "weight", unit: "kg" },
            { label: "Height", field: "height", unit: "cm" },
            { label: "Weekly Budget", field: "weeklyBudget", unit: "DH" },
          ].map(({ label, field, unit }) => (
            <div key={field}>
              <label className="block text-sm font-medium mb-1" style={{ color: "#2C3E50" }}>
                {label}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={data[field as keyof typeof data] as string}
                  onChange={e => update(field, e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border outline-none"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = "#2D5F5D"}
                  onBlur={e => e.target.style.borderColor = "#E5E7EB"}
                />
                <span className="absolute right-3 top-3 text-sm" style={{ color: "#9CA3AF" }}>
                  {unit}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fitness Goal */}
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h2 className="font-bold text-lg mb-4" style={{ color: "#2C3E50" }}>
          🎯 Fitness Goal
        </h2>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {fitnessGoals.map(goal => (
            <button
              key={goal.value}
              onClick={() => update("fitnessGoal", goal.value)}
              className="p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3"
              style={{
                borderColor: data.fitnessGoal === goal.value ? "#2D5F5D" : "#E5E7EB",
                backgroundColor: data.fitnessGoal === goal.value ? "#F0F7F7" : "white",
              }}>
              <span>{goal.emoji}</span>
              <span className="font-medium text-sm" style={{ color: "#2C3E50" }}>
                {goal.label}
              </span>
            </button>
          ))}
        </div>

        <h3 className="font-medium text-sm mb-3" style={{ color: "#2C3E50" }}>
          Activity Level
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {activityLevels.map(level => (
            <button
              key={level.value}
              onClick={() => update("activityLevel", level.value)}
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

      {/* Cuisines */}
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h2 className="font-bold text-lg mb-4" style={{ color: "#2C3E50" }}>
          🍽️ Favorite Cuisines
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {cuisineOptions.map(cuisine => (
            <button
              key={cuisine.value}
              onClick={() => toggleArray("cuisines", cuisine.value)}
              className="p-3 rounded-xl border-2 flex items-center gap-3 transition-all"
              style={{
                borderColor: data.cuisines.includes(cuisine.value) ? "#2D5F5D" : "#E5E7EB",
                backgroundColor: data.cuisines.includes(cuisine.value) ? "#F0F7F7" : "white",
              }}>
              <span>{cuisine.emoji}</span>
              <span className="font-medium text-sm" style={{ color: "#2C3E50" }}>
                {cuisine.label}
              </span>
              {data.cuisines.includes(cuisine.value) && (
                <Check size={14} className="ml-auto" style={{ color: "#2D5F5D" }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Allergies */}
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <h2 className="font-bold text-lg mb-4" style={{ color: "#2C3E50" }}>
          ⚠️ Allergies
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {allergyOptions.map(allergy => (
            <button
              key={allergy.value}
              onClick={() => toggleArray("allergies", allergy.value)}
              className="p-3 rounded-xl border-2 flex items-center gap-3 transition-all"
              style={{
                borderColor: data.allergies.includes(allergy.value) ? "#E67E22" : "#E5E7EB",
                backgroundColor: data.allergies.includes(allergy.value) ? "#FFF7F0" : "white",
              }}>
              <span>{allergy.emoji}</span>
              <span className="font-medium text-sm" style={{ color: "#2C3E50" }}>
                {allergy.label}
              </span>
              {data.allergies.includes(allergy.value) && (
                <Check size={14} className="ml-auto" style={{ color: "#E67E22" }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={loading}
        className="w-full py-4 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
        style={{
          backgroundColor: saved ? "#27AE60" : loading ? "#6B7280" : "#2D5F5D",
        }}>
        {saved ? (
          <>
            <Check size={20} />
            Saved successfully!
          </>
        ) : loading ? (
          "Saving..."
        ) : (
          <>
            <Save size={20} />
            Save Changes
          </>
        )}
      </button>
    </div>
  )
}