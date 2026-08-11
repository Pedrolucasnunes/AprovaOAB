import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-card"

export const alt = "Provas da OAB — questões e gabarito de todos os exames | AprovaOAB"
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return ogImage({
    eyebrow: "OAB 1ª fase · padrão FGV",
    title: "Provas anteriores da OAB",
    footer: "Enunciado, alternativas e gabarito · aprovaoab.app.br",
  })
}
