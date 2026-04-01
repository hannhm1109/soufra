"use client"
import { useState } from "react"
import { ChefHat, ChevronLeft, ChevronRight, X, PlayCircle, Check } from "lucide-react"

export default function InstructionsSteps({ instructions }: { instructions: string[] }) {
  const [done,       setDone]       = useState<Record<number, boolean>>({})
  const [cookMode,   setCookMode]   = useState(false)
  const [cookStep,   setCookStep]   = useState(0)

  const toggle = (i: number) => setDone(prev => ({ ...prev, [i]: !prev[i] }))
  const doneCount = Object.values(done).filter(Boolean).length
  const allDone   = doneCount === instructions.length

  const prev = () => setCookStep(s => Math.max(0, s - 1))
  const next = () => {
    if (cookStep < instructions.length - 1) setCookStep(s => s + 1)
    else setCookMode(false)
  }

  return (
    <>
      {/* ── Cook Mode overlay ─────────────────────────────── */}
      {cookMode && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ backgroundColor: "#2D5F5D" }}>

          {/* Top bar */}
          <div className="flex items-center justify-between px-6 pt-6 pb-4">
            <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
              Step {cookStep + 1} of {instructions.length}
            </span>
            <button
              onClick={() => setCookMode(false)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "white" }}>
              <X size={18} />
            </button>
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-2 px-6 mb-8">
            {instructions.map((_, i) => (
              <button
                key={i}
                onClick={() => setCookStep(i)}
                className="transition-all duration-300 rounded-full"
                style={{
                  height:          "4px",
                  flex:            i === cookStep ? "3" : "1",
                  backgroundColor: i < cookStep
                    ? "#D4A574"
                    : i === cookStep
                    ? "white"
                    : "rgba(255,255,255,0.25)",
                }}
              />
            ))}
          </div>

          {/* Step content */}
          <div className="flex-1 flex flex-col justify-center px-6 pb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
              style={{ backgroundColor: "rgba(212,165,116,0.25)" }}>
              <span className="text-2xl font-black" style={{ color: "#D4A574" }}>
                {cookStep + 1}
              </span>
            </div>
            <p
              className="leading-relaxed font-medium"
              style={{ color: "white", fontSize: "clamp(18px, 4vw, 24px)", lineHeight: 1.6 }}>
              {instructions[cookStep]}
            </p>
          </div>

          {/* Nav buttons */}
          <div className="flex gap-4 px-6 pb-10">
            <button
              onClick={prev}
              disabled={cookStep === 0}
              className="flex items-center justify-center gap-2 flex-1 py-4 rounded-2xl font-semibold text-sm transition-all disabled:opacity-30"
              style={{ backgroundColor: "rgba(255,255,255,0.12)", color: "white" }}>
              <ChevronLeft size={18} /> Previous
            </button>
            <button
              onClick={next}
              className="flex items-center justify-center gap-2 flex-[2] py-4 rounded-2xl font-semibold text-sm transition-all"
              style={{ backgroundColor: "#D4A574", color: "#2D5F5D" }}>
              {cookStep === instructions.length - 1 ? (
                <><Check size={18} /> Done cooking!</>
              ) : (
                <>Next step <ChevronRight size={18} /></>
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
                style={{ backgroundColor: allDone ? "#F0FFF4" : "#F0F7F7", color: allDone ? "#27AE60" : "#2D5F5D" }}>
                {doneCount}/{instructions.length}
              </span>
            )}
          </h2>

          <button
            onClick={() => { setCookStep(0); setCookMode(true) }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:shadow-md hover:-translate-y-0.5"
            style={{ backgroundColor: "#2D5F5D", color: "white" }}>
            <PlayCircle size={15} />
            Cook Mode
          </button>
        </div>

        {/* Steps list */}
        <ol className="divide-y" style={{ borderColor: "#F8F8F8" }}>
          {instructions.map((step, i) => {
            const isDone = done[i]
            return (
              <li
                key={i}
                onClick={() => toggle(i)}
                className="flex gap-4 px-6 py-4 cursor-pointer transition-all duration-150 group"
                style={{ backgroundColor: isDone ? "#F9FFFE" : "white" }}
                onMouseEnter={e => { if (!isDone) (e.currentTarget as HTMLElement).style.backgroundColor = "#FAFAFA" }}
                onMouseLeave={e => { if (!isDone) (e.currentTarget as HTMLElement).style.backgroundColor = "white" }}>

                {/* Step number / check */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 transition-all duration-200"
                  style={{
                    backgroundColor: isDone ? "#27AE60" : "#2D5F5D",
                    color:           "white",
                    transform:       isDone ? "scale(1.1)" : "scale(1)",
                  }}>
                  {isDone ? <Check size={12} strokeWidth={3} /> : i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm leading-relaxed transition-all"
                    style={{
                      color:          isDone ? "#9CA3AF" : "#2C3E50",
                      textDecoration: isDone ? "line-through" : "none",
                    }}>
                    {step}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>

        {/* All done state */}
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
