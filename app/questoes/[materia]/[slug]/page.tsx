import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { SeoShell } from "@/components/seo/seo-shell"
import { QuestaoInterativa } from "@/components/seo/questao-interativa"
import {
  getAllPublicQuestions,
  getPublicQuestionById,
  getPublicQuestionsForSubject,
  type PublicQuestionDetail,
} from "@/lib/seo/questions"
import { parseQuestionId, questionSlug } from "@/lib/slug"

export const revalidate = 86400

export async function generateStaticParams() {
  const questions = await getAllPublicQuestions()
  return questions.map((q) => ({ materia: q.subjectSlug, slug: questionSlug(q) }))
}

async function resolve(slug: string): Promise<PublicQuestionDetail | null> {
  const id = parseQuestionId(slug)
  if (!id) return null
  return getPublicQuestionById(id)
}

function preview(enunciado: string, max = 155): string {
  const clean = enunciado.replace(/\s+/g, " ").trim()
  return clean.length > max ? clean.slice(0, max).trimEnd() + "…" : clean
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ materia: string; slug: string }>
}): Promise<Metadata> {
  const { materia, slug } = await params
  const q = await resolve(slug)
  if (!q || q.subjectSlug !== materia) return {}

  const ctx = [q.banca, q.ano].filter(Boolean).join(" ")
  const title = `Questão de ${q.subjectName} — OAB${ctx ? " " + ctx : ""} | AprovaOAB`
  const description = preview(q.enunciado)
  const canonical = `/questoes/${q.subjectSlug}/${questionSlug(q)}`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical },
  }
}

export default async function QuestaoPage({
  params,
}: {
  params: Promise<{ materia: string; slug: string }>
}) {
  const { materia, slug } = await params
  const q = await resolve(slug)
  if (!q || q.subjectSlug !== materia) notFound()

  const alternativas = [
    { letra: "A", texto: q.alternativa_a },
    { letra: "B", texto: q.alternativa_b },
    { letra: "C", texto: q.alternativa_c },
    { letra: "D", texto: q.alternativa_d },
  ]
  const corretaTexto =
    alternativas.find((a) => a.letra === q.resposta_correta)?.texto ?? ""

  const related = (await getPublicQuestionsForSubject(q.subject_id))
    .filter((r) => r.id !== q.id)
    .slice(0, 6)

  // JSON-LD: schema.org Quiz → Question (elegível ao rich result de "practice problems")
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Quiz",
    about: { "@type": "Thing", name: `OAB — ${q.subjectName}` },
    hasPart: {
      "@type": "Question",
      eduQuestionType: "Multiple choice",
      text: q.enunciado,
      suggestedAnswer: alternativas
        .filter((a) => a.letra !== q.resposta_correta)
        .map((a) => ({ "@type": "Answer", text: a.texto })),
      acceptedAnswer: { "@type": "Answer", text: corretaTexto },
    },
  }

  return (
    <SeoShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/questoes" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Questões
        </Link>
        <span>/</span>
        <Link href={`/questoes/${q.subjectSlug}`} className="hover:text-foreground">
          {q.subjectName}
        </Link>
      </nav>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-primary/20 bg-primary/15 px-3 py-1 text-xs font-medium text-primary">
          {q.subjectName}
        </span>
        {(q.banca || q.ano) && (
          <span className="font-mono text-xs text-muted-foreground">
            {[q.banca, q.ano].filter(Boolean).join(" · ")}
          </span>
        )}
        {q.dificuldade && (
          <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">
            {q.dificuldade}
          </span>
        )}
      </div>

      <h1 className="text-xl font-bold leading-snug text-foreground sm:text-2xl">
        Questão de {q.subjectName} — OAB 1ª fase
      </h1>

      {/* Enunciado */}
      <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-foreground">
        {q.enunciado}
      </p>

      {/* Alternativas interativas (tenta responder → revela gabarito + comentário gated) */}
      <div className="mt-6">
        <QuestaoInterativa
          alternativas={alternativas}
          respostaCorreta={q.resposta_correta}
          materia={q.subjectName}
        />
      </div>

      {/* Relacionadas (linkagem interna) */}
      {related.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Mais questões de {q.subjectName}
          </h2>
          <div className="space-y-2">
            {related.map((r) => (
              <Link
                key={r.id}
                href={`/questoes/${q.subjectSlug}/${questionSlug(r)}`}
                className="block rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                {preview(r.enunciado, 120)}
              </Link>
            ))}
          </div>
        </div>
      )}
    </SeoShell>
  )
}
