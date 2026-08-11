import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-card"
import { getExame, parseExameSlug } from "@/lib/seo/provas"

export const revalidate = 86400
export const alt = "Prova e gabarito do Exame de Ordem — AprovaOAB"
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image({
  params,
}: {
  params: Promise<{ exame: string }>
}) {
  const { exame } = await params
  const numero = parseExameSlug(exame)
  const dados = numero === null ? null : await getExame(numero)

  return ogImage({
    eyebrow: dados ? `${dados.ano} · ${dados.romano} Exame` : "OAB 1ª fase · padrão FGV",
    title: dados ? `${dados.numero}º Exame da OAB` : "Provas da OAB",
    footer: dados
      ? `${dados.totalQuestoes} questões com gabarito · aprovaoab.app.br`
      : "Enunciado, alternativas e gabarito · aprovaoab.app.br",
  })
}
