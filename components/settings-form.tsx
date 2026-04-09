"use client"
import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Save,
  Check,
  User,
  Target,
  UtensilsCrossed,
  AlertCircle,
  Flame,
  Dumbbell,
  TrendingUp,
  Leaf,
  Activity,
  AlertTriangle,
  MapPin,
  Store,
  Moon,
} from "lucide-react"
import { toast } from "sonner"
import { calculateCalories } from "@/lib/nutrition"
import { assessBudgetFeasibility } from "@/lib/budget-utils"

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

const fitnessGoals = [
  { value: "lose_weight", label: "Lose Weight", desc: "Calorie deficit", icon: Flame, color: "#E67E22", bg: "#FFF7F0" },
  { value: "gain_muscle", label: "Gain Muscle", desc: "High protein", icon: Dumbbell, color: "#3498DB", bg: "#EFF6FF" },
  { value: "maintain", label: "Stay Healthy", desc: "Balanced nutrition", icon: TrendingUp, color: "#27AE60", bg: "#F0FFF4" },
  { value: "eat_better", label: "Eat Better", desc: "Food quality", icon: Leaf, color: "#2D5F5D", bg: "#F0F7F7" },
]

const activityLevels = [
  { value: "sedentary", label: "Sedentary", desc: "Little or no exercise" },
  { value: "light", label: "Light", desc: "1-3 days / week" },
  { value: "moderate", label: "Moderate", desc: "3-5 days / week" },
  { value: "very_active", label: "Very Active", desc: "6-7 days / week" },
]

const cityOptions = ["Casablanca", "Rabat", "Marrakech", "Tangier", "Fes", "Agadir"]

const marketTierOptions = [
  { value: "souk", label: "Souk Saver", desc: "Lowest realistic local market prices" },
  { value: "supermarket", label: "Supermarket", desc: "Balanced branded + fresh shopping" },
  { value: "premium", label: "Premium", desc: "Higher-end and convenience-heavy basket" },
]

interface UserData {
  name: string
  gender: string
  age: string
  weight: string
  height: string
  city: string
  marketTier: string
  fitnessGoal: string
  activityLevel: string
  cuisines: string[]
  allergies: string[]
  weeklyBudget: string
  isRamadan: boolean
}

const INPUT_CLASS =
  "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white outline-none transition-colors focus:border-[#2D5F5D] focus:ring-1 focus:ring-[#2D5F5D] text-sm"

function SectionHeader({
  icon: Icon,
  iconColor,
  iconBg,
  title,
  desc,
}: {
  icon: React.ElementType
  iconColor: string
  iconBg: string
  title: string
  desc: string
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: iconBg }}>
        <Icon size={18} style={{ color: iconColor }} />
      </div>
      <div>
        <h2 className="font-bold text-base" style={{ color: "#2C3E50" }}>{title}</h2>
        <p className="text-xs" style={{ color: "#9CA3AF" }}>{desc}</p>
      </div>
    </div>
  )
}

