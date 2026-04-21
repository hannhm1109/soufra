import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"

interface OnboardingData {
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
}

interface OnboardingStore {
  step: number
  data: OnboardingData
  setStep: (step: number) => void
  updateData: (fields: Partial<OnboardingData>) => void
  reset: () => void
}

const DEFAULT_DATA: OnboardingData = {
  gender: "",
  age: "",
  weight: "",
  height: "",
  city: "Casablanca",
  marketTier: "supermarket",
  fitnessGoal: "",
  activityLevel: "",
  cuisines: [],
  allergies: [],
  weeklyBudget: "",
}

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      step: 1,
      data: DEFAULT_DATA,
      setStep: (step) => set({ step }),
      updateData: (fields) =>
        set((state) => ({ data: { ...state.data, ...fields } })),
      reset: () => set({ step: 1, data: DEFAULT_DATA }),
    }),
    {
      name: "soufra-onboarding",
      // sessionStorage: clears automatically when the tab closes,
      // preventing stale data from leaking into a future session
      storage: createJSONStorage(() => sessionStorage),
    }
  )
)
