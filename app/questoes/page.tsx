import Link from "next/link"
import type { Metadata } from "next"
import { SeoShell } from "@/components/seo/seo-shell"
import { SeoCtaButton } from "@/components/seo/seo-cta"
import { getPublicSubjects } from "@/lib/seo/questions"

export const revalidate = 86400

export const metadata: Metadata = {
  title: "Questões da OAB por matéria — grátis e comentadas | AprovaOAB",
  description:
    "Pratique questões da 1ª fase da OAB no padrão FGV, organizadas por matéria e com gabarito. Resolução comentada e plano de estudos personalizado no AprovaOAB.",
  alternates: { canonical: "/questoes" },
  openGraph: {
    title: "Questões da OAB por matéria — grátis e comentadas",
    description:
      "Pratique questões da 1ª fase da OAB no padrão FGV, organizadas por matéria e com gabarito.",
    url: "/questoes",
  },
}

export default async function QuestoesHubPage() {
  const subjects = await getPublicSubjects()

  return (
    <SeoShell>
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Questões da OAB por matéria
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
        Resolva questões da 1ª fase da OAB no padrão FGV, separadas por matéria e com gabarito.
        Escolha uma disciplina abaixo para começar — a resolução comentada e o plano de estudos
        personalizado ficam no AprovaOAB.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {subjects.map((s) => (
          <Link
            key={s.id}
            href={`/questoes/${s.slug}`}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <span className="font-medium text-foreground">{s.name}</span>
            <span className="font-mono text-xs text-muted-foreground">
              {s.count} {s.count === 1 ? "questão" : "questões"}
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-muted/20 p-6 text-center">
        <p className="text-lg font-semibold text-foreground">
          Descubra suas lacunas em 10 minutos
        </p>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          Diagnóstico gratuito, plano de estudos personalizado e simulados no padrão FGV.
        </p>
        <SeoCtaButton location="questoes_hub" />
      </div>
    </SeoShell>
  )
}
