import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-card"
import { getPublicQuestionById } from "@/lib/seo/questions"
import { parseQuestionId } from "@/lib/slug"

export const revalidate = 86400
export const alt = "Questão da OAB no padrão FGV — AprovaOAB"
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image({
  params,
}: {
  params: Promise<{ materia: string; slug: string }>
}) {
  const { slug } = await params
  const id = parseQuestionId(slug)
  const q = id ? await getPublicQuestionById(id) : null
  const nome = q?.subjectName ?? "Direito"
  const ctx = [q?.banca, q?.ano].filter(Boolean).join(" ")

  return ogImage({
    eyebrow: `OAB 1ª fase${ctx ? ` · ${ctx}` : ""}`,
    title: `Questão de ${nome}`,
    footer: "Resolva e veja o gabarito · aprovaoab.app.br",
  })
}
