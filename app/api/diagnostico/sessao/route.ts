import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { getDiagnosticoConfig, getModulo, type ModuloDiagnostico } from "@/lib/config"
import { EVENTOS, track } from "@/lib/events"
import { fetchAllRows, fetchByIds } from "@/lib/supabase-paginate"
import { supabaseAdmin } from "@/lib/supabase-admin"

// Sessão de diagnóstico por módulo. Substitui /api/diagnostico/gerar.
//
// A diferença que importa: o conjunto de questões é sorteado UMA vez e gravado
// em diagnostic_sessions.question_ids. O `gerar` antigo ressorteava a cada
// montagem da página, então quem fechava a aba na questão 3 voltava pra um
// diagnóstico diferente — não havia como retomar.
//
// diagnostic_sessions tem RLS sem policies: todo acesso aqui é via supabaseAdmin,
// de propósito. Se o usuário pudesse escrever, poderia adiantar `posicao` e
// pular questões.

const QFIELDS = "id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, subject_id"

interface QuestionRow {
  id: string
  enunciado: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  subject_id: string
}

interface SessaoRow {
  id: string
  modulo: string
  question_ids: string[]
  posicao: number
  status: string
}

/** Ids que o usuário já respondeu — em qualquer contexto — pra não repetir. */
async function idsJaRespondidas(userId: string): Promise<Set<string>> {
  const attemptIds = (
    await fetchAllRows<{ id: string }>(() =>
      supabaseAdmin.from("simulado_attempts").select("id").eq("user_id", userId),
    )
  ).map((a) => a.id)

  const [sim, avulsas] = await Promise.all([
    fetchByIds<{ question_id: string }>(
      (ids) => supabaseAdmin.from("simulado_respostas").select("question_id").in("attempt_id", ids),
      attemptIds,
    ),
    fetchAllRows<{ question_id: string }>(() =>
      supabaseAdmin.from("question_attempts").select("question_id").eq("user_id", userId),
    ),
  ])

  return new Set([...sim.map((r) => r.question_id), ...avulsas.map((r) => r.question_id)])
}

/**
 * Sorteia `questoesPorMateria` de cada matéria do módulo.
 *
 * Se alguma matéria não tiver questões elegíveis suficientes, o módulo sai menor
 * em vez de completar com outra matéria: a promessa da tela de resultado é
 * "medimos N matérias com M questões cada", e encher com matéria alheia
 * quebraria justamente isso. O tamanho real é o length de question_ids.
 */
async function sortearQuestoes(
  modulo: ModuloDiagnostico,
  exigirExplicacao: boolean,
  excluir: Set<string>,
): Promise<string[]> {
  const candidatos = await fetchAllRows<{ id: string; subject_id: string; explicacao: string | null }>(
    () => {
      let q = supabaseAdmin
        .from("questions")
        .select("id, subject_id, explicacao")
        .in("subject_id", modulo.subjects)
      if (modulo.dificuldades.length > 0) q = q.in("dificuldade", modulo.dificuldades)
      return q
    },
  )

  const porMateria = new Map<string, string[]>()
  for (const q of candidatos) {
    if (excluir.has(q.id)) continue
    if (exigirExplicacao && !q.explicacao) continue
    const lista = porMateria.get(q.subject_id) ?? []
    lista.push(q.id)
    porMateria.set(q.subject_id, lista)
  }

  const escolhidas: string[] = []
  for (const subjectId of modulo.subjects) {
    const disponiveis = (porMateria.get(subjectId) ?? []).sort(() => Math.random() - 0.5)
    escolhidas.push(...disponiveis.slice(0, modulo.questoesPorMateria))
  }

  // Embaralha a ordem final pra não entregar as matérias em bloco.
  return escolhidas.sort(() => Math.random() - 0.5)
}

