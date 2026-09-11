import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-card"
import { getEditalBySlug } from "@/lib/editais"

export const alt = "Edital do Exame de Ordem — datas e cronograma · AprovaOAB"
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

// Sem `dynamicParams = false` aqui de propósito: quem resolve slug inexistente é
// a página, com 404. Esta rota só desenha a imagem e, sem edital, cai no texto
// genérico em vez de quebrar o card.
export const revalidate = 86400

function diaEMes(iso: string): string {
  const [, m, d] = iso.split("-")
  return `${d}/${m}`
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const edital = getEditalBySlug(slug)

  return ogImage({
    eyebrow: edital ? `${edital.ano} · Exame de Ordem` : "OAB · calendário oficial",
    title: edital ? `Edital do ${edital.ordinal} Exame` : "Editais da OAB",
    // A taxa é nula até a FGV anunciar (ver lib/editais.ts), então o rodapé
    // troca de frase em vez de imprimir "taxa de null" no card.
    footer: edital
      ? `1ª fase ${diaEMes(edital.dataPrimeiraFase)} · 2ª fase ${diaEMes(edital.dataSegundaFase)} · aprovaoab.app.br`
      : "Datas da 1ª e da 2ª fase, inscrição e taxa · aprovaoab.app.br",
  })
}