export default function SettingsForm({ user }: { user: UserData }) {
  const router = useRouter()
  const [data, setData] = useState<UserData>(user)
  const [baseline, setBaseline] = useState<UserData>(user)
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  const hasChanges = JSON.stringify(data) !== JSON.stringify(baseline)
  const previewCal = useMemo(() => calculateCalories(data), [data])
  const budgetAssessment = useMemo(
    () =>
      assessBudgetFeasibility({
        calorieTarget: previewCal,
        weeklyBudget: data.weeklyBudget ? Number.parseFloat(data.weeklyBudget) : null,
        marketTier: (data.marketTier as "souk" | "supermarket" | "premium") || "supermarket",
        cuisineCount: data.cuisines.length,
      }),
    [data, previewCal]
  )

  const update = (field: keyof UserData, value: string | string[] | boolean) =>
    setData((prev) => ({ ...prev, [field]: value }))

  const toggleArray = (field: "cuisines" | "allergies", value: string) => {
    const updated = data[field].includes(value)
      ? data[field].filter((entry) => entry !== value)
      : [...data[field], value]
    update(field, updated)
  }

  const planAffectingChanged =
    JSON.stringify([...data.cuisines].sort()) !== JSON.stringify([...baseline.cuisines].sort()) ||
    data.fitnessGoal !== baseline.fitnessGoal ||
    data.activityLevel !== baseline.activityLevel ||
    data.gender !== baseline.gender ||
    data.age !== baseline.age ||
    data.weight !== baseline.weight ||
    data.height !== baseline.height ||
    data.allergies.join(",") !== baseline.allergies.join(",") ||
    data.isRamadan !== baseline.isRamadan

  const handleSave = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        const needsRegen = planAffectingChanged
        setBaseline(data)
        setSaved(true)
        if (needsRegen) {
          toast.success("Settings saved! Go to the dashboard and generate a new plan to apply your changes.", { duration: 6000 })
        } else {
          toast.success("Settings saved!")
        }
        router.refresh()
        setTimeout(() => setSaved(false), 2000)
      } else {
        const body = await res.json()
        const message = body.error || "Failed to save. Please try again."
        setError(message)
        toast.error(message)
      }
    } catch {
      setError("Network error. Please try again.")
      toast.error("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5 pb-24">
      {planAffectingChanged && (
        <div
          className="flex items-start gap-3 rounded-2xl p-4"
          style={{ backgroundColor: "#FFFBEB", border: "1px solid #FDE68A" }}
        >
          <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
          <p className="text-sm" style={{ color: "#92400E" }}>
            You&apos;ve changed plan-affecting settings (cuisines, goal, or profile). Save then <strong>generate a new meal plan</strong> from the dashboard to apply them.
          </p>
        </div>
      )}
      <div className="rounded-2xl p-6" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <SectionHeader
          icon={User}
          iconColor="#2D5F5D"
          iconBg="#F0F7F7"
          title="Personal Info"
          desc="Used to calculate your daily calorie target"
        />

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#2C3E50" }}>Full Name</label>
            <input
              type="text"
              value={data.name}
              onChange={(e) => update("name", e.target.value)}
              className={INPUT_CLASS}
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#2C3E50" }}>
              Biological Sex <span className="font-normal" style={{ color: "#9CA3AF" }}>(for calorie calculation)</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "male", label: "Male" },
                { value: "female", label: "Female" },
              ].map((option) => {
                const selected = data.gender === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => update("gender", option.value)}
                    className="p-3 rounded-xl border-2 text-sm font-medium transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
                    style={{
                      borderColor: selected ? "#2D5F5D" : "#E5E7EB",
                      backgroundColor: selected ? "#F0F7F7" : "white",
                      color: selected ? "#2D5F5D" : "#6B7280",
                    }}
                  >
                    {selected && <Check size={13} className="inline mr-1.5" />}
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Age", field: "age", unit: "yrs", placeholder: "25" },
              { label: "Weight", field: "weight", unit: "kg", placeholder: "65" },
              { label: "Height", field: "height", unit: "cm", placeholder: "170" },
              { label: "Weekly Budget", field: "weeklyBudget", unit: "DH", placeholder: "300" },
            ].map(({ label, field, unit, placeholder }) => (
              <div key={field}>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "#2C3E50" }}>{label}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={data[field as keyof UserData] as string}
                    onChange={(e) => update(field as keyof UserData, e.target.value)}
                    placeholder={placeholder}
                    className={INPUT_CLASS}
                  />
                  <span className="absolute right-3 top-3.5 text-xs font-medium" style={{ color: "#9CA3AF" }}>
                    {unit}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {previewCal && (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: "#F0F7F7" }}>
                <Activity size={16} style={{ color: "#2D5F5D" }} />
                <p className="text-sm" style={{ color: "#2D5F5D" }}>
                  Estimated daily target: <span className="font-bold">{previewCal} kcal</span>
                </p>
              </div>
              <div
                className="p-3 rounded-xl"
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
                  Budget reality check
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "#6B7280" }}>
                  {budgetAssessment.message}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl p-6" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <SectionHeader
          icon={Store}
          iconColor="#2D5F5D"
          iconBg="#F0F7F7"
          title="Pricing Context"
          desc="Used to estimate Moroccan grocery costs more realistically"
        />

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "#2C3E50" }}>Primary city</label>
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-3.5" style={{ color: "#9CA3AF" }} />
              <select
                value={data.city}
                onChange={(e) => update("city", e.target.value)}
                className={`${INPUT_CLASS} pl-10`}
              >
                {cityOptions.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-3">
            {marketTierOptions.map((option) => {
              const selected = data.marketTier === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update("marketTier", option.value)}
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

          <p className="text-xs leading-relaxed" style={{ color: "#9CA3AF" }}>
            Soufra prices the same weekly plan differently for a souk basket versus a branded supermarket basket, so your budget feels grounded in how you actually shop.
          </p>
        </div>
      </div>

      <div className="rounded-2xl p-6" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <SectionHeader
          icon={Target}
          iconColor="#E67E22"
          iconBg="#FFF7F0"
          title="Fitness Goal"
          desc="Your goal shapes your calorie and macro targets"
        />

        <div className="grid grid-cols-2 gap-3 mb-5">
          {fitnessGoals.map((goal) => {
            const selected = data.fitnessGoal === goal.value
            const Icon = goal.icon
            return (
              <button
                key={goal.value}
                onClick={() => update("fitnessGoal", goal.value)}
                className="p-3 rounded-xl border-2 text-left transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
                style={{
                  borderColor: selected ? goal.color : "#E5E7EB",
                  backgroundColor: selected ? goal.bg : "white",
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: selected ? goal.bg : "#F9FAFB" }}>
                    <Icon size={15} style={{ color: selected ? goal.color : "#9CA3AF" }} />
                  </div>
                  {selected && <Check size={14} style={{ color: goal.color }} />}
                </div>
                <p className="font-semibold text-sm" style={{ color: "#2C3E50" }}>{goal.label}</p>
                <p className="text-xs" style={{ color: "#9CA3AF" }}>{goal.desc}</p>
              </button>
            )
          })}
        </div>

        <p className="text-sm font-medium mb-3" style={{ color: "#2C3E50" }}>Activity Level</p>
        <div className="grid grid-cols-2 gap-3">
          {activityLevels.map((level) => {
            const selected = data.activityLevel === level.value
            return (
              <button
                key={level.value}
                onClick={() => update("activityLevel", level.value)}
                className="p-3 rounded-xl border-2 text-left transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
                style={{
                  borderColor: selected ? "#2D5F5D" : "#E5E7EB",
                  backgroundColor: selected ? "#F0F7F7" : "white",
                }}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm" style={{ color: "#2C3E50" }}>{level.label}</p>
                  {selected && <Check size={14} style={{ color: "#2D5F5D" }} />}
                </div>
                <p className="text-xs" style={{ color: "#9CA3AF" }}>{level.desc}</p>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl p-6" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <SectionHeader
          icon={UtensilsCrossed}
          iconColor="#D4A574"
          iconBg="#FDF6EE"
          title="Favorite Cuisines"
          desc="The AI will prioritize these in your meal plans"
        />

        <div className="grid grid-cols-2 gap-3">
          {cuisineOptions.map((cuisine) => {
            const selected = data.cuisines.includes(cuisine.value)
            return (
              <button
                key={cuisine.value}
                onClick={() => toggleArray("cuisines", cuisine.value)}
                className="p-3 rounded-xl border-2 flex items-center gap-3 transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
                style={{
                  borderColor: selected ? "#2D5F5D" : "#E5E7EB",
                  backgroundColor: selected ? "#F0F7F7" : "white",
                }}
              >
                <span className="text-lg">{cuisine.emoji}</span>
                <span className="font-medium text-sm flex-1 text-left" style={{ color: "#2C3E50" }}>{cuisine.label}</span>
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    borderColor: selected ? "#2D5F5D" : "#D1D5DB",
                    backgroundColor: selected ? "#2D5F5D" : "transparent",
                  }}
                >
                  {selected && <Check size={9} color="white" strokeWidth={3} />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-2xl p-6" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <SectionHeader
          icon={AlertCircle}
          iconColor="#E67E22"
          iconBg="#FFF7F0"
          title="Dietary Restrictions"
          desc="We'll never include these in your meal plans"
        />

        <div className="grid grid-cols-2 gap-3 mb-3">
          {allergyOptions.map((allergy) => {
            const selected = data.allergies.includes(allergy.value)
            return (
              <button
                key={allergy.value}
                onClick={() => toggleArray("allergies", allergy.value)}
                className="p-3 rounded-xl border-2 flex items-center gap-3 transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
                style={{
                  borderColor: selected ? "#E67E22" : "#E5E7EB",
                  backgroundColor: selected ? "#FFF7F0" : "white",
                }}
              >
                <span className="text-lg">{allergy.emoji}</span>
                <span className="font-medium text-sm flex-1 text-left" style={{ color: "#2C3E50" }}>{allergy.label}</span>
                <div
                  className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    borderColor: selected ? "#E67E22" : "#D1D5DB",
                    backgroundColor: selected ? "#E67E22" : "transparent",
                  }}
                >
                  {selected && <Check size={9} color="white" strokeWidth={3} />}
                </div>
              </button>
            )
          })}
        </div>

        <button
          onClick={() => update("allergies", [])}
          className="w-full p-3 rounded-xl border-2 text-sm font-medium transition-all duration-150 hover:shadow-sm"
          style={{
            borderColor: data.allergies.length === 0 ? "#2D5F5D" : "#E5E7EB",
            backgroundColor: data.allergies.length === 0 ? "#F0F7F7" : "white",
            color: data.allergies.length === 0 ? "#2D5F5D" : "#6B7280",
          }}
        >
          {data.allergies.length === 0
            ? <span className="flex items-center justify-center gap-2"><Check size={14} /> No restrictions</span>
            : "None - I eat everything"}
        </button>
      </div>

      {/* Ramadan Mode */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
        <SectionHeader
          icon={Moon}
          iconColor="#6366F1"
          iconBg="#F5F3FF"
          title="Ramadan Mode"
          desc="Adapts your meal plan to Suhoor, Iftar, and post-Iftar meals"
        />

        <button
          type="button"
          onClick={() => update("isRamadan", !data.isRamadan)}
          className="w-full p-4 rounded-xl border-2 flex items-center justify-between transition-all duration-150 hover:shadow-sm active:scale-[0.98]"
          style={{
            borderColor: data.isRamadan ? "#6366F1" : "#E5E7EB",
            backgroundColor: data.isRamadan ? "#F5F3FF" : "white",
          }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌙</span>
            <div className="text-left">
              <p className="font-semibold text-sm" style={{ color: "#2C3E50" }}>
                {data.isRamadan ? "Ramadan Mode is ON" : "Enable Ramadan Mode"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                {data.isRamadan
                  ? "AI will generate Suhoor, Iftar & post-Iftar meals with traditional Ramadan foods"
                  : "Switch to Suhoor / Iftar / post-Iftar meal structure"}
              </p>
            </div>
          </div>
          <div
            className="w-11 h-6 rounded-full relative flex-shrink-0 transition-colors duration-200"
            style={{ backgroundColor: data.isRamadan ? "#6366F1" : "#D1D5DB" }}
          >
            <div
              className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
              style={{ transform: data.isRamadan ? "translateX(22px)" : "translateX(2px)" }}
            />
          </div>
        </button>

        {data.isRamadan && (
          <div className="mt-3 p-3 rounded-xl text-xs space-y-1" style={{ backgroundColor: "#F5F3FF", color: "#6366F1" }}>
            <p className="font-semibold mb-1.5">What changes in your plan:</p>
            <p>🌅 <strong>Suhoor</strong> — light, sustaining pre-dawn meal (30% of daily calories)</p>
            <p>🌙 <strong>Iftar</strong> — hearty break-fast with harira, dates & traditional dishes (50%)</p>
            <p>🍽️ <strong>Post-Iftar</strong> — lighter late dinner (20%)</p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      <div
        className="fixed bottom-0 left-0 right-0 lg:left-64 z-40 transition-all duration-300"
        style={{
          transform: hasChanges || saved ? "translateY(0)" : "translateY(100%)",
          opacity: hasChanges || saved ? 1 : 0,
        }}
      >
        <div className="mx-auto max-w-3xl px-4 lg:px-8 py-4" style={{ backgroundColor: "#FDFAF6", borderTop: "1px solid #E5E7EB" }}>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm" style={{ color: "#6B7280" }}>
              {saved ? "All changes saved" : "You have unsaved changes"}
            </p>
            <button
              onClick={handleSave}
              disabled={loading || saved}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-semibold text-white transition-all duration-200 hover:shadow-md active:scale-[0.98] disabled:opacity-60"
              style={{ backgroundColor: saved ? "#27AE60" : "#2D5F5D" }}
            >
              {saved ? (
                <><Check size={16} /> Saved</>
              ) : loading ? (
                "Saving..."
              ) : (
                <><Save size={16} /> Save Changes</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
