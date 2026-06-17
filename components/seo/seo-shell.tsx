import { Header } from "@/components/site/header"
import { Footer } from "@/components/site/footer"

// Casca das páginas públicas de SEO: reaproveita o header e o footer da nova
// landing (dark-first). O wrapper `dark` força o tema escuro nessas páginas,
// independentemente da preferência do sistema, pra ficarem consistentes com a
// landing. O Header é fixo (h-16), por isso o pt-28 pra o conteúdo não ficar
// embaixo dele.
export function SeoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark min-h-screen bg-night">
      <Header />
      <main className="mx-auto max-w-3xl px-4 pt-28 pb-16 lg:pt-32">{children}</main>
      <Footer />
    </div>
  )
}
