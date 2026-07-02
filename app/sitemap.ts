import type { MetadataRoute } from "next"
import { getPublicSubjects, getAllPublicQuestions } from "@/lib/seo/questions"
import { getEditais } from "@/lib/editais"
import { questionSlug } from "@/lib/slug"
import { APP_URL } from "@/lib/app-url"

const BASE = APP_URL

export const revalidate = 86400

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [subjects, questions] = await Promise.all([
    getPublicSubjects(),
    getAllPublicQuestions(),
  ])

  return [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/questoes`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/editais`, changeFrequency: "weekly", priority: 0.7 },
    ...getEditais().map((e) => ({
      url: `${BASE}/editais/${e.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
    ...subjects.map((s) => ({
      url: `${BASE}/questoes/${s.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...questions.map((q) => ({
      url: `${BASE}/questoes/${q.subjectSlug}/${questionSlug(q)}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ]
}
