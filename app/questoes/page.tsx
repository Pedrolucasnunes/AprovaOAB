import Link from "next/link"
import type { Metadata } from "next"
import { SeoShell } from "@/components/seo/seo-shell"
import { SeoCtaButton } from "@/components/seo/seo-cta"
import { JsonLd } from "@/components/seo/json-ld"
import {
  getPublicSubjects,
  getPublicQuestionsForSubject,
  slugDaQuestao,
  tituloDaQuestao,
} from "@/lib/seo/questions"
import { listarExames } from "@/lib/seo/provas"
import { breadcrumb, collectionPage, itemList } from "@/lib/seo/jsonld"
import { OG_BASE } from "@/lib/seo/og"

export const revalidate = 86400

export const metadata: Metadata = {
  title: "Questões da OAB por matéria — grátis e comentadas",
  description:
    "Pratique questões da 1ª fase da OAB no padrão FGV, organizadas por matéria e com gabarito. Resolução comentada e plano de estudos personalizado no AprovaOAB.",
  alternates: { canonical: "/questoes" },
  openGraph: {
    ...OG_BASE,
    title: "Questões da OAB por matéria — grátis e comentadas",
    description:
      "Pratique questões da 1ª fase da OAB no padrão FGV, organizadas por matéria e com gabarito.",
    url: "/questoes",
  },
}

export default async function QuestoesHubPage() {
  const [subjectsBrutos, exames] = await Promise.all([getPublicSubjects(), listarExames()])

  // Cada matéria com as questões que ela publica e o peso dela na prova.
  //
  // O peso é MEDIDO, não estimado: `total` (questões da matéria no acervo) dividido
  // pelo número de provas. Nenhum número escrito à mão aqui — o CLAUDE.md tinha
  // uma lista de pesos de cabeça ("Processo Civil 7, Constitucional 6") que a
  // medição contradiz, e é esse tipo de constante que apodrece calada.
  //
  // Ordenado da que mais cai para a que menos cai, e não alfabeticamente: pra quem
  // vai estudar, essa ordem é a informação. O rótulo diz de onde o número vem.
  const materias = (
    await Promise.all(
      subjectsBrutos.map(async (s) => ({
        ...s,
        media: exames.length > 0 ? s.total / exames.length : 0,
        questoes: await getPublicQuestionsForSubject(s.id),
      })),
    )
  ).sort((a, b) => b.media - a.media)

  const subjects = materias
  const totalNoAcervo = materias.reduce((soma, s) => soma + s.total, 0)

  // A página de questão avulsa já publicava Quiz + BreadcrumbList, mas os hubs —
  // que são justamente as páginas capazes de ranquear em "questões de X da OAB" —
  // não tinham dado estruturado nenhum.
  const jsonLd = [
    collectionPage({
      name: "Questões da OAB por matéria",
      description:
        "Questões da 1ª fase da OAB no padrão FGV, organizadas por matéria e com gabarito.",
      path: "/questoes",
    }),
    breadcrumb([{ name: "Questões da OAB", path: "/questoes" }]),
    itemList(
      "Matérias da 1ª fase da OAB",
      subjects.map((s) => ({ name: s.name, path: `/questoes/${s.slug}` })),
    ),
  ]

  return (
    <SeoShell>
      <JsonLd data={jsonLd} />

      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Questões da OAB por matéria
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
        Resolva questões da 1ª fase da OAB no padrão FGV, separadas por matéria e com gabarito.
        Escolha uma disciplina abaixo para começar — a resolução comentada e o plano de estudos
        personalizado ficam no AprovaOAB.
      </p>

      <section className="mt-10 max-w-2xl">
        <h2 className="text-xl font-semibold text-foreground">Como é a 1ª fase da OAB</h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          São <strong className="font-semibold text-foreground">80 questões objetivas</strong> em
          cinco horas, e passa quem acerta{" "}
          <strong className="font-semibold text-foreground">40</strong> — metade da prova. Não
          existe nota mínima por matéria: zerar uma disciplina de pouco peso custa menos que errar
          um terço de Ética. Por isso a lista abaixo está ordenada pelo que cada matéria vale na
          prova, e não em ordem alfabética.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          A média ao lado de cada matéria foi <strong className="font-semibold text-foreground">contada</strong>{" "}
          nas{" "}
          <Link href="/provas" className="text-primary underline-offset-4 hover:underline">
            {exames.length} provas do acervo
          </Link>{" "}
          ({totalNoAcervo.toLocaleString("pt-BR")} questões), não estimada — a FGV não publica peso
          por disciplina. As datas do próximo exame ficam nos{" "}
          <Link href="/editais" className="text-primary underline-offset-4 hover:underline">
            editais
          </Link>
          .
        </p>
      </section>

      <div className="mt-12 space-y-10">
        {subjects.map((s) => (
          <section key={s.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border pb-2">
              <h2 className="text-xl font-semibold text-foreground">
                <Link
                  href={`/questoes/${s.slug}`}
                  className="transition-colors hover:text-primary"
                >
                  {s.name}
                </Link>
              </h2>
              <span className="font-mono text-xs text-muted-foreground">
                média de {s.media.toFixed(1).replace(".", ",")} por prova · {s.total} no acervo
              </span>
            </div>
            {/* Os 200 links que faltavam. Este hub linkava as 20 matérias e NENHUMA
                questão, então toda página de questão dependia de um único link de
                entrada vindo da página de matéria — profundidade 3 a partir da home.
                Com estes links elas passam a 2. A âncora é o título do destino, o
                mesmo helper que dá o H1 de lá. */}
            <ul className="mt-3 space-y-1.5">
              {s.questoes.map((q) => (
                <li key={q.id}>
                  <Link
                    href={`/questoes/${s.slug}/${slugDaQuestao(q)}`}
                    className="text-sm leading-relaxed text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {tituloDaQuestao(q, s.name)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
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
