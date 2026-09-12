// Acesso a dados (server-only) para as páginas públicas de SEO.
// Usa supabaseAdmin: roda exclusivamente no servidor (SSG/ISR), a service role key
// nunca vai pro cliente. O campo `explicacao` NUNCA é selecionado aqui — fica gated.
import { supabaseAdmin } from "@/lib/supabase-admin"
import { questionSlug, subjectSlug } from "@/lib/slug"
import { edicaoDaBanca } from "@/lib/exames"
import { memo } from "@/lib/seo/memo"
import { QUESTOES_PUBLICADAS } from "@/lib/seo/questoes-publicadas"

// Quantas questões de cada matéria viram página pública. Suba este número para
// expor mais conteúdo ao SEO (e canibalizar mais o produto pago).
//
// Baixar este número NÃO despublica nada: o livro-caixa de
// `questoes-publicadas.ts` vem primeiro, e URL no ar não sai do ar. Pra tirar
// uma página do índice é preciso decidir isso explicitamente, e 410/301 é
// caminho diferente de mudar uma constante.
export const PUBLIC_QUESTIONS_PER_SUBJECT = 10

/** Linha crua de `questions` — exatamente o que QUESTION_FIELDS projeta. */
export type LinhaQuestao = {
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

/**
 * Linha + o nome do tópico já resolvido.
 *
 * `topicName` mora aqui porque é o que dá título, H1 e slug à questão — sem ele
 * as páginas caíam no nome da matéria e ficavam idênticas entre si (medido em
 * ago/2026: 138 das 200 páginas tinham H1 repetido).
 */
export type PublicQuestion = LinhaQuestao & { topicName: string | null }

/**
 * Slug canônico de uma questão, a partir da linha do banco. PONTO ÚNICO.
 *
 * `questionSlug` (lib/slug.ts) precisa da edição já em número, e quem tem a regra
 * de extraí-la de `banca` é `edicaoDaBanca` — que vive num módulo com supabaseAdmin
 * e por isso não pode ser importado de lib/slug.ts. Sem este intermediário, cada
 * chamador faria a conversão por conta própria: bastaria um esquecer para o sitemap
 * apontar uma URL que a página redireciona, ou para o link interno cair no 301.
 */
export function slugDaQuestao(q: {
  id: string
  topicName: string | null
  banca: string | null
  enunciado?: string
}): string {
  return questionSlug({
    id: q.id,
    topicName: q.topicName,
    edicao: edicaoDaBanca(q.banca),
    enunciado: q.enunciado,
  })
}

/**
 * Título e H1 de uma questão: tema + edição do exame. PONTO ÚNICO, igual ao slug.
 *
 * Vive ao lado de `slugDaQuestao` de propósito: título, H1 e URL saem do MESMO
 * par (tema, edição), e é isso que faz as três coisas contarem a mesma história.
 * Enquanto isso era função privada da página de detalhe, o ItemList da página de
 * matéria montava o `name` só com o tópico — e como um tópico rende várias
 * questões, 139 dos 200 itens tinham nome repetido dentro da própria lista,
 * exatamente o defeito de H1 duplicado que o título com edição existe pra matar.
 *
 * Antes o título era "Questão de {tópico} — {matéria} OAB {banca} {ano}", com a
 * `banca` inteira ("Exame de Ordem Unificado - XXXVI (FGV)") dentro: ~120
 * caracteres, dos quais o Google mostra ~60.
 */
export function tituloDaQuestao(
  q: { topicName: string | null; banca: string | null; ano: number | null },
  subjectName: string,
): string {
  const edicao = edicaoDaBanca(q.banca)
  const tema = q.topicName ?? subjectName
  if (edicao) {
    return `${tema} — Questão do ${edicao}º Exame OAB${q.ano ? ` ${q.ano}` : ""}`
  }
  return `${tema} — Questão da OAB 1ª fase (${subjectName})`
}

export type PublicSubject = {
  id: string
  name: string
  slug: string
  count: number // limitado a PUBLIC_QUESTIONS_PER_SUBJECT
  /**
   * Quantas questões a matéria tem DE VERDADE no banco, sem o teto público.
   *
   * Existe porque o CTA dizia "Milhares de questões" numa página que mostra 10
   * — e o número real já era calculado aqui e descartado no `Math.min`. Se a
   * gente vai afirmar uma quantidade, que seja a que dá pra provar.
   */
  total: number
}

// Exportado para que lib/seo/provas.ts projete exatamente os mesmos campos —
// uma lista só, e `explicacao` fica fora dela em todas as superfícies públicas.
export const QUESTION_FIELDS =
  "id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, resposta_correta, banca, ano, dificuldade, subject_id, topic_id"

// A tabela inteira de tópicos são ~91 linhas. Buscar uma vez e resolver em memória
// evita uma consulta por questão (era assim em getPublicQuestionById) e uma por
// matéria no build.
export const carregarTopicos = memo(async (): Promise<Map<string, string>> => {
  const { data } = await supabaseAdmin.from("topics").select("id, name")
  return new Map(((data ?? []) as { id: string; name: string }[]).map((t) => [t.id, t.name]))
})

// Prioridade por incidência na prova (campo livre `incidencia_prova`): alta cai mais
// → mais demanda de busca → entra primeiro. Desconhecido fica no meio.
//
// ATENÇÃO: medido em 11/set/2026, `incidencia_prova` está **nula nas 2.232
// questões** — um valor distinto no banco inteiro, e é `null`. Então este
// critério não desempata nada hoje: todos caem no "desconhecido" e a ordem base
// vira `compareById` puro, isto é, ordem de UUID, isto é, aleatória. As 200
// páginas publicadas NÃO são as de maior incidência; são uma amostra arbitrária
// estável. Não escreva em nenhuma tela que elas são "as mais cobradas".
// (O importador do admin ainda piora isso: ele grava `Number(valor)`, e o leitor
// aqui espera texto — "alta" entraria como NaN e cairia no mesmo balde.)
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

type LinhaSelecionavel = {
  id: string
  topic_id: string | null
  banca?: string | null
  incidencia_prova?: string | null
}

// O par (tópico, edição) é o que dá título e slug — repeti-lo produz duas páginas
// com o MESMO H1. Mora aqui fora porque `selecionarPublicas` também precisa dele.
const parDaQuestao = (q: LinhaSelecionavel) =>
  `${q.topic_id ?? "__none"}|${edicaoDaBanca(q.banca) ?? "__sem"}`

// A CURADORIA: escolhe as N "melhores" de forma DETERMINÍSTICA (estável entre
// builds → sitemap/ISR estáveis). Não é ela que decide o que fica publicado —
// isso é `selecionarPublicas`. Critério:
//   1) ordem base: maior incidência na prova, desempate por id (hoje inerte, ver
//      `incidenciaRank`: o campo está nulo no banco inteiro);
//   2) diversidade de tópico: pega 1 por topic_id distinto (evita 10 páginas do mesmo
//      tema canibalizando entre si). Questões sem tópico contam como um único balde;
//   3) completa as vagas preferindo pares (tópico, edição) inéditos — é o par que dá
//      título e slug, então repeti-lo produz duas páginas com o MESMO H1. Matérias com
//      um único tópico cadastrado (Ambiental, ECA, Filosofia, Processo do Trabalho)
//      dependem inteiramente deste passo;
//   4) se ainda faltar vaga, completa na ordem base aceitando repetição — página a
//      menos seria pior que título repetido;
//   5) retorna ordenado por id (estabilidade).
//
// O passo 2 é o que tornava a lista instável: tópico novo no banco reordena tudo.
function selectBest<T extends LinhaSelecionavel>(
  rows: T[],
  n: number,
  // Tópicos e pares que já estão ocupados por questões escolhidas FORA daqui
  // (as já publicadas). Sem isso, a vaga nova repetiria um par já no ar — o
  // defeito que o passo 3 existe pra evitar, reintroduzido pela porta de trás.
  jaVistos?: { topicos: Set<string>; pares: Set<string> },
): T[] {
  const base = rows
    .slice()
    .sort((a, b) => incidenciaRank(a.incidencia_prova) - incidenciaRank(b.incidencia_prova) || compareById(a, b))

  const picked: T[] = []
  const pickedIds = new Set<string>()
  const seenTopics = new Set<string>(jaVistos?.topicos)
  const seenPares = new Set<string>(jaVistos?.pares)

  const tomar = (q: T) => {
    picked.push(q)
    pickedIds.add(q.id)
    seenTopics.add(q.topic_id ?? "__none")
    seenPares.add(parDaQuestao(q))
  }

  for (const q of base) {
    if (picked.length >= n) break
    if (!seenTopics.has(q.topic_id ?? "__none")) tomar(q)
  }
  for (const q of base) {
    if (picked.length >= n) break
    if (!pickedIds.has(q.id) && !seenPares.has(parDaQuestao(q))) tomar(q)
  }
  for (const q of base) {
    if (picked.length >= n) break
    if (!pickedIds.has(q.id)) tomar(q)
  }

  return picked.sort(compareById).slice(0, n)
}

/**
 * O conjunto público de uma matéria: **o que já está publicado, mais o que
 * couber**. É esta função — não `selectBest` — que as páginas usam.
 *
 * A ordem é o ponto inteiro. `selectBest` é curadoria, e curadoria pode mudar de
 * ideia quando o banco muda; URL no ar não pode. Enquanto a escolha era só
 * curadoria, importar uma prova nova tirava páginas do índice em silêncio: o 47º
 * Exame sozinho trocaria 25 das 200, e cada uma viraria 404 (ver
 * `lib/seo/questoes-publicadas.ts`, onde o número está medido).
 *
 * Se o livro-caixa já tem mais entradas desta matéria do que o teto, elas
 * **todas** continuam servidas. Exibir 11 numa página que anuncia 10 é
 * imprecisão; devolver 404 numa URL que o Google indexou é dano.
 */
function selecionarPublicas<T extends LinhaSelecionavel>(rows: T[], n: number): T[] {
  const publicadas = rows.filter((q) => QUESTOES_PUBLICADAS.has(q.id))
  const vagas = n - publicadas.length
  if (vagas <= 0) return publicadas.sort(compareById)

  const jaVistos = {
    topicos: new Set(publicadas.map((q) => q.topic_id ?? "__none")),
    pares: new Set(publicadas.map(parDaQuestao)),
  }
  const candidatas = rows.filter((q) => !QUESTOES_PUBLICADAS.has(q.id))
  return [...publicadas, ...selectBest(candidatas, vagas, jaVistos)].sort(compareById)
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
        total: raw,
      }
    })
  )

  return result.filter((s) => s.count > 0)
}

