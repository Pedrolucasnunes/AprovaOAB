import Link from "next/link"
import type { Metadata } from "next"
import { CalendarDays } from "lucide-react"
import { SeoShell } from "@/components/seo/seo-shell"
import { SeoCtaButton } from "@/components/seo/seo-cta"
import { getEditais } from "@/lib/editais"
import { OG_BASE } from "@/lib/seo/og"

export const revalidate = 86400

export const metadata: Metadata = {
  title: "Editais da OAB — datas e cronograma dos Exames de Ordem | AprovaOAB",
  description:
    "Consulte o edital de cada Exame de Ordem: datas da 1ª e 2ª fase, inscrição, taxa e cronograma completo, conferidos na fonte oficial da FGV.",
  alternates: { canonical: "/editais" },
  openGraph: {
    ...OG_BASE,
    title: "Editais da OAB — datas e cronograma dos Exames de Ordem",
    description:
      "Datas da 1ª e 2ª fase, inscrição, taxa e cronograma completo de cada Exame de Ordem.",
    url: "/editais",
  },
}

export default function EditaisHubPage() {
  const editais = getEditais()

  return (
    <SeoShell>
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        Editais da OAB
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
        Escolha o Exame de Ordem para ver o cronograma completo — datas da 1ª e 2ª fase, período de
        inscrição, taxa e resultados. As informações são conferidas na fonte oficial da FGV. O plano
        de estudos personalizado e os simulados no padrão FGV ficam no AprovaOAB.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {editais.map((e) => (
          <Link
            key={e.slug}
            href={`/editais/${e.slug}`}
            className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4 transition-colors hover:border-primary/40 hover:bg-muted/40"
          >
            <span className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-primary" />
              <span className="font-medium text-foreground">
                {e.ordinal} Exame de Ordem
              </span>
            </span>
            <span className="font-mono text-xs text-muted-foreground">{e.ano}</span>
          </Link>
        ))}
      </div>

      <div className="mt-12 rounded-2xl border border-border bg-muted/20 p-6 text-center">
        <p className="text-lg font-semibold text-foreground">
          Já sabe as datas? Falta o plano de estudos.
        </p>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">
          Diagnóstico gratuito, plano de estudos personalizado e simulados no padrão FGV.
        </p>
        <SeoCtaButton location="editais_hub" />
      </div>
    </SeoShell>
  )
}
