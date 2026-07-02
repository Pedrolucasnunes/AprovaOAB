import Link from "next/link"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { ArrowLeft, ExternalLink, FileText } from "lucide-react"
import { SeoShell } from "@/components/seo/seo-shell"
import { SeoCtaButton } from "@/components/seo/seo-cta"
import { JsonLd } from "@/components/seo/json-ld"
import { getEditais, getEditalBySlug } from "@/lib/editais"
import { OG_BASE } from "@/lib/seo/og"
import { APP_URL } from "@/lib/app-url"
import { cn } from "@/lib/utils"

export const revalidate = 86400

export function generateStaticParams() {
  return getEditais().map((e) => ({ slug: e.slug }))
}

function formatBr(iso: string): string {
  const [y, m, d] = iso.split("-")
  return `${d}/${m}/${y}`
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const edital = getEditalBySlug(slug)
  if (!edital) return {}

  const title = `Edital do ${edital.ordinal} Exame OAB — datas, inscrição e cronograma | AprovaOAB`
  const description =
    `Cronograma do ${edital.ordinal} Exame de Ordem (OAB): 1ª fase em ` +
    `${formatBr(edital.dataPrimeiraFase)}, 2ª fase em ${formatBr(edital.dataSegundaFase)}, ` +
    `inscrição, taxa de ${edital.taxaInscricao} e todas as datas oficiais da FGV.`
  const canonical = `/editais/${edital.slug}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { ...OG_BASE, title, description, url: canonical },
  }
}

export default async function EditalPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const edital = getEditalBySlug(slug)
  if (!edital) notFound()

  // Contagem regressiva pra 1ª fase (fuso BRT). Como a página é ISR (revalida
  // a cada 24h), o número se atualiza sozinho a cada dia. Só exibe se futuro.
  const diasParaProva = Math.ceil(
    (new Date(`${edital.dataPrimeiraFase}T00:00:00-03:00`).getTime() - Date.now()) / 86_400_000,
  )

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Editais", item: `${APP_URL}/editais` },
      {
        "@type": "ListItem",
        position: 2,
        name: `${edital.ordinal} Exame de Ordem`,
        item: `${APP_URL}/editais/${edital.slug}`,
      },
    ],
  }

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: edital.faq.map((f) => ({
      "@type": "Question",
      name: f.pergunta,
      acceptedAnswer: { "@type": "Answer", text: f.resposta },
    })),
  }

  const eventLd = {
    "@context": "https://schema.org",
    "@type": "EducationEvent",
    name: `1ª fase do ${edital.ordinal} Exame de Ordem (OAB)`,
    description: `Prova objetiva (1ª fase) do ${edital.ordinal} Exame de Ordem Unificado, aplicada pela FGV.`,
    startDate: edital.dataPrimeiraFase,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    organizer: { "@type": "Organization", name: "FGV", url: "https://oab.fgv.br/" },
    location: {
      "@type": "Place",
      name: "Locais de prova da FGV (todo o Brasil)",
      address: { "@type": "PostalAddress", addressCountry: "BR" },
    },
  }

  return (
    <SeoShell>
      <JsonLd data={breadcrumbLd} />
      <JsonLd data={faqLd} />
      <JsonLd data={eventLd} />

      {/* Breadcrumb */}
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/editais" className="inline-flex items-center gap-1 hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Editais
        </Link>
        <span>/</span>
        <span className="text-foreground">{edital.ordinal} Exame</span>
      </nav>

      <h1 className="text-2xl font-bold leading-snug tracking-tight text-foreground sm:text-3xl">
        Edital do {edital.ordinal} Exame de Ordem (OAB): datas e cronograma
      </h1>
      <p className="mt-2 font-mono text-xs text-muted-foreground">
        Atualizado em {formatBr(edital.atualizadoEm)} · fonte oficial: FGV
      </p>

      {!edital.publicado && (
        <p className="mt-5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          As datas abaixo são <strong>previsões</strong> baseadas no calendário da OAB. O edital
          oficial deste exame ainda não foi publicado — confirme sempre na fonte da FGV.
        </p>
      )}

      <p className="mt-5 text-base leading-relaxed text-foreground">{edital.resumo}</p>

      {diasParaProva > 0 && (
        <p className="mt-5 rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-foreground">
          ⏳ Faltam <strong className="font-semibold text-primary">{diasParaProva} dias</strong> para
          a 1ª fase do {edital.ordinal} Exame.
        </p>
      )}

      {/* Edital oficial — destaque no topo (fonte autoritativa, E-E-A-T) */}
      <a
        href={edital.fonteOficialUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-colors hover:border-primary/40 hover:bg-muted/40"
      >
        <FileText className="h-5 w-5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">
            Edital oficial do {edital.ordinal} Exame (FGV)
          </span>
          <span className="block text-xs text-muted-foreground">
            Documento completo no site da FGV — inscrição, regras e conteúdo programático.
          </span>
        </span>
        <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
      </a>

      {/* Cronograma — o miolo de SEO */}
      <h2 className="mt-10 text-lg font-semibold text-foreground">Cronograma completo</h2>
      <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border">
        {edital.cronograma.map((etapa) => (
          <li
            key={etapa.label}
            className={cn(
              "flex items-center justify-between gap-4 px-4 py-3 text-sm",
              etapa.destaque && "bg-primary/10",
            )}
          >
            <span className={cn("text-muted-foreground", etapa.destaque && "font-semibold text-foreground")}>
              {etapa.label}
            </span>
            <span
              className={cn(
                "whitespace-nowrap font-mono text-xs",
                etapa.destaque ? "font-semibold text-primary" : "text-muted-foreground",
              )}
            >
              {etapa.data}
            </span>
          </li>
        ))}
      </ul>

      {/* Taxa */}
      <h2 className="mt-10 text-lg font-semibold text-foreground">Taxa de inscrição</h2>
      <p className="mt-2 text-base leading-relaxed text-muted-foreground">
        O valor da taxa de inscrição do {edital.ordinal} Exame é de{" "}
        <strong className="font-semibold text-foreground">{edital.taxaInscricao}</strong>, com prazo
        de pagamento conforme o cronograma acima. Candidatos que atendem aos requisitos podem
        solicitar isenção dentro do período de inscrição.
      </p>

      {/* Checklist */}
      <h2 className="mt-10 text-lg font-semibold text-foreground">Passo a passo da inscrição</h2>
      <ol className="mt-4 space-y-2">
        {edital.checklist.map((passo, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-mono text-[11px] text-primary">
              {i + 1}
            </span>
            <span>{passo}</span>
          </li>
        ))}
      </ol>

      {/* O que cai — linkagem interna pro banco de questões + CTA */}
      <div className="mt-10 rounded-2xl border border-border bg-muted/20 p-6">
        <h2 className="text-lg font-semibold text-foreground">O que cai na 1ª fase</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          A 1ª fase tem 80 questões de múltipla escolha, distribuídas por 17 disciplinas — de Ética
          e Direito Constitucional a Civil, Penal e Trabalho. No AprovaOAB, um diagnóstico gratuito
          mapeia suas lacunas em 10 minutos e monta um plano de estudos pelos seus erros. Você pode{" "}
          <Link href="/questoes" className="font-medium text-primary hover:underline">
            treinar questões da OAB por matéria
          </Link>{" "}
          de graça agora mesmo.
        </p>
        <div className="mt-5">
          <SeoCtaButton location="edital_o_que_cai" />
        </div>
      </div>

      {/* FAQ (+ FAQPage schema acima) */}
      <h2 className="mt-10 text-lg font-semibold text-foreground">Perguntas frequentes</h2>
      <div className="mt-4 space-y-4">
        {edital.faq.map((f) => (
          <div key={f.pergunta} className="rounded-lg border border-border bg-card px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{f.pergunta}</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.resposta}</p>
          </div>
        ))}
      </div>

      {/* Fonte oficial */}
      <a
        href={edital.fonteOficialUrl}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="mt-8 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        Ver o edital oficial no site da FGV
        <ExternalLink className="h-4 w-4" />
      </a>

      {/* Disclaimer */}
      <p className="mt-8 rounded-lg border border-border bg-muted/10 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
        O AprovaOAB é uma plataforma independente de estudos, sem vínculo com a OAB ou com a FGV.
        As datas aqui reunidas têm caráter informativo — em caso de dúvida, sempre confirme no edital
        oficial publicado pela FGV.
      </p>

      {/* CTA de rodapé */}
      <div className="mt-12 rounded-2xl border border-border bg-muted/20 p-6 text-center">
        <p className="text-lg font-semibold text-foreground">Sabendo as datas, comece a estudar hoje</p>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          Diagnóstico gratuito, plano de estudos personalizado e simulados no padrão FGV.
        </p>
        <SeoCtaButton location="edital_rodape" />
      </div>
    </SeoShell>
  )
}
