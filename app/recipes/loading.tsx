export default function RecipesLoading() {
  return (
    <div className="max-w-6xl mx-auto">

      {/* Header */}
      <div className="mb-6 lg:mb-8">
        <div className="skeleton h-8 w-44 mb-2" />
        <div className="skeleton h-4 w-72" />
      </div>

      {/* Search + filters */}
      <div className="rounded-2xl p-4 mb-6 flex flex-col sm:flex-row gap-3" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div className="skeleton h-11 flex-1 rounded-xl" />
        <div className="skeleton h-11 w-36 rounded-xl" />
        <div className="skeleton h-11 w-36 rounded-xl" />
      </div>

      {/* Results count */}
      <div className="skeleton h-4 w-32 mb-5" />

      {/* Recipe grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-5" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
            {/* Top row: badge + heart */}
            <div className="flex items-center justify-between mb-3">
              <div className="skeleton h-6 w-24 rounded-full" />
              <div className="skeleton h-5 w-5 rounded-full" />
            </div>

            {/* Name */}
            <div className="skeleton h-6 w-full mb-1" />
            <div className="skeleton h-6 w-2/3 mb-4" />

            {/* Stats */}
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
