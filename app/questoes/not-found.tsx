import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SeoShell } from "@/components/seo/seo-shell"

// Capturado quando uma rota de /questoes chama notFound() (questão inexistente,
// removida, ou fora do subconjunto público). Em vez de um beco sem saída,
// oferece voltar à navegação de questões.
export default function QuestoesNotFound() {
  return (
    <SeoShell>
      <div className="py-12 text-center">
        <p className="font-mono text-sm text-muted-foreground">Erro 404</p>
        <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">
          Essa questão não está disponível
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          O link pode estar quebrado ou a questão saiu do ar. Veja as questões da OAB
          organizadas por matéria — com gabarito e resolução comentada.
        </p>
        <div className="mt-6">
          <Link
            href="/questoes"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Ver questões por matéria
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </SeoShell>
  )
}
