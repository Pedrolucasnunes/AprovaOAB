import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SeoShell } from "@/components/seo/seo-shell"

// Capturado quando /provas/[exame] chama notFound(): slug fora do formato
// "45-exame-oab", ou edição que não existe no banco (o 28º, por exemplo, não foi
// importado). Em vez de beco sem saída, devolve à lista de provas.
export default function ProvasNotFound() {
  return (
    <SeoShell>
      <div className="py-12 text-center">
        <p className="font-mono text-sm text-muted-foreground">Erro 404</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
          Essa prova não está disponível
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          O link pode estar quebrado ou esse exame ainda não entrou no banco. Veja as provas da
          OAB disponíveis — todas com enunciado, alternativas e gabarito.
        </p>
        <div className="mt-6">
          <Link
            href="/provas"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Ver todas as provas
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </SeoShell>
  )
}
