import Link from "next/link"
import type { Metadata } from "next"
import { notFound, permanentRedirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { SeoShell } from "@/components/seo/seo-shell"
import { SeoCtaButton } from "@/components/seo/seo-cta"
import { QuestaoInterativa } from "@/components/seo/questao-interativa"
import { JsonLd } from "@/components/seo/json-ld"
import {
  getAllPublicQuestions,
  getPublicQuestionById,
  getPublicQuestionsForSubject,
  slugDaQuestao,
  type PublicQuestionDetail,
} from "@/lib/seo/questions"
import { parseQuestionId } from "@/lib/slug"
import { edicaoDaBanca } from "@/lib/exames"
import { getQuestionErrorRate } from "@/lib/seo/stats"
import { OG_BASE } from "@/lib/seo/og"
import { APP_URL } from "@/lib/app-url"

export const revalidate = 86400

// `true` aqui é DELIBERADO, ao contrário dos outros segmentos dinâmicos.
//
// A questão é sempre resolvida pelo UUID no fim do slug, então o prefixo textual é
// livre: as URLs antigas (que traziam o enredo do caso) e qualquer variante já
// indexada precisam CHEGAR nesta página para receber o 301 canônico. Com `false`
// elas virariam 404 e o histórico de indexação seria descartado em vez de migrado.
//
// ─────────────────────────────────────────────────────────────────────────────
// POR QUE NÃO EXISTE app/questoes/loading.tsx (e não deve voltar a existir)
//
// Um `loading.tsx` no segmento cria uma fronteira de Suspense: o Next começa a
// transmitir a resposta com status 200 antes de a página terminar de renderizar.
// Depois disso, nem `notFound()` nem `permanentRedirect()` conseguem mais trocar o
// status — o redirect vira um salto do lado do cliente, embutido no payload RSC, e
// o 404 vira soft 404. Um robô lê os dois como página 200 válida.
//
// Medido em 11/ago/2026, mesma questão e mesmo build: com `loading.tsx`, o slug
// antigo respondia 200 (e o UUID inexistente também); sem ele, 308 para o
// canônico e 404 de verdade. Se o esqueleto de carregamento voltar, esta rota
// volta a servir conteúdo duplicado sem ninguém perceber — nada quebra, os testes
// passam, só o status code muda.
// ─────────────────────────────────────────────────────────────────────────────
export const dynamicParams = true

export async function generateStaticParams() {
  const questions = await getAllPublicQuestions()
  return questions.map((q) => ({ materia: q.subjectSlug, slug: q.slug }))
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

/**
 * Título e H1 da questão: tema + edição do exame.
 *
 * Antes era "Questão de {tópico} — {matéria} OAB {banca} {ano}", com a `banca`
 * inteira ("Exame de Ordem Unificado - XXXVI (FGV)") dentro do título: ~120
 * caracteres, dos quais o Google mostra ~60 — o tema aparecia e o resto era
 * cortado. E como o H1 não trazia a edição, as matérias com um único tópico
 * cadastrado ficavam com dez páginas de H1 idêntico (138 das 200 no total).
 *
 * Só o par (tema, edição) é usado, porque é o mesmo par que dá o slug: título,
 * H1 e URL passam a contar a mesma coisa.
 */
function tituloDaQuestao(q: PublicQuestionDetail): string {
  const edicao = edicaoDaBanca(q.banca)
  const tema = q.topicName ?? q.subjectName
  if (edicao) {
    return `${tema} — Questão do ${edicao}º Exame OAB${q.ano ? ` ${q.ano}` : ""}`
  }
  return `${tema} — Questão da OAB 1ª fase (${q.subjectName})`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ materia: string; slug: string }>
}): Promise<Metadata> {
  const { materia, slug } = await params
  const q = await resolve(slug)

  // `dynamicParams = true` deixa qualquer UUID inventado renderizar esta rota.
  // Hoje o `notFound()` da página responde 404 de verdade (medido no build de
  // produção: UUID inexistente → 404), então este noindex não é o que segura a
  // indexação — é backstop. Ele existe porque `generateMetadata` roda ANTES da
  // página, e no cenário descrito acima em `dynamicParams` (se um `loading.tsx`
  // voltar ao segmento e a resposta passar a sair 200 antes de renderizar) seria
  // a única defesa restante. Custa uma linha e cobre a falha silenciosa.
  if (!q) return { robots: { index: false, follow: false } }

  const title = tituloDaQuestao(q)
  // Description híbrida: rótulo primeiro, enredo depois. Só o enunciado (o que
  // havia antes) abria com "José é proprietário de imóvel rural…" — nenhuma
  // palavra que alguém busque, nos caracteres que mais pesam. Só o rótulo seria
  // idêntico em todas as páginas do mesmo tema.
  const rotulo = title.replace(" — Questão d", " · questão d")
  const description = `${rotulo}. ${preview(q.enunciado, 90)}`
  const canonical = `/questoes/${q.subjectSlug}/${slugDaQuestao(q)}`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { ...OG_BASE, title, description, url: canonical },
  }
}

