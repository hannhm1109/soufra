export type GenderValue = "male" | "female" | ""

export interface CalorieInput {
  gender?: GenderValue | string | null
  weight?: string | number | null
  height?: string | number | null
  age?: string | number | null
  activityLevel?: string | null
  fitnessGoal?: string | null
}

export function calculateCalories(data: CalorieInput): number | null {
  const weight = Number.parseFloat(String(data.weight ?? ""))
  const height = Number.parseFloat(String(data.height ?? ""))
  const age = Number.parseInt(String(data.age ?? ""), 10)

  if (!Number.isFinite(weight) || !Number.isFinite(height) || !Number.isFinite(age)) {
    return null
  }

  const offset = data.gender === "female" ? -161 : 5
  const bmr = 10 * weight + 6.25 * height - 5 * age + offset

  const activityMultipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
  }

  const multiplier = activityMultipliers[data.activityLevel ?? ""] ?? 1.55
  let calories = Math.round(bmr * multiplier)

  if (data.fitnessGoal === "lose_weight") calories -= 500
  if (data.fitnessGoal === "gain_muscle") calories += 300

  return Math.min(3500, Math.max(1200, calories))
}