// As N questões públicas de uma matéria — **estável entre builds e imune a
// importação nova**: passa por `selecionarPublicas`, que serve primeiro o que já
// está no ar (`lib/seo/questoes-publicadas.ts`) e só depois entrega as vagas que
// sobram à curadoria de `selectBest`. `incidencia_prova` só é usado aqui para a
// seleção — não vai para o tipo público, e hoje está nulo no banco inteiro.
export async function getPublicQuestionsForSubject(subjectId: string): Promise<PublicQuestion[]> {
  const [{ data }, topicos] = await Promise.all([
    supabaseAdmin
      .from("questions")
      .select(`${QUESTION_FIELDS}, incidencia_prova`)
      .eq("subject_id", subjectId)
      .order("id", { ascending: true })
      .limit(1000),
    carregarTopicos(),
  ])

  const rows = (data ?? []) as (LinhaQuestao & { incidencia_prova: string | null })[]
  return selecionarPublicas(rows, PUBLIC_QUESTIONS_PER_SUBJECT).map(({ incidencia_prova: _omit, ...q }) => ({
    ...q,
    topicName: q.topic_id ? (topicos.get(q.topic_id) ?? null) : null,
  }))
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
  const q = data as LinhaQuestao

  const publicOnes = await getPublicQuestionsForSubject(q.subject_id)
  if (!publicOnes.some((p) => p.id === q.id)) return null

  const [{ data: subj }, topicos] = await Promise.all([
    supabaseAdmin.from("subjects").select("name").eq("id", q.subject_id).maybeSingle(),
    carregarTopicos(),
  ])

  const name = (subj as { name: string } | null)?.name ?? "Direito"
  return {
    ...q,
    topicName: q.topic_id ? (topicos.get(q.topic_id) ?? null) : null,
    subjectName: name,
    subjectSlug: subjectSlug(name),
  }
}

/**
 * Lista achatada de todas as questões públicas — para sitemap e generateStaticParams.
 *
 * Devolve o `slug` JÁ MONTADO, não os ingredientes: sitemap, `generateStaticParams`
 * e o `canonical` da página têm que produzir exatamente a mesma URL. Se divergirem,
 * o sitemap passa a apontar para endereços que redirecionam e as páginas somem do
 * conjunto prerenderizado.
 */
export async function getAllPublicQuestions(): Promise<
  { id: string; subjectSlug: string; slug: string }[]
> {
  const subjects = await getPublicSubjects()
  // Em paralelo: são ~20 consultas independentes, uma por matéria. Em série isto era
  // o trecho mais lento do build.
  const porMateria = await Promise.all(
    subjects.map(async (s) => {
      const qs = await getPublicQuestionsForSubject(s.id)
      return qs.map((q) => ({ id: q.id, subjectSlug: s.slug, slug: slugDaQuestao(q) }))
    }),
  )
  return porMateria.flat()
}
