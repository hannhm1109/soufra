import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import SettingsForm from "@/components/settings-form"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  })

  if (!user) redirect("/login")

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-1" style={{ color: "#2C3E50" }}>
          Settings
        </h1>
        <p style={{ color: "#6B7280" }}>
          Update your preferences to get better meal plans
        </p>
      </div>

      <SettingsForm user={{
        name: user.name || "",
        gender: user.gender || "",
        age: user.age?.toString() || "",
        weight: user.weight?.toString() || "",
        height: user.height?.toString() || "",
        city: user.city || "Casablanca",
        marketTier: user.marketTier || "supermarket",
        fitnessGoal: user.fitnessGoal || "",
        activityLevel: user.activityLevel || "",
        cuisines: user.cuisines || [],
        allergies: user.allergies || [],
        weeklyBudget: user.weeklyBudget?.toString() || "",
      }} />
    </div>
  )
}
