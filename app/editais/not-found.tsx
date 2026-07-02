import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SeoShell } from "@/components/seo/seo-shell"

// Capturado quando /editais/[slug] chama notFound() (exame inexistente ou fora
// do ar). Em vez de um beco sem saída, oferece voltar à lista de editais.
export default function EditaisNotFound() {
  return (
    <SeoShell>
      <div className="py-12 text-center">
        <p className="font-mono text-sm text-muted-foreground">Erro 404</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
          Esse edital não está disponível
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          O link pode estar quebrado ou o exame ainda não foi cadastrado. Veja os editais da OAB
          disponíveis, com cronograma e datas oficiais.
        </p>
        <div className="mt-6">
          <Link
            href="/editais"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Ver todos os editais
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </SeoShell>
  )
}
