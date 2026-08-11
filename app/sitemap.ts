import type { MetadataRoute } from "next"
import { getPublicSubjects, getAllPublicQuestions } from "@/lib/seo/questions"
import { listarExames } from "@/lib/seo/provas"
import { getEditais } from "@/lib/editais"
import { questionSlug } from "@/lib/slug"
import { APP_URL } from "@/lib/app-url"

const BASE = APP_URL

export const revalidate = 86400

// `lastModified` só é emitido onde existe data REAL de revisão — hoje, os editais
// (campo `atualizadoEm`, mantido à mão a cada revisão do cronograma). As demais
// entradas ficam sem o campo de propósito: preencher com a data do build diria
// "tudo mudou hoje" a cada deploy, e o Google só usa o sinal enquanto ele é
// confiável. Ausente vale mais que inventado.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [subjects, questions, exames] = await Promise.all([
    getPublicSubjects(),
    getAllPublicQuestions(),
    listarExames(),
  ])

  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/questoes`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/provas`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/editais`, changeFrequency: "weekly", priority: 0.7 },
    ...getEditais().map((e) => ({
      url: `${BASE}/editais/${e.slug}`,
      lastModified: new Date(e.atualizadoEm),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...subjects.map((s) => ({
      url: `${BASE}/questoes/${s.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    // Provas anteriores acima das questões avulsas: é a página que responde a uma
    // busca inteira ("gabarito do 45º exame"), não um fragmento dela.
    ...exames.map((e) => ({
      url: `${BASE}/provas/${e.slug}`,
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
    ...questions.map((q) => ({
      url: `${BASE}/questoes/${q.subjectSlug}/${questionSlug(q)}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ]
}
