import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { gerarEventos } from "@/lib/services/agenda"
import {
  getValidAccessToken,
  createGoogleEvent,
  deleteGoogleEvent,
} from "@/lib/services/googleCalendar"
import { rateLimit } from "@/lib/rate-limit"
import { logError } from "@/lib/logger"

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, "calendario-gerar", 10, 60)
  if (!rl.success) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde alguns segundos." }, { status: 429 })
  }

  const { user, supabase, error } = await requireUser()
  if (error) return error

  const userId = user.id

  // 1. Busca desempenho por matéria
  const { data: desempenhoRaw } = await supabase
    .from("desempenho_materia")
    .select("subject_id, acertos, total")
    .eq("user_id", userId)

  // 2. Busca nomes das matérias
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")

  const subjectMap = Object.fromEntries(
    (subjects ?? []).map((s: { id: string; name: string }) => [s.id, s.name])
  )

  // 3. Agrupa por subject_id e calcula taxa
  const grouped = new Map<string, { acertos: number; total: number }>()

  for (const r of desempenhoRaw ?? []) {
    const existing = grouped.get(r.subject_id)
    if (existing) {
      existing.acertos += r.acertos ?? 0
      existing.total   += r.total   ?? 0
    } else {
      grouped.set(r.subject_id, {
        acertos: r.acertos ?? 0,
        total:   r.total   ?? 0,
      })
    }
  }

  let desempenho = Array.from(grouped.entries()).map(([subject_id, { acertos, total }]) => ({
    subject_id,
    nome:       subjectMap[subject_id] ?? "Matéria",
    taxa_acerto: total > 0
      ? parseFloat(((acertos / total) * 100).toFixed(2))
      : 0,
  }))

  // 4. Fallback: sem histórico → usa todas as matérias como médias (50%)
  if (desempenho.length === 0 && subjects && subjects.length > 0) {
    desempenho = subjects.map((s: { id: string; name: string }) => ({
      subject_id:  s.id,
      nome:        s.name,
      taxa_acerto: 50,
    }))
  }

  // 5. Busca disponibilidade do usuário
  const { data: availabilityRaw } = await supabase
    .from("user_availability")
    .select("day_of_week, start_time, end_time")
    .eq("user_id", userId)

  const availability = (availabilityRaw ?? []).map((a: { day_of_week: number; start_time: string; end_time: string }) => ({
    day_of_week: a.day_of_week,
    start_time:  String(a.start_time).slice(0, 5),
    end_time:    String(a.end_time).slice(0, 5),
  }))

  // 6. Calcula segunda e domingo da semana atual
  const now    = new Date()
  const dow    = now.getDay()
  const toMon  = dow === 0 ? -6 : 1 - dow
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + toMon)
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

  const mondayStr = fmt(monday)
  const sundayStr = fmt(sunday)

  // 7. Busca token do Google Calendar (se conectado)
  const googleToken = await getValidAccessToken(userId, supabase)

  // 8. Antes de deletar: pega os google_event_ids para remover do Google Calendar
  if (googleToken) {
    const { data: oldEvents } = await supabase
      .from("calendar_events")
      .select("google_event_id")
      .eq("user_id", userId)
      .eq("is_auto", true)
      .gte("date", mondayStr)
      .lte("date", sundayStr)
      .not("google_event_id", "is", null)

    if (oldEvents && oldEvents.length > 0) {
      await Promise.allSettled(
        oldEvents.map((e: { google_event_id: string | null }) => deleteGoogleEvent(googleToken, e.google_event_id!))
      )
    }
  }

  // 9. Remove eventos automáticos da semana inteira (Seg → Dom)
  await supabase
    .from("calendar_events")
    .delete()
    .eq("user_id", userId)
    .eq("is_auto", true)
    .gte("date", mondayStr)
    .lte("date", sundayStr)

  // 10. Gera e insere novos eventos a partir da segunda
  const events = gerarEventos(userId, desempenho, availability, mondayStr)

  const { data: inserted, error: insertError } = await supabase
    .from("calendar_events")
    .insert(events)
    .select()

  if (insertError) {
    logError(insertError, { area: "calendario-gerar", userId, phase: "insert-events" })
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // 11. Sincroniza com Google Calendar (best-effort, não bloqueia a resposta)
  let googleSynced = false
  if (googleToken && inserted && inserted.length > 0) {
    try {
      await Promise.allSettled(
        inserted.map(async (event: { id: string; title: string; date: string; time: string; type: string; reason?: string; google_event_id?: string | null }) => {
          const gEventId = await createGoogleEvent(googleToken, {
            title:       event.title,
            date:        event.date,
            time:        event.time,
            type:        event.type,
            description: event.reason,
          })
          if (gEventId) {
            await supabase
              .from("calendar_events")
              .update({ google_event_id: gEventId })
              .eq("id", event.id)
          }
        })
      )
      googleSynced = true
    } catch (e) {
      logError(e, { area: "calendario-gerar", userId, phase: "google-sync" })
    }
  }

  return NextResponse.json({
    events:       inserted ?? [],
    count:        inserted?.length ?? 0,
    googleSynced,
    stats: {
      criticas: desempenho.filter((d) => d.taxa_acerto < 40).length,
      medias:   desempenho.filter((d) => d.taxa_acerto >= 40 && d.taxa_acerto <= 70).length,
      boas:     desempenho.filter((d) => d.taxa_acerto > 70).length,
    },
  })
}
