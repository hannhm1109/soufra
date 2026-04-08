"use client"
import { motion } from "framer-motion"
import HistoryPlanCard from "@/components/history-plan-card"

const listVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number,number,number,number] } },
}

type Slot = {
  id: string
  dayOfWeek: number
  mealType: string
  recipe: {
    id: string
    name: string
    cuisine: string
    calories: number
    protein: number
    carbs: number
    fats: number
    difficulty: string
  }
}

type Plan = {
  id: string
  createdAt: Date
  isActive: boolean
  slots: Slot[]
}

export default function HistoryList({
  plans,
}: {
  plans: Plan[]
}) {
  return (
    <motion.div
      className="space-y-6"
      variants={listVariants}
      initial="hidden"
      animate="show">
      {plans.map((plan, index) => (
        <motion.div key={plan.id} variants={cardVariants}>
          <HistoryPlanCard
            plan={plan}
            planNumber={plans.length - index}
          />
        </motion.div>
      ))}
    </motion.div>
  )
}
