// Acesso a dados (server-only) das páginas públicas de prova (/provas).
//
// A edição do exame NÃO tem coluna própria: vive dentro da string `questions.banca`,
// no formato "Exame de Ordem Unificado - XLV (FGV)". O parse numérico fica em
// `edicaoDaBanca` (lib/exames.ts), que já é a fonte única desse formato — aqui só
// agrupamos. Verificado no banco (ago/2026): as 2.152 questões parseiam 100%, em
// 27 edições, cada uma com exatamente UMA string de banca distinta.
//
// Como em lib/seo/questions.ts, `explicacao` NUNCA é selecionada. A página de prova
// mostra enunciado + alternativas + gabarito; a resolução comentada continua sendo
// o que fica atrás do cadastro.
import { supabaseAdmin } from "@/lib/supabase-admin"
import { fetchAllRows, fetchByIds } from "@/lib/supabase-paginate"
import { edicaoDaBanca } from "@/lib/exames"
import { subjectSlug } from "@/lib/slug"
import {
  getAllPublicQuestions,
  QUESTION_FIELDS,
  type PublicQuestion,
} from "@/lib/seo/questions"

export type ExameResumo = {
  numero: number
  /** "XLV" — a forma como a FGV nomeia o exame; a URL usa o arábico. */
  romano: string
  ano: number
  slug: string
  /** Contagem REAL de questões no banco. Nem todo exame tem 80 (ver comentário abaixo). */
  totalQuestoes: number
  totalMaterias: number
}

export type QuestaoDaProva = PublicQuestion & {
  subjectName: string
  subjectSlug: string
  topicName: string | null
  /** Está no subconjunto curado (PUBLIC_QUESTIONS_PER_SUBJECT) → tem página própria. */
  temPagina: boolean
}

export type GrupoMateria = {
  subjectName: string
  subjectSlug: string
  questoes: QuestaoDaProva[]
}

export type ExameDetalhe = ExameResumo & { grupos: GrupoMateria[] }

/** 45 -> "45-exame-oab". Mesma convenção de `lib/editais.ts` (slug "47-exame-oab"). */
export function exameSlug(numero: number): string {
  return `${numero}-exame-oab`
}

/** "45-exame-oab" -> 45. Null pra qualquer outra coisa (o segmento cai em notFound). */
export function parseExameSlug(slug: string): number | null {
  const m = slug.match(/^(\d{1,3})-exame-oab$/)
  if (!m) return null
  const n = Number(m[1])
  return Number.isInteger(n) && n > 0 ? n : null
}

// Memo de processo com TTL curto. O build prerenderiza 28 páginas de prova, e cada
// uma precisa do mesmo índice de edições e do mesmo conjunto de questões públicas —
// sem isto seria a mesma varredura ~30 vezes. O TTL existe para que um lambda quente
// não sirva índice velho entre revalidações do ISR (que é de 24h de qualquer jeito).
function memo<T>(fn: () => Promise<T>, ttlMs = 60_000): () => Promise<T> {
  let cache: { at: number; valor: Promise<T> } | null = null
  return () => {
    const agora = Date.now()
    if (!cache || agora - cache.at > ttlMs) {
      const valor = fn()
      cache = { at: agora, valor }
      // Falha não pode ficar grudada no cache até o TTL vencer.
      valor.catch(() => {
        if (cache?.valor === valor) cache = null
      })
    }
    return cache.valor
  }
}

