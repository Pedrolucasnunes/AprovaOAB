import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { inicioDoDiaBR, hojeStringBR, diaDaSemanaBR } from "@/lib/check-daily-limit"
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
  const diagnosticoCompleto = (diagnosticAttemptsCount ?? 0) >= 5
  const questoesHoje = questoesHojeCount ?? 0
  const plano: "free" | "pro" | "aprovacao" = userPlanoRow?.plano ?? "free"
  const subscriptionStatus: "active" | "trialing" | "past_due" | "canceled" =
    userPlanoRow?.subscription_status ?? "active"
  const trialUsed: boolean = userPlanoRow?.trial_used ?? false
  const trialEndsAt: string | null = userPlanoRow?.trial_ends_at ?? null
  const examDate: string | null = (user.user_metadata?.exam_date as string | null) ?? null

  // 1. Resumo geral via desempenho_materia
  const { data: resumo, error: resumoError } = await supabase
    .from("desempenho_materia")
    .select("total, acertos, taxa_acerto, subject_id")
    .eq("user_id", userId)

  if (resumoError) {
    logError(resumoError, { area: "dashboard", userId, phase: "resumo" })
    return NextResponse.json({ error: resumoError.message }, { status: 500 })
  }

  const totalRespondidas = resumo?.reduce((acc: number, r) => acc + (r.total ?? 0), 0) ?? 0
  const totalAcertos = resumo?.reduce((acc: number, r) => acc + (r.acertos ?? 0), 0) ?? 0
  const taxaGeralAcerto = totalRespondidas > 0
    ? parseFloat(((totalAcertos / totalRespondidas) * 100).toFixed(2))
    : 0

  // 2. Último simulado + todos os finalizados (para taxa geral OAB)
  const [
    { data: ultimoSimulado, error: simError },
    { data: simuladosFinalizados },
  ] = await Promise.all([
    supabase
      .from("simulados")
      .select("id, created_at, acertos, erros, percentual, numero_questoes, titulo")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("simulados")
      .select("acertos, numero_questoes")
      .eq("user_id", userId)
      .not("percentual", "is", null),
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

  // 4. Matérias em risco
  const { data: materiasRiscoRaw, error: riscoError } = await supabase
    .from("materias_risco")
    .select("subject_id, taxa")
    .eq("user_id", userId)
    .order("taxa", { ascending: true })
    .limit(5)

  if (riscoError) {
    logError(riscoError, { area: "dashboard", userId, phase: "materias-risco" })
  }

  const materiasRisco = (materiasRiscoRaw ?? []).map((m) => ({
    subject_id: m.subject_id,
    nome: subjectMap[m.subject_id] ?? "Matéria desconhecida",
    taxa: m.taxa,
  }))

  // 5. Desempenho por matéria — apenas simulados
  const { data: simAttempts } = await supabase
    .from("simulado_attempts")
    .select("id, question_id")
    .eq("user_id", userId)

  const simAttemptIds = (simAttempts ?? []).map((a) => a.id)

  let desempenhoPorMateria: {
    subject_id: string; nome: string; total: number; acertos: number; taxa_acerto: number
  }[] = []

  if (simAttemptIds.length > 0) {
    const { data: simRespostas } = await supabase
      .from("simulado_respostas")
      .select("question_id, acertou")
      .in("attempt_id", simAttemptIds)

    if (simRespostas && simRespostas.length > 0) {
      const qIds = [...new Set(simRespostas.map((r) => r.question_id))]

      const { data: simQuestions } = await supabase
        .from("questions")
        .select("id, subject_id")
        .in("id", qIds)

      const qSubjectMap = Object.fromEntries((simQuestions ?? []).map((q) => [q.id, q.subject_id]))
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

  if ((materiasRiscoRaw ?? []).length > 0) {
    if (recentAttempts && recentAttempts.length > 0) {
      const qIds = [...new Set(recentAttempts.map((a) => a.question_id))]
      const { data: qRows } = await supabase
        .from("questions")
        .select("id, subject_id")
        .in("id", qIds)

      const qSubMap = Object.fromEntries((qRows ?? []).map((q) => [q.id, q.subject_id]))
      const lastPractice = new Map<string, Date>()

      for (const a of recentAttempts) {
        const sid = qSubMap[a.question_id]
        if (!sid) continue
        const d = new Date(a.created_at)
        if (!lastPractice.has(sid) || d > lastPractice.get(sid)!) lastPractice.set(sid, d)
      }

      let chosen: NonNullable<typeof materiasRiscoRaw>[0] | null = null
      let oldestDate: Date = todayDate

      for (const m of materiasRiscoRaw ?? []) {
        const last = lastPractice.get(m.subject_id)
        if (!last) { chosen = m; break }
        if (last < oldestDate) { oldestDate = last; chosen = m }
      }

      if (chosen) {
        const last = lastPractice.get(chosen.subject_id)
        insightMateria = {
          subject:       subjectMap[chosen.subject_id] ?? "Matéria desconhecida",
          taxa:          chosen.taxa,
          diasSemTreino: last
            ? Math.floor((todayDate.getTime() - last.getTime()) / 86400000)
            : null,
        }
      }
    } else {
      const worst = materiasRiscoRaw![0]
      insightMateria = {
        subject:       subjectMap[worst.subject_id] ?? "Matéria desconhecida",
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
    resumo: { totalRespondidas, totalAcertos, taxaGeralAcerto: taxaGeralSimulado },
    ultimoSimulado: ultimoSimulado ?? null,
    materiasRisco,
    desempenhoPorMateria,
    evolucao,
    actionCards,
    onboardingCompleto,
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