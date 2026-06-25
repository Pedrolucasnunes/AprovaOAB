import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-card"

export const alt = "Questões da OAB por matéria, grátis e comentadas — AprovaOAB"
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return ogImage({
    eyebrow: "OAB · 1ª fase",
    title: "Questões da OAB por matéria",
    footer: "Grátis e comentadas · aprovaoab.app.br",
  })
}
