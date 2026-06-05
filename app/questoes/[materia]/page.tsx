import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { SeoShell } from "@/components/seo/seo-shell"
import { SeoCtaButton } from "@/components/seo/seo-cta"
import {
  getPublicSubjects,
  getPublicQuestionsForSubject,
} from "@/lib/seo/questions"
import { questionSlug } from "@/lib/slug"

export const revalidate = 86400

export async function generateStaticParams() {
  const subjects = await getPublicSubjects()
  return subjects.map((s) => ({ materia: s.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ materia: string }>
}): Promise<Metadata> {
  const { materia } = await params
  const subject = (await getPublicSubjects()).find((s) => s.slug === materia)
  if (!subject) return {}

  const title = `Questões de ${subject.name} — OAB 1ª fase (FGV) | AprovaOAB`
  const description = `Questões de ${subject.name} no padrão FGV para a 1ª fase da OAB, com gabarito e resolução comentada. Pratique de graça no AprovaOAB.`
  return {
    title,
    description,
    alternates: { canonical: `/questoes/${materia}` },
    openGraph: { title, description, url: `/questoes/${materia}` },
  }
}

function preview(enunciado: string, max = 160): string {
  const clean = enunciado.replace(/\s+/g, " ").trim()
  return clean.length > max ? clean.slice(0, max).trimEnd() + "…" : clean
}

export default async function MateriaPage({
  params,
}: {
  params: Promise<{ materia: string }>
}) {
  const { materia } = await params
  const subjects = await getPublicSubjects()
  const subject = subjects.find((s) => s.slug === materia)
  if (!subject) notFound()

  const questions = await getPublicQuestionsForSubject(subject.id)

  return (
    <SeoShell>
      <Link
        href="/questoes"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Todas as matérias
      </Link>

      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Questões de {subject.name} — OAB
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
        Questões de {subject.name} no padrão FGV para a 1ª fase da OAB, com gabarito. Clique em uma
        questão para ver as alternativas e a resposta — a resolução comentada fica no AprovaOAB.
      </p>

      <div className="mt-10 space-y-3">
        {questions.map((q, i) => (
          <Link
            key={q.id}
            href={`/questoes/${subject.slug}/${questionSlug(q)}`}
            className="block rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <div className="mb-2 flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">
                Questão {i + 1}
              </span>
              {(q.banca || q.ano) && (
                <span className="font-mono text-xs text-muted-foreground">
                  · {[q.banca, q.ano].filter(Boolean).join(" · ")}
                </span>
              )}
            </div>
            <p className="text-sm leading-relaxed text-foreground">{preview(q.enunciado)}</p>
          </Link>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-muted/20 p-6 text-center">
        <p className="text-lg font-semibold text-foreground">
          Quer praticar {subject.name} de verdade?
        </p>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          Milhares de questões, resolução comentada e plano de estudos personalizado.
        </p>
        <SeoCtaButton location="questoes_materia" />
      </div>
    </SeoShell>
  )
}
