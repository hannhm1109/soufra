export default function HistoryLoading() {
  return (
    <div className="max-w-5xl mx-auto">

      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <div className="skeleton h-8 w-52 mb-2" />
        <div className="skeleton h-4 w-80" />
      </div>

      {/* Plan cards */}
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl overflow-hidden" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>

            {/* Card header — teal for first (active), gray for rest */}
            <div
              className="p-5 lg:p-6"
              style={{ backgroundColor: i === 0 ? "#2D5F5D" : "#F8F9FA" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl skeleton" style={{ flexShrink: 0 }} />
                  <div>
                    <div className={`skeleton h-5 w-20 mb-1 ${i === 0 ? "opacity-60" : ""}`} />
                    <div className={`skeleton h-4 w-32 ${i === 0 ? "opacity-40" : ""}`} />
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="hidden sm:flex gap-6">
                    {Array.from({ length: 3 }).map((_, s) => (
                      <div key={s} className="text-center">
                        <div className={`skeleton h-5 w-12 mx-auto mb-1 ${i === 0 ? "opacity-60" : ""}`} />
                        <div className={`skeleton h-3 w-16 mx-auto ${i === 0 ? "opacity-40" : ""}`} />
                      </div>
                    ))}
                  </div>
                  <div className="skeleton h-9 w-9 rounded-xl" style={{ flexShrink: 0 }} />
                </div>
              </div>
            </div>

            {/* Cuisine tags */}
            <div className="px-5 lg:px-6 pt-4 flex gap-2">
              {Array.from({ length: 3 }).map((_, t) => (
                <div key={t} className="skeleton h-6 w-24 rounded-full" />
              ))}
            </div>

            {/* Expanded preview — only for first card */}
            {i === 0 && (
              <div className="p-5 lg:p-6">
                {/* Tabs */}
                <div className="flex gap-2 mb-4 pb-3" style={{ borderBottom: "1px solid #F0F0F0" }}>
                  {Array.from({ length: 3 }).map((_, t) => (
                    <div key={t} className={`skeleton h-8 w-24 rounded-xl ${t === 0 ? "" : "opacity-60"}`} />
                  ))}
                </div>
                {/* Week grid */}
                <div className="grid min-w-[560px] overflow-x-auto" style={{ gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" }}>
                  {Array.from({ length: 7 }).map((_, d) => (
                    <div key={d}>
                      <div className="skeleton h-3 w-8 mx-auto mb-1.5" />
                      <div className="skeleton rounded-xl" style={{ minHeight: "72px" }} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
