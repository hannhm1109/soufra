export default function DashboardLoading() {
  return (
    <div className="max-w-7xl mx-auto">

      {/* Greeting + Generate button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="skeleton h-8 w-56 mb-2" />
          <div className="skeleton h-4 w-40" />
        </div>
        <div className="skeleton h-11 w-44 rounded-xl" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-5" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div className="skeleton h-4 w-20 mb-3" />
            <div className="skeleton h-7 w-16 mb-1" />
            <div className="skeleton h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Meal plan grid — takes 2/3 */}
        <div className="lg:col-span-2 rounded-2xl overflow-hidden" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>

          {/* Header */}
          <div className="p-5 pb-4" style={{ borderBottom: "1px solid #F0F0F0" }}>
            <div className="flex items-center justify-between">
              <div className="skeleton h-5 w-32" />
              <div className="skeleton h-4 w-24" />
            </div>
          </div>

          {/* Day columns */}
          <div className="p-5">
            {/* Day labels */}
            <div className="grid grid-cols-7 gap-2 mb-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="skeleton h-4 rounded-full" />
              ))}
            </div>

            {/* Meal rows */}
            {Array.from({ length: 3 }).map((_, row) => (
              <div key={row} className="grid grid-cols-7 gap-2 mb-2">
                {Array.from({ length: 7 }).map((_, col) => (
                  <div key={col} className="skeleton rounded-xl" style={{ minHeight: "80px" }} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">

          {/* Grocery card */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div className="skeleton h-5 w-32 mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="skeleton h-4 w-28" />
                  <div className="skeleton h-4 w-12" />
                </div>
              ))}
            </div>
            <div className="skeleton h-9 w-full rounded-xl mt-4" />
          </div>

          {/* Profile card */}
          <div className="rounded-2xl p-5" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div className="skeleton h-5 w-28 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <div className="skeleton h-4 w-20" />
                  <div className="skeleton h-4 w-24" />
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <div className="skeleton h-6 w-20 rounded-full" />
              <div className="skeleton h-6 w-24 rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
