export default function SettingsLoading() {
  return (
    <div className="max-w-3xl mx-auto pb-24">

      {/* Header */}
      <div className="mb-8">
        <div className="skeleton h-9 w-36 mb-2" />
        <div className="skeleton h-4 w-64" />
      </div>

      {/* Sections */}
      {[
        { fields: 4 },
        { fields: 4 },
        { fields: 6 },
        { fields: 3 },
      ].map((section, i) => (
        <div key={i} className="rounded-2xl p-6 mb-5" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>

          {/* Section header */}
          <div className="flex items-center gap-3 mb-6 pb-4" style={{ borderBottom: "1px solid #F5F5F5" }}>
            <div className="skeleton h-10 w-10 rounded-xl" />
            <div>
              <div className="skeleton h-5 w-40 mb-1" />
              <div className="skeleton h-3 w-56" />
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {Array.from({ length: section.fields }).map((_, f) => (
              <div key={f} className={section.fields === 6 && f === 4 ? "sm:col-span-2" : ""}>
                <div className="skeleton h-4 w-24 mb-2" />
                <div className="skeleton h-11 w-full rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Cuisine tags area */}
      <div className="rounded-2xl p-6" style={{ backgroundColor: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-3 mb-6 pb-4" style={{ borderBottom: "1px solid #F5F5F5" }}>
          <div className="skeleton h-10 w-10 rounded-xl" />
          <div>
            <div className="skeleton h-5 w-32 mb-1" />
            <div className="skeleton h-3 w-48" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 5 }).map((_, t) => (
            <div key={t} className="skeleton h-10 w-28 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
