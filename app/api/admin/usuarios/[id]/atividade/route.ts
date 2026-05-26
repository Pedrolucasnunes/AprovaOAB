import { requireAdmin } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id: userId } = await params

  const since = new Date()
  since.setDate(since.getDate() - 30)
  const sinceISO = since.toISOString()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [
    { data: questoes },
    { data: simulados },
    { count: totalQuestoes },
    { data: authUser },
    { data: usuario },
    { data: simuladoAttemptsRow },
  ] = await Promise.all([
    supabaseAdmin
      .from("question_attempts")
      .select("created_at, is_diagnostic")
      .eq("user_id", userId)
      .gte("created_at", sinceISO)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("simulados")
      .select("created_at, numero_questoes, acertos, percentual")
      .eq("user_id", userId)
      .gte("created_at", sinceISO)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("question_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabaseAdmin.auth.admin.getUserById(userId),
    supabaseAdmin
      .from("users")
      .select("plano, role, subscription_status, created_at, trial_ends_at")
      .eq("id", userId)
      .single(),
    supabaseAdmin
      .from("simulado_attempts")
      .select("id")
      .eq("user_id", userId),
  ])

  // Total de questões respondidas em simulados (todos os tempos).
  // simulado_respostas não tem user_id direto — passa por simulado_attempts.
  const simuladoAttemptIds = (simuladoAttemptsRow ?? []).map((a) => a.id)
  const { count: totalQuestoesSimulado } = simuladoAttemptIds.length > 0
    ? await supabaseAdmin
        .from("simulado_respostas")
        .select("id", { count: "exact", head: true })
        .in("attempt_id", simuladoAttemptIds)
    : { count: 0 }

  // Totais gerais (todos os tempos) de question_attempts por tipo.
  const [{ count: totalDiagnostico }, { count: totalTreinoAvulsa }] = await Promise.all([
    supabaseAdmin
      .from("question_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_diagnostic", true),
    supabaseAdmin
      .from("question_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_diagnostic", false),
  ])

  // Preenche últimos 30 dias com zero
  const dayMap: Record<string, { questoes: number; simulados: number }> = {}
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dayMap[d.toISOString().slice(0, 10)] = { questoes: 0, simulados: 0 }
  }

  questoes?.forEach((q) => {
    const key = q.created_at.slice(0, 10)
    if (dayMap[key]) dayMap[key].questoes++
  })

  simulados?.forEach((s) => {
    const key = s.created_at.slice(0, 10)
    if (dayMap[key]) dayMap[key].simulados++
  })

  const por_dia = Object.entries(dayMap).map(([data, counts]) => ({ data, ...counts }))

  // Distribuição por hora do dia
  const horaMap: number[] = Array(24).fill(0)
  questoes?.forEach((q) => {
    const hora = new Date(q.created_at).getHours()
    horaMap[hora]++
  })
  const por_hora = horaMap.map((count, hora) => ({ hora, count }))

  // Máximo de questões em qualquer janela de 1 hora exata
  const horaWindowMap: Record<string, number> = {}
  questoes?.forEach((q) => {
    const d = new Date(q.created_at)
    d.setMinutes(0, 0, 0)
    const key = d.toISOString()
    horaWindowMap[key] = (horaWindowMap[key] ?? 0) + 1
  })
  const max_por_hora = Math.max(0, ...Object.values(horaWindowMap))

  const hoje = questoes?.filter((q) => new Date(q.created_at) >= today).length ?? 0
  const semana = questoes?.filter((q) => new Date(q.created_at) >= weekAgo).length ?? 0

  // Últimas 20 atividades combinadas com tipo refinado
  const ultimas = [
    ...(questoes?.slice(0, 15).map((q) => ({
      created_at: q.created_at,
      tipo: (q.is_diagnostic ? "diagnostico" : "treino_avulsa") as "diagnostico" | "treino_avulsa",
    })) ?? []),
    ...(simulados?.slice(0, 10).map((s) => ({
      created_at: s.created_at,
      tipo: "simulado" as const,
    })) ?? []),
  ]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 20)

  return NextResponse.json({
    user: {
      id: userId,
      email: authUser?.user?.email ?? null,
      nome: authUser?.user?.user_metadata?.full_name ?? null,
      plano: usuario?.plano ?? "free",
      role: usuario?.role ?? "free",
      subscription_status: usuario?.subscription_status ?? null,
      criado_em: usuario?.created_at ?? null,
      trial_ends_at: usuario?.trial_ends_at ?? null,
    },
    resumo: {
      hoje,
      semana,
      total: totalQuestoes ?? 0,
      max_por_hora,
    },
    por_tipo: {
      diagnostico: totalDiagnostico ?? 0,
      treino_avulsa: totalTreinoAvulsa ?? 0,
      simulado_questoes: totalQuestoesSimulado ?? 0,
    },
    por_dia,
    por_hora,
    ultimas_atividades: ultimas,
  })
}
