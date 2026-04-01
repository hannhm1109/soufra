export default function FavoritesLoading() {
  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-8">
        <div className="skeleton h-8 w-48 mb-2" />
        <div className="skeleton h-4 w-72" />
      </div>

      {/* Stats bar */}
      <div className="rounded-2xl p-4 mb-6 flex items-center gap-6" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div className="skeleton h-5 w-36" />
        <div className="h-4 w-px" style={{ backgroundColor: "#E5E7EB" }} />
        <div className="skeleton h-4 w-40" />
        <div className="h-4 w-px" style={{ backgroundColor: "#E5E7EB" }} />
        <div className="skeleton h-4 w-32" />
      </div>

      {/* Recipe grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-6" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            {/* Badge + heart */}
            <div className="flex items-center justify-between mb-3">
              <div className="skeleton h-6 w-24 rounded-full" />
              <div className="skeleton h-5 w-5 rounded-full" />
            </div>

            {/* Recipe name */}
            <div className="skeleton h-6 w-full mb-1" />
            <div className="skeleton h-6 w-3/4 mb-4" />

            {/* Stats row */}
            <div className="flex items-center gap-3 mb-4">
              <div className="skeleton h-4 w-14" />
              <div className="skeleton h-4 w-14" />
              <div className="skeleton h-4 w-14" />
            </div>

            {/* Macros bar */}
            <div className="skeleton h-2 w-full rounded-full mb-2" />
            <div className="flex justify-between">
              <div className="skeleton h-3 w-10" />
              <div className="skeleton h-3 w-10" />
              <div className="skeleton h-3 w-10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
