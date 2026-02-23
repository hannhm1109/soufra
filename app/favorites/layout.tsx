import Sidebar from "@/components/sidebar"

export default function FavoritesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "#FDFAF6" }}>
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pb-24 lg:pb-8">
        {children}
      </main>
    </div>
  )
}