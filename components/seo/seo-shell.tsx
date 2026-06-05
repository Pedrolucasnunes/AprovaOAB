import { Header } from "@/components/landing/header"
import { Footer } from "@/components/landing/footer"

// Casca das páginas públicas de SEO: reaproveita o header e o footer da landing.
// O Header é fixo (h-16), por isso o pt-28 para o conteúdo não ficar embaixo dele.
export function SeoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pt-28 pb-16 lg:pt-32">{children}</main>
      <Footer />
    </div>
  )
}
