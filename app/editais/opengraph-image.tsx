import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-card"

export const alt = "Editais da OAB — datas e cronograma dos Exames de Ordem"
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return ogImage({
    eyebrow: "OAB · calendário oficial",
    title: "Editais da OAB",
    footer: "Datas da 1ª e da 2ª fase, inscrição e taxa · aprovaoab.app.br",
  })
}
