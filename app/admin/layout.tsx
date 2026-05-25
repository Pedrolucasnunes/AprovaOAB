import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { Separator } from "@/components/ui/separator"
import { ThemeToggle } from "@/components/theme-toggle"
import { requireAdminPage } from "@/lib/auth-server"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage()

  return (
    <SidebarProvider>
      <AdminSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center justify-between border-b border-border px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-2" />
            <Separator orientation="vertical" className="h-6" />
            <span className="text-sm font-medium text-muted-foreground">Painel Administrativo</span>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
