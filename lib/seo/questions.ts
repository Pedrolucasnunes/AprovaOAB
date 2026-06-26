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
  topic_id: string | null
}

export type PublicSubject = {
  id: string
  name: string
  slug: string
  count: number // limitado a PUBLIC_QUESTIONS_PER_SUBJECT
}

const QUESTION_FIELDS =
  "id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, resposta_correta, banca, ano, dificuldade, subject_id, topic_id"

// Prioridade por incidência na prova (campo livre `incidencia_prova`): alta cai mais
// → mais demanda de busca → entra primeiro. Desconhecido fica no meio.
function incidenciaRank(v: string | null | undefined): number {
  const s = (v ?? "").toLowerCase()
  if (/alt/.test(s)) return 0
  if (/m[eé]d/.test(s)) return 1
  if (/baix/.test(s)) return 2
  return 1
}

function compareById(a: { id: string }, b: { id: string }): number {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
}

// Escolhe as N "melhores" questões públicas de uma matéria de forma DETERMINÍSTICA
// (estável entre builds → sitemap/ISR estáveis). Critério:
//   1) ordem base: maior incidência na prova, desempate por id;
//   2) diversidade de tópico: pega 1 por topic_id distinto (evita 10 páginas do mesmo
//      tema canibalizando entre si). Questões sem tópico contam como um único balde;
//   3) completa as vagas restantes seguindo a ordem base;
//   4) retorna ordenado por id (estabilidade).
function selectBest<T extends { id: string; topic_id: string | null; incidencia_prova?: string | null }>(
  rows: T[],
  n: number,
): T[] {
  const base = rows
    .slice()
    .sort((a, b) => incidenciaRank(a.incidencia_prova) - incidenciaRank(b.incidencia_prova) || compareById(a, b))

  const picked: T[] = []
  const seenTopics = new Set<string>()
  for (const q of base) {
    if (picked.length >= n) break
    const key = q.topic_id ?? "__none"
    if (!seenTopics.has(key)) {
      seenTopics.add(key)
      picked.push(q)
    }
  }
  if (picked.length < n) {
    const pickedIds = new Set(picked.map((q) => q.id))
    for (const q of base) {
      if (picked.length >= n) break
      if (!pickedIds.has(q.id)) picked.push(q)
    }
  }
  return picked.sort(compareById).slice(0, n)
}

// Matérias que têm ao menos 1 questão, com slug e contagem (capada no teto público).
export async function getPublicSubjects(): Promise<PublicSubject[]> {
  const { data: subjects } = await supabaseAdmin
    .from("subjects")
    .select("id, name")
    .order("name")

  // Conta por matéria com `count: "exact", head: true` (não traz linhas).
  // NÃO usar um select("subject_id") global: o PostgREST capa a resposta em 1000
  // linhas por padrão, então matérias cujas questões ficam além da linha 1000
  // sumiriam do site (count 0 → filtradas). Uma contagem por matéria é imune a isso.
  const result = await Promise.all(
    (subjects ?? []).map(async (s) => {
      const subj = s as { id: string; name: string }
      const { count } = await supabaseAdmin
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("subject_id", subj.id)
      const raw = count ?? 0
      return {
        id: subj.id,
        name: subj.name,
        slug: subjectSlug(subj.name),
        count: Math.min(raw, PUBLIC_QUESTIONS_PER_SUBJECT),
      }
    })
  )

  return result.filter((s) => s.count > 0)
}

// As N questões públicas de uma matéria — seleção curada e determinística (estável
// entre builds). Em vez das N primeiras por id (ordem de UUID = aleatória), escolhe
// por incidência na prova + diversidade de tópico (ver `selectBest`). `incidencia_prova`
// só é usado aqui para a seleção — não vai para o tipo público.
export async function getPublicQuestionsForSubject(subjectId: string): Promise<PublicQuestion[]> {
  const { data } = await supabaseAdmin
    .from("questions")
    .select(`${QUESTION_FIELDS}, incidencia_prova`)
    .eq("subject_id", subjectId)
    .order("id", { ascending: true })
    .limit(1000)

  const rows = (data ?? []) as (PublicQuestion & { incidencia_prova: string | null })[]
  return selectBest(rows, PUBLIC_QUESTIONS_PER_SUBJECT).map(({ incidencia_prova: _omit, ...q }) => q)
}

export type PublicQuestionDetail = PublicQuestion & {
  subjectName: string
  subjectSlug: string
  topicName: string | null
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

  let topicName: string | null = null
  if (q.topic_id) {
    const { data: topic } = await supabaseAdmin
      .from("topics")
      .select("name")
      .eq("id", q.topic_id)
      .maybeSingle()
    topicName = (topic as { name: string } | null)?.name ?? null
  }

  const name = (subj as { name: string } | null)?.name ?? "Direito"
  return { ...q, subjectName: name, subjectSlug: subjectSlug(name), topicName }
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
