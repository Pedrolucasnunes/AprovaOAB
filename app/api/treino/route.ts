import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { rateLimit } from "@/lib/rate-limit"
import { checkDailyLimit } from "@/lib/check-daily-limit"
import { fetchAllRows, fetchByIds } from "@/lib/supabase-paginate"
import { logError } from "@/lib/logger"

type QuestaoTreino = {
  id: string
  enunciado: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  subject_id: string
  topic_id: string | null
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, "treino", 30, 60)
  if (!rl.success) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde alguns segundos." }, { status: 429 })
  }

  const { user, supabase, error } = await requireUser()
  if (error) return error

  const userId = user.id

  let body: { quantidade?: unknown; materia?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const { quantidade, materia } = body
  const totalQuestoes = [5, 10, 20, 30].includes(Number(quantidade)) ? Number(quantidade) : 10
  const materiaFiltrada = typeof materia === "string" && materia.length > 0 ? materia : null

  // Limite diário do plano free — verificado antes de montar o treino
  const { data: userPlanoRow } = await supabase
    .from("users")
    .select("plano")
    .eq("id", userId)
    .single()

  const plano = (userPlanoRow?.plano ?? "free") as "free" | "pro" | "aprovacao"
  const limit = await checkDailyLimit(supabase, userId, plano)

  if (limit.exceeded) {
    return NextResponse.json(
      { error: "Você já completou suas 10 questões de hoje.", limiteDiario: true, upgrade: true },
      { status: 403 }
    )
  }

  // Free: bloqueia se o treino pedido for maior do que resta do limite diário —
  // em vez de montar um treino que o usuário seria barrado de terminar no meio.
  const restante = limit.limit - limit.count
  if (plano === "free" && totalQuestoes > restante) {
    return NextResponse.json(
      {
        error: `Você tem só ${restante} ${restante === 1 ? "questão restante" : "questões restantes"} hoje no plano Grátis. Escolha um treino menor ou volte amanhã.`,
        limiteDiario: true,
        upgrade: true,
        restante,
      },
      { status: 403 }
    )
  }

  let sessaoFocada = totalQuestoes === 5 && !materiaFiltrada
  let qtdRisco = sessaoFocada ? totalQuestoes : Math.round(totalQuestoes * 0.7)
  let qtdGeral = totalQuestoes - qtdRisco

  // 1. Questões já acertadas pelo usuário (simulados + treino avulso em paralelo).
  //    Paginado: um usuário ativo pode passar de 1000 acertos.
  const attemptIds = (
    await fetchAllRows<{ id: string }>(
      () => supabase.from("simulado_attempts").select("id").eq("user_id", userId),
    )
  ).map((a) => a.id)

  const [simAcertou, treinoAcertou] = await Promise.all([
    fetchByIds<{ question_id: string }>(
      (ids) => supabase.from("simulado_respostas").select("question_id").eq("acertou", true).in("attempt_id", ids),
      attemptIds,
    ),
    fetchAllRows<{ question_id: string }>(
      () => supabase.from("question_attempts").select("question_id").eq("user_id", userId).eq("acertou", true),
    ),
  ])

  const idsJaAcertou = new Set<string>([
    ...simAcertou.map((r) => r.question_id),
    ...treinoAcertou.map((r) => r.question_id),
  ])

  // Sorteia `n` questões de um escopo (matérias ou banco todo), excluindo ids já usados.
  // Filtra em JS (sem .not(id in ...) na URL, que estoura com muitos UUIDs) e pagina os
  // candidatos (o banco passa de 1000). Busca os campos completos só das escolhidas.
  const QFIELDS =
    "id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, subject_id, topic_id"
  async function sortearQuestoes(
    n: number,
    subjectIds: string[] | null,
    excluir: Set<string>,
  ): Promise<QuestaoTreino[]> {
    if (n <= 0) return []
    try {
      const candidatos = await fetchAllRows<{ id: string }>(() => {
        let q = supabase.from("questions").select("id")
        if (subjectIds) q = q.in("subject_id", subjectIds)
        return q
      })
      const escolhidos = candidatos
        .map((c) => c.id)
        .filter((id) => !excluir.has(id))
        .sort(() => Math.random() - 0.5)
        .slice(0, n)
      return await fetchByIds<QuestaoTreino>(
        (ids) => supabase.from("questions").select(QFIELDS).in("id", ids),
        escolhidos,
      )
    } catch (err) {
      logError(err, { area: "treino", userId, phase: "sortear-questoes" })
      return []
    }
  }

  // 1.5. Modo focado — uma matéria específica (vindo do mini-diagnóstico)
  if (materiaFiltrada) {
    const questoesFocadas = await sortearQuestoes(totalQuestoes, [materiaFiltrada], idsJaAcertou)

    const { data: subjectFocada } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("id", materiaFiltrada)
      .single()

    const subjectName = subjectFocada?.name ?? "Geral"
    const questoesComMateria = questoesFocadas.map((q) => ({
      ...q,
      subject_name: subjectName,
    }))

    console.log(`[treino] modo focado: ${questoesFocadas.length} questões de ${subjectName}`)

    return NextResponse.json({
      distribuicao: {
        total: questoesFocadas.length,
        risco: questoesFocadas.length,
        geral: 0,
      },
      questoes: questoesComMateria,
    }, { status: 200 })
  }

  // 2. Matérias em risco
  const { data: materiasRisco } = await supabase
    .from("materias_risco")
    .select("subject_id, taxa")
    .eq("user_id", userId)
    .order("taxa", { ascending: true })
    .limit(3)

  const subjectIdsRisco = (materiasRisco ?? []).map((m) => m.subject_id)

  // Fallback: sessão focada sem matérias em risco → vira distribuição padrão (100% gerais pra 5q)
  if (sessaoFocada && subjectIdsRisco.length === 0) {
    sessaoFocada = false
    qtdRisco = 0
    qtdGeral = totalQuestoes
  }

  // 3. Questões das matérias em risco (70%)
  let questoesRisco: QuestaoTreino[] = []

  if (subjectIdsRisco.length > 0) {
    questoesRisco = await sortearQuestoes(qtdRisco, subjectIdsRisco, idsJaAcertou)
  }

  // 4. Questões gerais (30%) — exclui as já acertadas e as já escolhidas no bloco de risco
  const idsJaSelecionados = new Set<string>([...idsJaAcertou, ...questoesRisco.map((q) => q.id)])
  const questoesGeralSelecionadas = await sortearQuestoes(qtdGeral, null, idsJaSelecionados)

  // 5. Monta lista final
  const questoesFinal = [...questoesRisco, ...questoesGeralSelecionadas]
    .sort(() => Math.random() - 0.5)

  // 6. Busca nomes das matérias
  const subjectIdsFinal = [...new Set(questoesFinal.map((q) => q.subject_id))]
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .in("id", subjectIdsFinal.length > 0 ? subjectIdsFinal : ["null"])

  const subjectMap = Object.fromEntries((subjects ?? []).map((s) => [s.id, s.name]))

  const questoesComMateria = questoesFinal.map((q) => ({
    ...q,
    subject_name: subjectMap[q.subject_id] ?? "Desconhecida",
  }))

  console.log(`[treino] ${questoesFinal.length} questões montadas — risco=${questoesRisco.length} geral=${questoesGeralSelecionadas.length}`)

  return NextResponse.json({
    distribuicao: {
      total: questoesFinal.length,
      risco: questoesRisco.length,
      geral: questoesGeralSelecionadas.length,
    },
    questoes: questoesComMateria,
  }, { status: 200 })
}