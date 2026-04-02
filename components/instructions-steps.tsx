"use client"
import { useState } from "react"
import {
  ChefHat, ChevronLeft, ChevronRight, X,
  PlayCircle, Check, Wand2, Loader2, Flame,
} from "lucide-react"
import { toast } from "sonner"

// Meal-type icons shown in cook mode based on step position
const stepIcons = [Flame, ChefHat, Wand2]

export default function InstructionsSteps({
  instructions: initialInstructions,
  recipeId,
}: {
  instructions: string[]
  recipeId: string
}) {
  const [instructions, setInstructions] = useState(initialInstructions)
  const [done,         setDone]         = useState<Record<number, boolean>>({})
  const [cookMode,     setCookMode]     = useState(false)
  const [cookStep,     setCookStep]     = useState(0)
  const [enhancing,    setEnhancing]    = useState(false)
  // Animate step transitions in cook mode
  const [animDir,      setAnimDir]      = useState<"left" | "right">("right")
  const [animKey,      setAnimKey]      = useState(0)

  const toggle    = (i: number) => setDone(prev => ({ ...prev, [i]: !prev[i] }))
  const doneCount = Object.values(done).filter(Boolean).length
  const allDone   = doneCount === instructions.length
  const needsEnhancement = instructions.length <= 3

  const goTo = (i: number) => {
    setAnimDir(i > cookStep ? "right" : "left")
    setAnimKey(k => k + 1)
    setCookStep(i)
  }

  const prev = () => goTo(Math.max(0, cookStep - 1))
  const next = () => {
    if (cookStep < instructions.length - 1) goTo(cookStep + 1)
    else setCookMode(false)
  }

  const openCookMode = () => {
    setCookStep(0)
    setAnimKey(k => k + 1)
    setCookMode(true)
  }

  const enhance = async () => {
    setEnhancing(true)
    try {
      const res  = await fetch("/api/recipes/enhance", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ recipeId }),
      })
      const data = await res.json()
      if (res.ok) {
        setInstructions(data.instructions)
        setDone({})
        toast.success("Instructions enhanced by AI!")
      } else {
        toast.error("Failed to enhance. Try again.")
      }
    } catch {
      toast.error("Network error.")
    } finally {
      setEnhancing(false)
    }
  }

  const StepIcon = stepIcons[cookStep % stepIcons.length]

  return (
    <>
      {/* ── Cook Mode overlay ─────────────────────────────── */}
      {cookMode && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ backgroundColor: "#1E4A48" }}>

          {/* Top bar */}
          <div className="flex items-center justify-between px-6 pt-safe pt-6 pb-2">
            <div className="flex items-center gap-3">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "rgba(212,165,116,0.25)" }}>
                <ChefHat size={16} style={{ color: "#D4A574" }} />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Cook Mode
                </p>
                <p className="text-sm font-bold text-white leading-none">
                  Step {cookStep + 1} <span style={{ color: "rgba(255,255,255,0.4)" }}>/ {instructions.length}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setCookMode(false)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-110"
              style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.7)" }}>
              <X size={18} />
            </button>
          </div>

          {/* Progress segments */}
          <div className="flex items-center gap-1.5 px-6 py-4">
            {instructions.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className="rounded-full transition-all duration-400"
                style={{
                  height: "3px",
                  flex: i === cookStep ? "3" : "1",
                  backgroundColor: i < cookStep
                    ? "#D4A574"
                    : i === cookStep
                    ? "white"
                    : "rgba(255,255,255,0.2)",
                }}
              />
            ))}
          </div>

          {/* Step content — animated */}
          <div className="flex-1 flex flex-col justify-center px-6 pb-4 overflow-hidden">
            <div
              key={animKey}
              style={{
                animation: `${animDir === "right" ? "cookStepIn" : "cookStepInLeft"} 0.28s cubic-bezier(0.25,0.46,0.45,0.94) both`,
              }}>

              {/* Icon */}
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8"
                style={{ backgroundColor: "rgba(212,165,116,0.18)" }}>
                <StepIcon size={28} style={{ color: "#D4A574" }} />
              </div>

              {/* Step text */}
              <p
                className="font-medium leading-relaxed mb-6"
                style={{ color: "white", fontSize: "clamp(17px, 3.5vw, 22px)", lineHeight: 1.65 }}>
                {instructions[cookStep]}
              </p>

              {/* Quick tip if step mentions time */}
              {/\d+\s*(min|minute|second|hour)/i.test(instructions[cookStep]) && (
                <div
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm"
                  style={{ backgroundColor: "rgba(212,165,116,0.15)", color: "#D4A574" }}>
                  <Flame size={14} />
                  Watch the time on this step
                </div>
              )}
            </div>
          </div>

          {/* Nav buttons */}
          <div className="flex gap-3 px-6 pb-10">
            <button
              onClick={prev}
              disabled={cookStep === 0}
              className="flex items-center justify-center gap-1.5 flex-1 py-4 rounded-2xl font-semibold text-sm transition-all active:scale-95 disabled:opacity-25"
              style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "white" }}>
              <ChevronLeft size={18} /> Back
            </button>
            <button
              onClick={next}
              className="flex items-center justify-center gap-1.5 flex-[2.5] py-4 rounded-2xl font-bold text-sm transition-all active:scale-95"
              style={{ backgroundColor: "#D4A574", color: "#1E4A48" }}>
              {cookStep === instructions.length - 1 ? (
                <><Check size={18} strokeWidth={3} /> Done!</>
              ) : (
                <>Next <ChevronRight size={18} /></>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Normal card ───────────────────────────────────── */}
      <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: "1px solid #F5F5F5" }}>
          <h2 className="text-base font-bold flex items-center gap-2" style={{ color: "#2C3E50" }}>
            <ChefHat size={16} style={{ color: "#2D5F5D" }} />
            Instructions
            {doneCount > 0 && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium ml-1"
                style={{
                  backgroundColor: allDone ? "#F0FFF4" : "#F0F7F7",
                  color:           allDone ? "#27AE60" : "#2D5F5D",
                }}>
                {doneCount}/{instructions.length}
              </span>
            )}
          </h2>

          <div className="flex items-center gap-2">
            {/* Enhance button — only for short instructions */}
            {needsEnhancement && (
              <button
                onClick={enhance}
                disabled={enhancing}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:shadow-md hover:-translate-y-0.5 disabled:opacity-60"
                style={{ backgroundColor: "#FFF7F0", color: "#E67E22", border: "1px solid #FDDCB5" }}>
                {enhancing ? (
                  <><Loader2 size={12} className="animate-spin" /> Enhancing…</>
                ) : (
                  <><Wand2 size={12} /> Enhance with AI</>
                )}
              </button>
            )}

            <button
              onClick={openCookMode}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:shadow-md hover:-translate-y-0.5"
              style={{ backgroundColor: "#2D5F5D", color: "white" }}>
              <PlayCircle size={15} />
              Cook Mode
            </button>
          </div>
        </div>

        {/* Enhancement notice */}
        {needsEnhancement && !enhancing && (
          <div
            className="flex items-center gap-2 px-6 py-3 text-xs"
            style={{ backgroundColor: "#FFFBF5", borderBottom: "1px solid #FEF3E2", color: "#92400E" }}>
            <Wand2 size={12} />
            These instructions are brief — tap &quot;Enhance with AI&quot; for detailed beginner-friendly steps
          </div>
        )}

        {/* Steps list */}
        <ol className="divide-y" style={{ borderColor: "#F8F8F8" }}>
          {instructions.map((step, i) => {
            const isDone = done[i]
            return (
              <li
                key={i}
                onClick={() => toggle(i)}
                className="flex gap-4 px-6 py-4 cursor-pointer transition-colors duration-150"
                style={{ backgroundColor: isDone ? "#F9FFFE" : "white" }}
                onMouseEnter={e => { if (!isDone) (e.currentTarget as HTMLElement).style.backgroundColor = "#FAFAFA" }}
                onMouseLeave={e => { if (!isDone) (e.currentTarget as HTMLElement).style.backgroundColor = isDone ? "#F9FFFE" : "white" }}>

                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 transition-all duration-200"
                  style={{
                    backgroundColor: isDone ? "#27AE60" : "#2D5F5D",
                    color:           "white",
                    transform:       isDone ? "scale(1.1)" : "scale(1)",
                  }}>
                  {isDone ? <Check size={12} strokeWidth={3} /> : i + 1}
                </div>

                <p
                  className="flex-1 text-sm leading-relaxed transition-all pt-0.5"
                  style={{
                    color:          isDone ? "#9CA3AF" : "#2C3E50",
                    textDecoration: isDone ? "line-through" : "none",
                  }}>
                  {step}
                </p>
              </li>
            )
          })}
        </ol>

        {allDone && (
          <div
            className="flex items-center justify-center gap-2 px-6 py-4"
            style={{ backgroundColor: "#F0FFF4", borderTop: "1px solid #D1FAE5" }}>
            <Check size={16} style={{ color: "#27AE60" }} />
            <span className="text-sm font-semibold" style={{ color: "#27AE60" }}>
              All done — enjoy your meal!
            </span>
          </div>
        )}
      </div>
    </>
  )
}
