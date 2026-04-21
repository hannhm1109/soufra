import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import OnboardingWizard from "./_components/wizard"

export default async function OnboardingPage() {
  const session = await auth()
  if (!session?.user?.email) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { fitnessGoal: true },
  })

  // Already onboarded — no need to go through the wizard again
  if (user?.fitnessGoal) redirect("/dashboard")

  return <OnboardingWizard />
}