// Romano tal como aparece na banca. O número canônico vem de `edicaoDaBanca` —
// este regex só recupera a grafia para exibição ("também chamado de XLV Exame").
function romanoDaBanca(banca: string): string {
  return banca.match(/-\s*([IVXLC]+)\s*\(/i)?.[1].toUpperCase() ?? ""
}

type LinhaIndice = { banca: string | null; ano: number | null; subject_id: string }

// Índice das edições: uma varredura leve (só banca/ano/subject_id) sobre a tabela
// inteira. Não dá pra derivar do subconjunto público — ele tem 10 questões por
// matéria e perderia quase toda edição.
const carregarIndice = memo(async (): Promise<ExameResumo[]> => {
  const linhas = await fetchAllRows<LinhaIndice>(() =>
    supabaseAdmin.from("questions").select("banca, ano, subject_id"),
  )

  const porEdicao = new Map<
    number,
    { romano: string; anos: Map<number, number>; materias: Set<string>; total: number }
  >()

  for (const l of linhas) {
    const numero = edicaoDaBanca(l.banca)
    if (numero === null) continue
    let e = porEdicao.get(numero)
    if (!e) {
      e = { romano: romanoDaBanca(l.banca ?? ""), anos: new Map(), materias: new Set(), total: 0 }
      porEdicao.set(numero, e)
    }
    e.total++
    e.materias.add(l.subject_id)
    if (l.ano !== null) e.anos.set(l.ano, (e.anos.get(l.ano) ?? 0) + 1)
  }

  return [...porEdicao.entries()]
    .map(([numero, e]) => ({
      numero,
      romano: e.romano,
      // Um exame acontece num ano só; o modo protege contra uma linha com ano errado
      // virar o ano da página inteira.
      ano: [...e.anos.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 0,
      slug: exameSlug(numero),
      totalQuestoes: e.total,
      totalMaterias: e.materias.size,
    }))
    .filter((e) => e.totalQuestoes > 0 && e.ano > 0)
    .sort((a, b) => b.numero - a.numero)
})

/** As edições disponíveis, da mais recente para a mais antiga. */
export async function listarExames(): Promise<ExameResumo[]> {
  return carregarIndice()
}

// Ids do subconjunto curado — é o que decide quais questões da prova ganham link
// para página própria. Memoizado porque `getAllPublicQuestions` faz uma consulta
// por matéria.
const carregarIdsPublicos = memo(async (): Promise<Set<string>> => {
  const publicas = await getAllPublicQuestions()
  return new Set(publicas.map((q) => q.id))
})

/**
 * Uma edição inteira, agrupada por matéria.
 *
 * ATENÇÃO ao renderizar: o banco NÃO guarda a posição da questão na prova, então
 * esta ordem é por matéria + id, não a ordem original. A página não pode rotular
 * "Questão 1" — seria afirmação que o dado não sustenta.
 */
export async function getExame(numero: number): Promise<ExameDetalhe | null> {
  const resumo = (await carregarIndice()).find((e) => e.numero === numero)
  if (!resumo) return null

  // Cada edição tem exatamente uma string de banca (verificado), então dá pra
  // filtrar no servidor em vez de varrer a tabela toda de novo.
  const { data } = await supabaseAdmin
    .from("questions")
    .select(QUESTION_FIELDS)
    .ilike("banca", `%- ${resumo.romano} (%`)
    .limit(1000)

  const linhas = ((data ?? []) as PublicQuestion[]).filter(
    (q) => edicaoDaBanca(q.banca) === numero,
  )
  if (linhas.length === 0) return null

  const [subjects, topics, idsPublicos] = await Promise.all([
    supabaseAdmin.from("subjects").select("id, name"),
    fetchByIds<{ id: string; name: string }>(
      (ids) => supabaseAdmin.from("topics").select("id, name").in("id", ids),
      [...new Set(linhas.map((q) => q.topic_id).filter((t): t is string => !!t))],
    ),
    carregarIdsPublicos(),
  ])

  const nomeMateria = new Map(
    ((subjects.data ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name]),
  )
  const nomeTopico = new Map(topics.map((t) => [t.id, t.name]))

  const grupos = new Map<string, GrupoMateria>()
  for (const q of linhas.slice().sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))) {
    const subjectName = nomeMateria.get(q.subject_id) ?? "Direito"
    const slug = subjectSlug(subjectName)
    let g = grupos.get(slug)
    if (!g) {
      g = { subjectName, subjectSlug: slug, questoes: [] }
      grupos.set(slug, g)
    }
    g.questoes.push({
      ...q,
      subjectName,
      subjectSlug: slug,
      topicName: q.topic_id ? (nomeTopico.get(q.topic_id) ?? null) : null,
      temPagina: idsPublicos.has(q.id),
    })
  }

  return {
    ...resumo,
    // A contagem do índice vem da varredura completa; a da página, deste filtro.
    // Se divergirem, a página manda — é o que ela realmente mostra.
    totalQuestoes: linhas.length,
    totalMaterias: grupos.size,
    grupos: [...grupos.values()].sort((a, b) =>
      a.subjectName.localeCompare(b.subjectName, "pt-BR"),
    ),
  }
}