/** Devolve as questões a partir de `posicao`, na ordem gravada na sessão. */
async function questoesDaSessao(sessao: SessaoRow) {
  const restantes = sessao.question_ids.slice(sessao.posicao)
  if (restantes.length === 0) return []

  const rows = await fetchByIds<QuestionRow>(
    (ids) => supabaseAdmin.from("questions").select(QFIELDS).in("id", ids),
    restantes,
  )

  const { data: subjects } = await supabaseAdmin
    .from("subjects")
    .select("id, name")
    .in("id", [...new Set(rows.map((r) => r.subject_id))])

  const nome = Object.fromEntries((subjects ?? []).map((s) => [s.id, s.name]))
  const porId = new Map(rows.map((r) => [r.id, r]))

  // fetchByIds não preserva ordem; a sessão é que manda.
  return restantes
    .map((id) => porId.get(id))
    .filter((q): q is QuestionRow => Boolean(q))
    .map((q) => ({ ...q, subject_name: nome[q.subject_id] ?? "Geral" }))
}

export async function GET(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  const moduloId = new URL(req.url).searchParams.get("modulo") ?? "m1"
  const modulo = await getModulo(moduloId)
  if (!modulo) {
    return NextResponse.json({ error: "MODULO_DESCONHECIDO" }, { status: 404 })
  }

  const { data: existente } = await supabaseAdmin
    .from("diagnostic_sessions")
    .select("id, modulo, question_ids, posicao, status")
    .eq("user_id", user.id)
    .eq("modulo", moduloId)
    .maybeSingle()

  if (existente?.status === "concluida") {
    return NextResponse.json({ error: "MODULO_CONCLUIDO", modulo: moduloId }, { status: 409 })
  }

  if (existente) {
    return NextResponse.json({
      modulo: moduloId,
      label: modulo.label,
      total: existente.question_ids.length,
      posicao: existente.posicao,
      retomando: existente.posicao > 0,
      questions: await questoesDaSessao(existente as SessaoRow),
    })
  }

  const { exigirExplicacao } = await getDiagnosticoConfig()
  const questionIds = await sortearQuestoes(modulo, exigirExplicacao, await idsJaRespondidas(user.id))

  if (questionIds.length === 0) {
    return NextResponse.json({ error: "SEM_QUESTOES_DISPONIVEIS" }, { status: 409 })
  }

  const { data: criada, error: insertError } = await supabaseAdmin
    .from("diagnostic_sessions")
    .insert({ user_id: user.id, modulo: moduloId, question_ids: questionIds, posicao: 0 })
    .select("id, modulo, question_ids, posicao, status")
    .single()

  if (insertError || !criada) {
    return NextResponse.json({ error: insertError?.message ?? "Falha ao criar sessão" }, { status: 500 })
  }

  void track(user.id, EVENTOS.DIAGNOSTICO_MODULO_INICIADO, {
    modulo: moduloId,
    total: questionIds.length,
    materias: modulo.subjects.length,
  })

  return NextResponse.json({
    modulo: moduloId,
    label: modulo.label,
    total: questionIds.length,
    posicao: 0,
    retomando: false,
    questions: await questoesDaSessao(criada as SessaoRow),
  })
}

/**
 * Refazer um módulo. Só liberado quando ele foi concluído e não produziu
 * NENHUMA matéria medida — o caso de quem clicou em tudo rápido demais. Sem
 * isso o usuário fica num beco: módulo concluído, tela de resultado vazia e
 * nenhum caminho de volta.
 */
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  const body = await req.json().catch(() => null)
  const moduloId = typeof body?.modulo === "string" ? body.modulo : "m1"
  if (body?.reset !== true) {
    return NextResponse.json({ error: "Ação inválida" }, { status: 400 })
  }

  const modulo = await getModulo(moduloId)
  if (!modulo) return NextResponse.json({ error: "MODULO_DESCONHECIDO" }, { status: 404 })

  const { data: sessao } = await supabaseAdmin
    .from("diagnostic_sessions")
    .select("id, status")
    .eq("user_id", user.id)
    .eq("modulo", moduloId)
    .maybeSingle()

  if (!sessao || sessao.status !== "concluida") {
    return NextResponse.json({ error: "MODULO_NAO_CONCLUIDO" }, { status: 409 })
  }

  const { count } = await supabaseAdmin
    .from("diagnostic_subject_results")
    .select("subject_id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("subject_id", modulo.subjects)

  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: "MODULO_JA_MEDIDO" }, { status: 409 })
  }

  await supabaseAdmin.from("diagnostic_sessions").delete().eq("id", sessao.id)

  return NextResponse.json({ ok: true })
}
