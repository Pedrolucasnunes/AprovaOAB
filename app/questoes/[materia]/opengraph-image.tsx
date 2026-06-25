import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-card"
import { getPublicSubjects } from "@/lib/seo/questions"

export const revalidate = 86400
export const alt = "Questões da OAB por matéria — AprovaOAB"
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default async function Image({
  params,
}: {
  params: Promise<{ materia: string }>
}) {
  const { materia } = await params
  const subject = (await getPublicSubjects()).find((s) => s.slug === materia)
  const nome = subject?.name ?? "Direito"

  return ogImage({
    eyebrow: "OAB 1ª fase · padrão FGV",
    title: `Questões de ${nome}`,
    footer: "Pratique de graça · aprovaoab.app.br",
  })
}
