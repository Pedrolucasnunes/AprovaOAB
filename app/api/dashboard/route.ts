import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { inicioDoDiaBR, hojeStringBR, diaDaSemanaBR } from "@/lib/check-daily-limit"
import { fetchAllRows, fetchByIds } from "@/lib/supabase-paginate"
import { classificarTaxa, TAXA_CRITICA, MIN_TENTATIVAS_BANDA } from "@/lib/metrics"
import { logError } from "@/lib/logger"

export async function GET(req: NextRequest) {
  const { user, supabase, error } = await requireUser()
  if (error) return error

  const userId = user.id

  // 0. Estado do onboarding/diagnóstico + limite diário (fuso BR — América/São_Paulo)
  const inicioDoDia = inicioDoDiaBR()

  const [
    { data: userRow },
    { count: diagnosticAttemptsCount },
    { count: questoesHojeCount },
    { data: userPlanoRow },
  ] = await Promise.all([
    supabase.from("users").select("onboarding_data").eq("id", userId).single(),
    supabase
      .from("question_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_diagnostic", true),
    supabase
      .from("question_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_diagnostic", false)
      .gte("created_at", inicioDoDia.toISOString()),
    supabase.from("users").select("plano, subscription_status, trial_used, trial_ends_at").eq("id", userId).single(),
  ])

  const onboardingCompleto = user.user_metadata?.onboarding_completed === true
  const temPerfilOnboarding =
    Array.isArray(userRow?.onboarding_data?.dificuldades) &&
    userRow.onboarding_data.dificuldades.length > 0
  const diagnosticoCompleto = (diagnosticAttemptsCount ?? 0) >= 5
  const questoesHoje = questoesHojeCount ?? 0
  const plano: "free" | "pro" | "aprovacao" = userPlanoRow?.plano ?? "free"
  const subscriptionStatus: "active" | "trialing" | "past_due" | "canceled" =
    userPlanoRow?.subscription_status ?? "active"
  const trialUsed: boolean = userPlanoRow?.trial_used ?? false
  const trialEndsAt: string | null = userPlanoRow?.trial_ends_at ?? null
  const examDate: string | null = (user.user_metadata?.exam_date as string | null) ?? null

  // 1. Tentativas avulsas (diagnóstico + treino + questões), direto da tabela.
  // CUIDADO: a view desempenho_materia NÃO serve aqui — verificado no banco,
  // ela retorna 1 linha por SIMULADO_RESPOSTA (desagregada, total sempre 1) e
  // NÃO inclui question_attempts. Avulsas só existem nesta tabela; a
  // agregação por matéria acontece no passo 5.5.
  const avulsasAttempts = await fetchAllRows<{ question_id: string; acertou: boolean }>(
    () => supabase.from("question_attempts").select("question_id, acertou").eq("user_id", userId),
  )
  const totalRespondidasAvulsas = avulsasAttempts.length
  const totalAcertosAvulsas = avulsasAttempts.filter((a) => a.acertou).length

  // 2. Último simulado + todos os finalizados (para taxa geral OAB)
  const [
    { data: ultimoSimulado, error: simError },
    simuladosFinalizados,
  ] = await Promise.all([
    supabase
      .from("simulados")
      .select("id, created_at, acertos, erros, percentual, numero_questoes, titulo")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    // Pagina: um usuário ativo pode passar de 1000 simulados finalizados.
    fetchAllRows<{ acertos: number; numero_questoes: number }>(
      () => supabase
        .from("simulados")
        .select("acertos, numero_questoes")
        .eq("user_id", userId)
        .not("percentual", "is", null),
    ),
  ])

  if (simError && simError.code !== "PGRST116") {
    logError(simError, { area: "dashboard", userId, phase: "ultimo-simulado" })
  }

  // 3. Nomes das matérias
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")

  const subjectMap = Object.fromEntries(
    (subjects ?? []).map((s) => [s.id, s.name])
  )

  // 4. (removido) A view materias_risco agrega só respostas de simulado e não
  //    filtra risco. A lista de risco agora sai da fusão do passo 5.5.

  // 5. Desempenho por matéria — apenas simulados
  const simAttempts = await fetchAllRows<{ id: string; question_id: string }>(
    () => supabase.from("simulado_attempts").select("id, question_id").eq("user_id", userId),
  )

  const simAttemptIds = simAttempts.map((a) => a.id)

  let desempenhoPorMateria: {
    subject_id: string; nome: string; total: number; acertos: number; taxa_acerto: number
  }[] = []
  // Respostas efetivamente dadas em simulados (brancos não geram linha).
  let totalRespostasSimulado = 0
  let totalAcertosRespostasSimulado = 0

  if (simAttemptIds.length > 0) {
    const simRespostas = await fetchByIds<{ question_id: string; acertou: boolean }>(
      (ids) => supabase.from("simulado_respostas").select("question_id, acertou").in("attempt_id", ids),
      simAttemptIds,
    )
    totalRespostasSimulado = simRespostas.length
    totalAcertosRespostasSimulado = simRespostas.filter((r) => r.acertou).length

    if (simRespostas.length > 0) {
      const qIds = [...new Set(simRespostas.map((r) => r.question_id))]

      const simQuestions = await fetchByIds<{ id: string; subject_id: string }>(
        (ids) => supabase.from("questions").select("id, subject_id").in("id", ids),
        qIds,
      )

      const qSubjectMap = Object.fromEntries(simQuestions.map((q) => [q.id, q.subject_id]))
      const subjectStats = new Map<string, { total: number; acertos: number }>()

      for (const r of simRespostas) {
        const sid = qSubjectMap[r.question_id]
        if (!sid) continue
        const s = subjectStats.get(sid) ?? { total: 0, acertos: 0 }
        s.total += 1
        if (r.acertou) s.acertos += 1
        subjectStats.set(sid, s)
      }

      desempenhoPorMateria = Array.from(subjectStats.entries())
        .map(([subject_id, s]) => ({
          subject_id,
          nome: subjectMap[subject_id] ?? "Matéria desconhecida",
          total: s.total,
          acertos: s.acertos,
          taxa_acerto: s.total > 0 ? parseFloat(((s.acertos / s.total) * 100).toFixed(2)) : 0,
        }))
        .sort((a, b) => a.taxa_acerto - b.taxa_acerto)
    }
  }

  const totalQuestoesFinalizados = (simuladosFinalizados ?? []).reduce((acc: number, s) => acc + (s.numero_questoes ?? 0), 0)
  const totalAcertosFinalizados  = (simuladosFinalizados ?? []).reduce((acc: number, s) => acc + (s.acertos ?? 0), 0)
  const taxaGeralSimulado = totalQuestoesFinalizados > 0
    ? parseFloat(((totalAcertosFinalizados / totalQuestoesFinalizados) * 100).toFixed(2))
    : 0

  // 5.5. Desempenho REAL por matéria = avulsas + simulados. Nenhuma view
  // entrega isso: desempenho_materia/materias_risco cobrem SÓ respostas de
  // simulado, e as avulsas só existem em question_attempts. Esta fusão é a
  // base ÚNICA de: bandas/contagens dos cards (Dashboard e Agenda), lista
  // top-5 de risco e recomendações.
  const avulsasPorMateria = new Map<string, { total: number; acertos: number }>()
  if (avulsasAttempts.length > 0) {
    const qIdsAvulsas = [...new Set(avulsasAttempts.map((a) => a.question_id))]
    const qRowsAvulsas = await fetchByIds<{ id: string; subject_id: string }>(
      (ids) => supabase.from("questions").select("id, subject_id").in("id", ids),
      qIdsAvulsas,
    )
    const subjectDaAvulsa = Object.fromEntries(qRowsAvulsas.map((q) => [q.id, q.subject_id]))
    for (const a of avulsasAttempts) {
      const sid = subjectDaAvulsa[a.question_id]
      if (!sid) continue
      const cur = avulsasPorMateria.get(sid) ?? { total: 0, acertos: 0 }
      cur.total += 1
      if (a.acertou) cur.acertos += 1
      avulsasPorMateria.set(sid, cur)
    }
  }

  const porMateria = new Map<string, { total: number; acertos: number }>()
  for (const [sid, s] of avulsasPorMateria) porMateria.set(sid, { ...s })
  for (const d of desempenhoPorMateria) {
    const cur = porMateria.get(d.subject_id) ?? { total: 0, acertos: 0 }
    cur.total += d.total
    cur.acertos += d.acertos
    porMateria.set(d.subject_id, cur)
  }

  const materiasTaxas = Array.from(porMateria.entries())
    .map(([subject_id, s]) => ({
      subject_id,
      nome: subjectMap[subject_id] ?? "Matéria desconhecida",
      total: s.total,
      taxa: s.total > 0 ? parseFloat(((s.acertos / s.total) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => a.taxa - b.taxa)

  // Bandas/contagens dos cards: só matérias com amostra mínima — 1 erro em
  // 1 questão não carimba a matéria como crítica.
  const materiasPorBanda = { criticas: 0, medias: 0, boas: 0 }
  for (const m of materiasTaxas) {
    if (m.total < MIN_TENTATIVAS_BANDA) continue
    const nivel = classificarTaxa(m.taxa)
    if (nivel === "critica") materiasPorBanda.criticas++
    else if (nivel === "media") materiasPorBanda.medias++
    else materiasPorBanda.boas++
  }
  const materiasRiscoCount = materiasPorBanda.criticas

  // Lista de risco (banda crítica), SEM piso de amostra: as recomendações
  // precisam funcionar já no pós-diagnóstico (1 resposta por matéria).
  const materiasRiscoAll = materiasTaxas.filter((m) => m.taxa < TAXA_CRITICA)
  const materiasRisco = materiasRiscoAll
    .slice(0, 5)
    .map(({ subject_id, nome, taxa }) => ({ subject_id, nome, taxa }))

  // Resumo geral DE VERDADE: avulsas + respostas de simulado no mesmo
  // denominador — só questões EFETIVAMENTE respondidas ("resolvidas").
  // Brancos de simulado não entram aqui; a nota de prova (que pontua branco
  // como erro) é a taxaSimulados.
  const totalRespondidas = totalRespondidasAvulsas + totalRespostasSimulado
  const totalAcertos = totalAcertosAvulsas + totalAcertosRespostasSimulado
  const taxaGeralAcerto = totalRespondidas > 0
    ? parseFloat(((totalAcertos / totalRespondidas) * 100).toFixed(2))
    : 0

  // 6. Action cards — dados em paralelo (fuso BR)
  const todayDate   = new Date()
  const todayStr    = hojeStringBR()
  const todayDow    = diaDaSemanaBR()

  const [
    { data: todaySlot },
    { data: proximoSimEvent },
    { count: totalSimulados },
    { data: recentAttempts },
  ] = await Promise.all([
    // Horário disponível hoje
    supabase
      .from("user_availability")
      .select("start_time")
      .eq("user_id", userId)
      .eq("day_of_week", todayDow)
      .order("start_time", { ascending: true })
      .limit(1)
      .maybeSingle(),

    // Próximo simulado agendado
    supabase
      .from("calendar_events")
      .select("date, time")
      .eq("user_id", userId)
      .eq("type", "simulado")
      .gte("date", todayStr)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle(),

    // Total de simulados finalizados
    supabase
      .from("simulados")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("percentual", "is", null),

    // Últimas práticas avulsas (para insight)
    supabase
      .from("question_attempts")
      .select("question_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
  ])

  // Matéria em risco com prática mais antiga
  let insightMateria: { subject: string; taxa: number; diasSemTreino: number | null } | null = null

  if (materiasRiscoAll.length > 0) {
    if (recentAttempts && recentAttempts.length > 0) {
      const qIds = [...new Set(recentAttempts.map((a) => a.question_id))] as string[]
      const qRows = await fetchByIds<{ id: string; subject_id: string }>(
        (ids) => supabase.from("questions").select("id, subject_id").in("id", ids),
        qIds,
      )

      const qSubMap = Object.fromEntries(qRows.map((q) => [q.id, q.subject_id]))
      const lastPractice = new Map<string, Date>()

      for (const a of recentAttempts) {
        const sid = qSubMap[a.question_id]
        if (!sid) continue
        const d = new Date(a.created_at)
        if (!lastPractice.has(sid) || d > lastPractice.get(sid)!) lastPractice.set(sid, d)
      }

      let chosen: (typeof materiasRiscoAll)[0] | null = null
      let oldestDate: Date = todayDate

      for (const m of materiasRiscoAll) {
        const last = lastPractice.get(m.subject_id)
        if (!last) { chosen = m; break }
        if (last < oldestDate) { oldestDate = last; chosen = m }
      }

      if (chosen) {
        const last = lastPractice.get(chosen.subject_id)
        insightMateria = {
          subject:       chosen.nome,
          taxa:          chosen.taxa,
          diasSemTreino: last
            ? Math.floor((todayDate.getTime() - last.getTime()) / 86400000)
            : null,
        }
      }
    } else {
      const worst = materiasRiscoAll[0]
      insightMateria = {
        subject:       worst.nome,
        taxa:          worst.taxa,
        diasSemTreino: null,
      }
    }
  }

  const actionCards = {
    proximaAcao: materiasRisco[0] ? {
      subject: materiasRisco[0].nome,
      horario: todaySlot?.start_time?.slice(0, 5) ?? null,
    } : null,
    proximoSimulado: proximoSimEvent ? {
      date:   proximoSimEvent.date,
      time:   (proximoSimEvent.time ?? "09:00").slice(0, 5),
      numero: (totalSimulados ?? 0) + 1,
    } : null,
    insightMateria,
  }

  // 7. Evolução do desempenho
  const { data: historicoSimulados, error: historicoError } = await supabase
    .from("simulados")
    .select("created_at, percentual")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(20)

  if (historicoError) {
    logError(historicoError, { area: "dashboard", userId, phase: "historico" })
  }

  const evolucao = (historicoSimulados ?? []).map((s) => ({
    date: new Date(s.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    nota: parseFloat(Number(s.percentual).toFixed(1)),
  }))

  return NextResponse.json({
    // taxaGeralAcerto/totalRespondidas agora são GERAIS de verdade: avulsas
    // (view desempenho_materia, agregada acima) + respostas de simulado, no
    // mesmo denominador. A taxa só de simulados sai como taxaSimulados — é
    // ela que mede "prontidão pra prova" (hero). totalSimuladosFinalizados
    // distingue "nota 0%" de "nunca finalizou um simulado".
    resumo: {
      totalRespondidas,
      totalAcertos,
      taxaGeralAcerto,
      taxaSimulados: taxaGeralSimulado,
      totalSimuladosFinalizados: (simuladosFinalizados ?? []).length,
    },
    ultimoSimulado: ultimoSimulado ?? null,
    materiasRisco,
    materiasRiscoCount,
    materiasPorBanda,
    desempenhoPorMateria,
    evolucao,
    actionCards,
    onboardingCompleto,
    temPerfilOnboarding,
    diagnosticoCompleto,
    questoesHoje,
    plano,
    subscriptionStatus,
    trialUsed,
    trialEndsAt,
    examDate,
  }, {
    status: 200,
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
  })
}