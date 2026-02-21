import { create } from "zustand"

interface OnboardingData {
  age: string
  weight: string
  height: string
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

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  step: 1,
  data: {
    age: "",
    weight: "",
    height: "",
    fitnessGoal: "",
    activityLevel: "",
    cuisines: [],
    allergies: [],
    weeklyBudget: "",
  },
  setStep: (step) => set({ step }),
  updateData: (fields) =>
    set((state) => ({ data: { ...state.data, ...fields } })),
  reset: () =>
    set({
      step: 1,
      data: {
        age: "",
        weight: "",
        height: "",
        fitnessGoal: "",
        activityLevel: "",
        cuisines: [],
        allergies: [],
        weeklyBudget: "",
      },
    }),
}))