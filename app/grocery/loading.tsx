export default function GroceryLoading() {
  return (
    <div className="max-w-4xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="skeleton h-8 w-44 mb-2" />
          <div className="skeleton h-4 w-64" />
        </div>
        <div className="skeleton h-11 w-40 rounded-xl" />
      </div>

      {/* Budget tracker */}
      <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="skeleton h-5 w-36" />
          <div className="skeleton h-6 w-28" />
        </div>
        <div className="skeleton h-3 w-full rounded-full mb-2" />
        <div className="skeleton h-4 w-48" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl p-4 text-center" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            <div className="skeleton h-8 w-16 mx-auto mb-1" />
            <div className="skeleton h-4 w-20 mx-auto" />
          </div>
        ))}
      </div>

      {/* Category sections */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, cat) => (
          <div key={cat} className="rounded-2xl overflow-hidden" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            {/* Category header */}
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderBottom: "1px solid #F5F5F5" }}>
              <div className="skeleton h-8 w-8 rounded-xl" />
              <div className="skeleton h-5 w-32" />
              <div className="skeleton h-5 w-10 rounded-full ml-auto" />
            </div>

            {/* Items */}
            <div className="divide-y" style={{ borderColor: "#F5F5F5" }}>
              {Array.from({ length: cat === 0 ? 4 : 3 }).map((_, item) => (
                <div key={item} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="skeleton h-5 w-5 rounded" />
                  <div className="skeleton h-4 flex-1" style={{ maxWidth: `${160 + item * 30}px` }} />
                  <div className="skeleton h-4 w-12 ml-auto" />
                  <div className="skeleton h-4 w-16" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