export default async function QuestaoPage({
  params,
}: {
  params: Promise<{ materia: string; slug: string }>
}) {
  const { materia, slug } = await params
  const q = await resolve(slug)
  if (!q) notFound()

  // Endereço canônico desta questão. Como a resolução é sempre pelo UUID do fim do
  // slug, TODA outra grafia servia 200: o slug antigo (com o enredo do caso), a
  // matéria trocada, um prefixo inventado. Eram infinitas URLs equivalentes, com o
  // `canonical` como única defesa. Aqui elas viram 301 de verdade — o que também
  // faz a migração de formato do slug, sem tabela de-para.
  const canonico = `/questoes/${q.subjectSlug}/${slugDaQuestao(q)}`
  if (`/questoes/${materia}/${slug}` !== canonico) permanentRedirect(canonico)

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

  // Stat product-derived (% de alunos que erram) — só vem com amostra real >= limiar;
  // null quando a questão ainda tem poucas respostas (nada fabricado).
  const stat = await getQuestionErrorRate(q.id)

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

  // JSON-LD: BreadcrumbList (Questões › matéria › questão) — URLs absolutas.
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Questões",
        item: `${APP_URL}/questoes`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: q.subjectName,
        item: `${APP_URL}/questoes/${q.subjectSlug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: tituloDaQuestao(q),
        item: `${APP_URL}${canonico}`,
      },
    ],
  }

  return (
    <SeoShell>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbLd} />

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

      {/* Mesmo texto do <title> e do breadcrumb: o par (tema, edição) que também
          monta a URL. Ver `tituloDaQuestao`. */}
      <h1 className="text-xl font-bold leading-snug text-foreground sm:text-2xl">
        {tituloDaQuestao(q)}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        No <strong className="font-semibold text-foreground">AprovaOAB</strong> você resolve questões
        como esta com diagnóstico em 10 minutos, plano de estudos personalizado e simulados no padrão FGV.
      </p>

      {/* Enunciado */}
      <p className="mt-5 whitespace-pre-line text-base leading-relaxed text-foreground">
        {q.enunciado}
      </p>

      {/* Stat product-derived — só renderiza com amostra real (sem dado fabricado).
          Texto único por questão + reforça o CTA, sem revelar a resolução comentada. */}
      {stat && (
        <p className="mt-5 rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          📊 <strong className="font-semibold text-foreground">{stat.errPct}% dos alunos</strong> do
          AprovaOAB erram esta questão. Veja se você acerta.
        </p>
      )}

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
                href={`/questoes/${q.subjectSlug}/${slugDaQuestao(r)}`}
                className="block rounded-lg border border-border bg-card px-4 py-3 text-sm leading-relaxed text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                {preview(r.enunciado, 120)}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* CTA de rodapé — garante chamada pra ação mesmo pra quem não respondeu a questão */}
      <div className="mt-12 rounded-2xl border border-border bg-muted/20 p-6 text-center">
        <p className="text-lg font-semibold text-foreground">
          Pronto pra praticar de verdade?
        </p>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          Diagnóstico gratuito, resolução comentada e plano de estudos personalizado pra OAB.
        </p>
        <SeoCtaButton location="questao_rodape" />
      </div>
    </SeoShell>
  )
}
