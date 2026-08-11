import Link from "next/link"
import type { Metadata } from "next"
import { SeoShell } from "@/components/seo/seo-shell"
import { SeoCtaButton } from "@/components/seo/seo-cta"
import { JsonLd } from "@/components/seo/json-ld"
import { listarExames } from "@/lib/seo/provas"
import { breadcrumb, collectionPage, itemList } from "@/lib/seo/jsonld"
import { OG_BASE } from "@/lib/seo/og"

export const revalidate = 86400

// O intervalo de edições sai do banco, nunca escrito à mão: a cada importação de
// prova nova o texto se corrige sozinho. Título hardcoded aqui apodreceria no
// primeiro exame novo — mesmo motivo do número calculado em lib/exames.ts.
export async function generateMetadata(): Promise<Metadata> {
  const exames = await listarExames()
  const recente = exames[0]
  const antigo = exames[exames.length - 1]
  const faixa =
    recente && antigo ? ` Do ${antigo.numero}º ao ${recente.numero}º Exame.` : ""

  const title = "Provas da OAB — questões e gabarito de todos os exames"
  const description =
    `Todas as provas da 1ª fase do Exame de Ordem disponíveis no AprovaOAB, com enunciado, ` +
    `alternativas e gabarito de cada questão.${faixa} Grátis.`
  return {
    title,
    description,
    alternates: { canonical: "/provas" },
    openGraph: { ...OG_BASE, title, description, url: "/provas" },
  }
}

export default async function ProvasHubPage() {
  const exames = await listarExames()

  const totalQuestoes = exames.reduce((soma, e) => soma + e.totalQuestoes, 0)
  const anos = exames.map((e) => e.ano).filter((a) => a > 0)

  const jsonLd = [
    collectionPage({
      name: "Provas da OAB — questões e gabarito de todos os exames",
      description:
        "Provas da 1ª fase do Exame de Ordem Unificado, com enunciado, alternativas e gabarito de cada questão.",
      path: "/provas",
    }),
    breadcrumb([{ name: "Provas da OAB", path: "/provas" }]),
    itemList(
      "Exames de Ordem disponíveis",
      exames.map((e) => ({ name: `${e.numero}º Exame de Ordem`, path: `/provas/${e.slug}` })),
    ),
  ]

  return (
    <SeoShell>
      <JsonLd data={jsonLd} />

      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Provas da OAB — questões e gabarito
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
        {/* Contagens reais, derivadas do banco. Nenhum número escrito à mão. */}
        {exames.length} exames da 1ª fase do Exame de Ordem Unificado
        {anos.length > 0 && ` (${Math.min(...anos)}–${Math.max(...anos)})`}, num total de{" "}
        {totalQuestoes.toLocaleString("pt-BR")} questões com enunciado, alternativas e gabarito.
        Escolha um exame para ver a prova completa — a resolução comentada e o plano de estudos
        ficam no AprovaOAB.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {exames.map((e) => (
          <Link
            key={e.numero}
            href={`/provas/${e.slug}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <span className="min-w-0">
              <span className="block font-medium text-foreground">
                {e.numero}º Exame de Ordem
              </span>
              <span className="mt-0.5 block font-mono text-xs text-muted-foreground">
                {e.ano} · {e.romano}
              </span>
            </span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">
              {e.totalQuestoes} questões
            </span>
          </Link>
        ))}
      </div>

      <section className="mt-12 max-w-2xl">
        <h2 className="text-xl font-semibold text-foreground">
          Como usar as provas anteriores da OAB
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          A 1ª fase do Exame de Ordem tem 80 questões objetivas e exige 50% de acerto — 40 questões
          — para aprovação. Resolver provas anteriores é o jeito mais direto de descobrir o que
          ainda não entrou: a FGV repete estruturas de enunciado e concentra a cobrança em poucos
          temas por matéria.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          O que costuma faltar não é resolver mais questões, e sim saber{" "}
          <em>quais</em> errar de novo custa aprovação. É isso que o diagnóstico do AprovaOAB mede
          nas matérias mais pesadas da prova, antes de você montar o plano de estudos.
        </p>
      </section>

      <div className="mt-12 rounded-2xl border border-border bg-muted/20 p-6 text-center">
        <p className="text-lg font-semibold text-foreground">
          Descubra suas lacunas em 10 minutos
        </p>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          Diagnóstico gratuito, plano de estudos personalizado e simulados no padrão FGV.
        </p>
        <SeoCtaButton location="provas_hub" />
      </div>
    </SeoShell>
  )
}
