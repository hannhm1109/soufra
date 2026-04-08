import Sidebar from "@/components/sidebar"
import PageTransition from "@/components/page-transition"
import { LangProvider } from "@/components/lang-provider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <LangProvider>
      <div className="flex min-h-screen" style={{ backgroundColor: "#FDFAF6" }}>
        <Sidebar />
        <main className="flex-1 lg:ml-64 p-4 lg:p-8 pb-24 lg:pb-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </LangProvider>
  )
}