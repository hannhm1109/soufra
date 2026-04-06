export type MarketTierValue = "souk" | "supermarket" | "premium"

export interface BudgetAssessment {
  status: "on_track" | "tight" | "unrealistic" | "unknown"
  recommendedFloor: number | null
  recommendedComfortable: number | null
  estimatedCeiling: number | null
  message: string
}

function roundCurrency(value: number): number {
  return Number.parseFloat(value.toFixed(1))
}

export function assessBudgetFeasibility(input: {
  calorieTarget?: number | null
  weeklyBudget?: number | null
  marketTier?: MarketTierValue | null
  cuisineCount?: number
}): BudgetAssessment {
  const calorieTarget = input.calorieTarget ?? null
  const weeklyBudget = input.weeklyBudget ?? null
  const tier = input.marketTier ?? "supermarket"

  if (!calorieTarget) {
    return {
      status: "unknown",
      recommendedFloor: null,
      recommendedComfortable: null,
      estimatedCeiling: null,
      message: "Add your body metrics to unlock a realistic weekly budget range.",
    }
  }

  const tierRates: Record<MarketTierValue, { floor: number; comfortable: number; ceiling: number }> = {
    souk: { floor: 18, comfortable: 25, ceiling: 32 },
    supermarket: { floor: 22, comfortable: 30, ceiling: 39 },
    premium: { floor: 27, comfortable: 37, ceiling: 48 },
  }

  const cuisineFactor = 1 + Math.min(0.15, Math.max(0, ((input.cuisineCount ?? 1) - 1) * 0.04))
  const weeklyCalories = calorieTarget * 7
  const thousandCalorieUnits = weeklyCalories / 1000

  const floor = roundCurrency(thousandCalorieUnits * tierRates[tier].floor * cuisineFactor)
  const comfortable = roundCurrency(thousandCalorieUnits * tierRates[tier].comfortable * cuisineFactor)
  const ceiling = roundCurrency(thousandCalorieUnits * tierRates[tier].ceiling * cuisineFactor)

  if (!weeklyBudget) {
    return {
      status: "unknown",
      recommendedFloor: floor,
      recommendedComfortable: comfortable,
      estimatedCeiling: ceiling,
      message: `For ${calorieTarget} kcal/day in ${tier} mode, a realistic weekly grocery range starts around ${floor} DH.`,
    }
  }

  if (weeklyBudget < floor) {
    return {
      status: "unrealistic",
      recommendedFloor: floor,
      recommendedComfortable: comfortable,
      estimatedCeiling: ceiling,
      message: `Your ${weeklyBudget} DH target is likely too low for ${calorieTarget} kcal/day. A safer minimum is about ${floor} DH.`,
    }
  }

  if (weeklyBudget < comfortable) {
    return {
      status: "tight",
      recommendedFloor: floor,
      recommendedComfortable: comfortable,
      estimatedCeiling: ceiling,
      message: `${weeklyBudget} DH is possible, but the plan will need more lentils, eggs, seasonal produce, and fewer premium ingredients.`,
    }
  }

  return {
    status: "on_track",
    recommendedFloor: floor,
    recommendedComfortable: comfortable,
    estimatedCeiling: ceiling,
    message: `${weeklyBudget} DH is a realistic budget for your target calories and preferences.`,
  }
}

export function getConfidenceLabel(confidence: number | null | undefined): string {
  if (confidence == null) return "Low"
  if (confidence >= 0.8) return "High"
  if (confidence >= 0.55) return "Medium"
  return "Low"
}
