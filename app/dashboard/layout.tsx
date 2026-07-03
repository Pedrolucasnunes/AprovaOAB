import { Suspense } from "react"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/dashboard/app-sidebar"
import { OnboardingModal } from "@/components/dashboard/onboarding-modal"
import { FeedbackButton } from "@/components/dashboard/feedback-button"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b border-border px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-2" />
            <Separator orientation="vertical" className="h-6" />
          </div>
          <ThemeToggle />
        </header>
        {/* pb-24 reserva espaço pro FeedbackButton fixo (bottom-6 right-6) não
            cobrir o conteúdo do fim da página. */}
        <main className="flex-1 overflow-auto p-4 pb-24 lg:p-6 lg:pb-24">
          {children}
        </main>
      </SidebarInset>
      <Suspense fallback={null}>
        <OnboardingModal />
      </Suspense>
      <FeedbackButton />
    </SidebarProvider>
  )
}
