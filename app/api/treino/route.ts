import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { rateLimit } from "@/lib/rate-limit"
import { checkDailyLimit } from "@/lib/check-daily-limit"
import { logError } from "@/lib/logger"

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, "treino", 30, 60)
  if (!rl.success) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde alguns segundos." }, { status: 429 })
  }

  const { user, supabase, error } = await requireUser()
  if (error) return error

  const userId = user.id

  let body: any
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

  // 1. Questões já acertadas pelo usuário (simulados + treino avulso em paralelo)
  const { data: attemptsData } = await supabase
    .from("simulado_attempts")
    .select("id")
    .eq("user_id", userId)

  const attemptIds = (attemptsData ?? []).map((a) => a.id)

  const [simAcertouResult, treinoAcertouResult] = await Promise.all([
    attemptIds.length > 0
      ? supabase
          .from("simulado_respostas")
          .select("question_id")
          .eq("acertou", true)
          .in("attempt_id", attemptIds)
      : Promise.resolve({ data: [] }),

    supabase
      .from("question_attempts")
      .select("question_id")
      .eq("user_id", userId)
      .eq("acertou", true),
  ])

  const idsJaAcertou = [
    ...new Set([
      ...(simAcertouResult.data ?? []).map((r) => r.question_id),
      ...(treinoAcertouResult.data ?? []).map((r) => r.question_id),
    ]),
  ]

  // 1.5. Modo focado — uma matéria específica (vindo do mini-diagnóstico)
  if (materiaFiltrada) {
    let queryFocada = supabase
      .from("questions")
      .select("id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, subject_id, topic_id")
      .eq("subject_id", materiaFiltrada)
      .limit(totalQuestoes * 5)

    if (idsJaAcertou.length > 0) {
      queryFocada = queryFocada.not("id", "in", `(${idsJaAcertou.join(",")})`)
    }

    const { data: focadasData } = await queryFocada
    const questoesFocadas = (focadasData ?? [])
      .sort(() => Math.random() - 0.5)
      .slice(0, totalQuestoes)

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
  let questoesRisco: any[] = []

  if (subjectIdsRisco.length > 0) {
    let query = supabase
      .from("questions")
      .select("id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, subject_id, topic_id")
      .in("subject_id", subjectIdsRisco)
      .limit(qtdRisco * 5)

    if (idsJaAcertou.length > 0) {
      query = query.not("id", "in", `(${idsJaAcertou.join(",")})`)
    }

    const { data, error: riscoError } = await query

    if (riscoError) {
      logError(riscoError, { area: "treino", userId, phase: "fetch-risco" })
    }

    questoesRisco = (data ?? []).sort(() => Math.random() - 0.5).slice(0, qtdRisco)
  }

  // 4. Questões gerais (30%)
  const idsJaSelecionados = [...idsJaAcertou, ...questoesRisco.map((q) => q.id)]

  let queryGeral = supabase
    .from("questions")
    .select("id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, subject_id, topic_id")
    .limit(qtdGeral * 5)

  if (idsJaSelecionados.length > 0) {
    queryGeral = queryGeral.not("id", "in", `(${idsJaSelecionados.join(",")})`)
  }

  const { data: questoesGeral, error: geralError } = await queryGeral

  if (geralError) {
    logError(geralError, { area: "treino", userId, phase: "fetch-geral" })
  }

  const questoesGeralSelecionadas = (questoesGeral ?? [])
    .sort(() => Math.random() - 0.5)
    .slice(0, qtdGeral)

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