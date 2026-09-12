import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { SeoShell } from "@/components/seo/seo-shell"
import { SeoCtaButton } from "@/components/seo/seo-cta"
import { JsonLd } from "@/components/seo/json-ld"
import {
  getPublicSubjects,
  getPublicQuestionsForSubject,
  slugDaQuestao,
  tituloDaQuestao,
  PUBLIC_QUESTIONS_PER_SUBJECT,
} from "@/lib/seo/questions"
import { getMateriaIntro } from "@/lib/seo/materia-intro"
import { breadcrumb, collectionPage, itemList } from "@/lib/seo/jsonld"
import { OG_BASE } from "@/lib/seo/og"

export const revalidate = 86400

// As matérias saem todas de `getPublicSubjects()` no build, então barrar no
// roteador é 404 real e mais barato — não chega a renderizar. Ver a explicação
// sobre streaming e status code em app/questoes/[materia]/[slug]/page.tsx.
export const dynamicParams = false

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

  const title = `Questões de ${subject.name} — OAB 1ª fase (FGV)`
  const description = `Questões de ${subject.name} no padrão FGV para a 1ª fase da OAB, com gabarito e resolução comentada. Pratique de graça no AprovaOAB.`
  return {
    title,
    description,
    alternates: { canonical: `/questoes/${materia}` },
    openGraph: { ...OG_BASE, title, description, url: `/questoes/${materia}` },
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
  const intro = getMateriaIntro(subject.slug)

  // O `name` de cada item sai de `tituloDaQuestao`, o MESMO helper que dá o H1 da
  // página de destino — se aqui dissesse outra coisa, o ItemList descreveria
  // páginas que não existem. Só o tópico não serve: um tópico rende várias
  // questões, e o `name` repetia em 139 dos 200 itens (medido em 19 das 20
  // matérias, com 10 de 10 iguais em Filosofia, ECA, Ambiental e Proc. do Trabalho).
  const jsonLd = [
    collectionPage({
      name: `Questões de ${subject.name} — OAB 1ª fase`,
      description: `Questões de ${subject.name} no padrão FGV para a 1ª fase da OAB, com gabarito.`,
      path: `/questoes/${subject.slug}`,
    }),
    breadcrumb([
      { name: "Questões da OAB", path: "/questoes" },
      { name: subject.name, path: `/questoes/${subject.slug}` },
    ]),
    itemList(
      `Questões de ${subject.name}`,
      questions.map((q) => ({
        name: tituloDaQuestao(q, subject.name),
        path: `/questoes/${subject.slug}/${slugDaQuestao(q)}`,
      })),
    ),
  ]

  return (
    <SeoShell>
      <JsonLd data={jsonLd} />

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
        {intro?.lead ??
          `Questões de ${subject.name} no padrão FGV para a 1ª fase da OAB, com gabarito. Clique em uma questão para ver as alternativas e a resposta — a resolução comentada fica no AprovaOAB.`}
      </p>

      <div className="mt-10 space-y-3">
        {questions.map((q) => (
          <Link
            key={q.id}
            href={`/questoes/${subject.slug}/${slugDaQuestao(q)}`}
            className="block rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            {/* O título do destino é a primeira linha do card, no lugar de
                "Questão 1 · Exame de Ordem Unificado - XLI (FGV) · 2024". Dois
                motivos, e nenhum é estético.

                A ÂNCORA: era o recorte do enunciado. Eram 200 links internos
                começando em "Durante uma forte tempestade que causou
                inundações…" — sem palavra-chave e sem dizer ao leitor pra onde
                vão. `tituloDaQuestao` é o mesmo helper que dá o H1 do destino.

                O RÓTULO: "Questão 1" era a posição NESTA lista, e o leitor lê
                como a posição na prova. O banco não guarda a ordem da questão no
                exame — é a mesma razão pela qual a página de prova não pode
                numerar as 80. Afirmação que o dado não sustenta.

                O enunciado continua, embaixo, onde ele serve: ajudar a escolher
                qual abrir. */}
            <p className="text-sm font-medium leading-relaxed text-foreground">
              {tituloDaQuestao(q, subject.name)}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {preview(q.enunciado)}
            </p>
          </Link>
        ))}
      </div>

      {/* Liga o eixo matéria ao eixo exame. Os dois se cruzavam só num sentido:
          a página de prova já linka as 20 matérias, e daqui não havia caminho de
          volta a não ser o menu do topo, que é o mesmo em toda página. */}
      <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
        {/* Sem "as 80 questões": os exames 19, 35, 37 e 43 têm 78, e só a página
            da prova conhece a contagem real (derivada de `questoes.length`). */}
        Cada uma delas veio de um exame diferente. A prova completa de cada edição, com todas as
        questões e o gabarito, está em{" "}
        <Link href="/provas" className="text-primary underline-offset-4 hover:underline">
          provas da OAB
        </Link>
        .
      </p>

      {intro && (intro.topicos?.length || intro.dica) && (
        <section className="mt-12 max-w-2xl">
          {intro.topicos?.length ? (
            <>
              <h2 className="text-xl font-semibold text-foreground">
                O que mais cai de {subject.name} na OAB
              </h2>
              <ul className="mt-4 space-y-2">
                {intro.topicos.map((t) => (
                  <li
                    key={t}
                    className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                  >
                    <span className="mt-1 text-primary">•</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          {intro.dica ? (
            <p className="mt-6 rounded-xl border border-border bg-muted/20 p-4 text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">Dica de estudo: </span>
              {intro.dica}
            </p>
          ) : null}
        </section>
      )}

      <div className="mt-12 rounded-2xl border border-border bg-muted/20 p-6 text-center">
        <p className="text-lg font-semibold text-foreground">
          Quer praticar {subject.name} de verdade?
        </p>
        {/* Número real da matéria, não "Milhares": esta página mostra 10
            questões, e a contagem verdadeira já vinha calculada de graça em
            getPublicSubjects. Afirmação que a própria tela desmente é o pior
            tipo de copy que a gente pode ter. */}
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          {subject.total > PUBLIC_QUESTIONS_PER_SUBJECT
            ? `São ${subject.total} questões de ${subject.name} na plataforma, com resolução comentada e plano de estudos que se ajusta aos seus erros.`
            : `Resolução comentada e plano de estudos que se ajusta aos seus erros.`}
        </p>
        <SeoCtaButton location="questoes_materia" />
      </div>
    </SeoShell>
  )
}
