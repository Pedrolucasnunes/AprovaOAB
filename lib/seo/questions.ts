// Acesso a dados (server-only) para as páginas públicas de SEO.
// Usa supabaseAdmin: roda exclusivamente no servidor (SSG/ISR), a service role key
// nunca vai pro cliente. O campo `explicacao` NUNCA é selecionado aqui — fica gated.
import { supabaseAdmin } from "@/lib/supabase-admin"
import { subjectSlug } from "@/lib/slug"

// Quantas questões de cada matéria viram página pública. Suba este número para
// expor mais conteúdo ao SEO (e canibalizar mais o produto pago).
export const PUBLIC_QUESTIONS_PER_SUBJECT = 10

export type PublicQuestion = {
  id: string
  enunciado: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  resposta_correta: "A" | "B" | "C" | "D"
  banca: string | null
  ano: number | null
  dificuldade: string | null
  subject_id: string
}

export type PublicSubject = {
  id: string
  name: string
  slug: string
  count: number // limitado a PUBLIC_QUESTIONS_PER_SUBJECT
}

const QUESTION_FIELDS =
  "id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, resposta_correta, banca, ano, dificuldade, subject_id"

// Matérias que têm ao menos 1 questão, com slug e contagem (capada no teto público).
export async function getPublicSubjects(): Promise<PublicSubject[]> {
  const [{ data: subjects }, { data: counts }] = await Promise.all([
    supabaseAdmin.from("subjects").select("id, name").order("name"),
    supabaseAdmin.from("questions").select("subject_id"),
  ])

  const countMap = new Map<string, number>()
  for (const row of counts ?? []) {
    const sid = (row as { subject_id: string | null }).subject_id
    if (sid) countMap.set(sid, (countMap.get(sid) ?? 0) + 1)
  }

  return (subjects ?? [])
    .map((s) => {
      const subj = s as { id: string; name: string }
      const raw = countMap.get(subj.id) ?? 0
      return {
        id: subj.id,
        name: subj.name,
        slug: subjectSlug(subj.name),
        count: Math.min(raw, PUBLIC_QUESTIONS_PER_SUBJECT),
      }
    })
    .filter((s) => s.count > 0)
}

// As N questões públicas de uma matéria — ordem determinística (estável entre builds).
export async function getPublicQuestionsForSubject(subjectId: string): Promise<PublicQuestion[]> {
  const { data } = await supabaseAdmin
    .from("questions")
    .select(QUESTION_FIELDS)
    .eq("subject_id", subjectId)
    .order("id", { ascending: true })
    .limit(PUBLIC_QUESTIONS_PER_SUBJECT)

  return (data ?? []) as PublicQuestion[]
}

export type PublicQuestionDetail = PublicQuestion & {
  subjectName: string
  subjectSlug: string
}

// Questão única + verificação de que ela pertence ao subconjunto público da matéria.
// Impede enumerar UUIDs para ler o gabarito de questões fora do conjunto exposto.
export async function getPublicQuestionById(id: string): Promise<PublicQuestionDetail | null> {
  const { data } = await supabaseAdmin
    .from("questions")
    .select(QUESTION_FIELDS)
    .eq("id", id)
    .maybeSingle()

  if (!data) return null
  const q = data as PublicQuestion

  const publicOnes = await getPublicQuestionsForSubject(q.subject_id)
  if (!publicOnes.some((p) => p.id === q.id)) return null

  const { data: subj } = await supabaseAdmin
    .from("subjects")
    .select("name")
    .eq("id", q.subject_id)
    .maybeSingle()

  const name = (subj as { name: string } | null)?.name ?? "Direito"
  return { ...q, subjectName: name, subjectSlug: subjectSlug(name) }
}

// Lista achatada de todas as questões públicas — para sitemap e generateStaticParams.
export async function getAllPublicQuestions(): Promise<
  { id: string; enunciado: string; subjectSlug: string }[]
> {
  const subjects = await getPublicSubjects()
  const all: { id: string; enunciado: string; subjectSlug: string }[] = []
  for (const s of subjects) {
    const qs = await getPublicQuestionsForSubject(s.id)
    for (const q of qs) all.push({ id: q.id, enunciado: q.enunciado, subjectSlug: s.slug })
  }
  return all
}
