import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"

const DURACAO_SIMULADO_SEG = 5 * 60 * 60 // 5 horas

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: simuladoId } = await params
  const { user, supabase, error } = await requireUser()
  if (error) return error

  const { data: simulado } = await supabase
    .from("simulados")
    .select("id, started_at, percentual")
    .eq("id", simuladoId)
    .eq("user_id", user.id)
    .single()

  if (!simulado) {
    return NextResponse.json({ error: "Simulado não encontrado" }, { status: 404 })
  }

  // Se já foi finalizado, retorna direto sem mexer no started_at
  if (simulado.percentual !== null) {
    return NextResponse.json({
      id: simulado.id,
      started_at: simulado.started_at,
      tempo_restante_segundos: 0,
      expired: true,
      finalizado: true,
    })
  }

  // Primeira vez acessando: seta started_at (race-safe via .is null)
  if (simulado.started_at === null) {
    const { data: updated } = await supabase
      .from("simulados")
      .update({ started_at: new Date().toISOString() })
      .eq("id", simuladoId)
      .eq("user_id", user.id)
      .is("started_at", null)
      .select("started_at")
      .single()

    // Se updated existe, eu setei; se não existe, alguém setou antes — releia
    if (updated) {
      simulado.started_at = updated.started_at
    } else {
      const { data: reread } = await supabase
        .from("simulados")
        .select("started_at")
        .eq("id", simuladoId)
        .single()
      simulado.started_at = reread?.started_at ?? new Date().toISOString()
    }
  }

  const startedAtMs = new Date(simulado.started_at).getTime()
  const elapsedSeg = Math.floor((Date.now() - startedAtMs) / 1000)
  const tempoRestante = Math.max(0, DURACAO_SIMULADO_SEG - elapsedSeg)

  return NextResponse.json({
    id: simulado.id,
    started_at: simulado.started_at,
    tempo_restante_segundos: tempoRestante,
    expired: tempoRestante === 0,
    finalizado: false,
  })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: simuladoId } = await params
  const { user, supabase, error } = await requireUser()
  if (error) return error

  // Garante que o simulado pertence ao usuário
  const { data: simulado } = await supabase
    .from("simulados")
    .select("id")
    .eq("id", simuladoId)
    .eq("user_id", user.id)
    .single()

  if (!simulado) {
    return NextResponse.json({ error: "Simulado não encontrado" }, { status: 404 })
  }

  // Busca attempts para deletar respostas relacionadas
  const { data: attempts } = await supabase
    .from("simulado_attempts")
    .select("id")
    .eq("simulado_id", simuladoId)

  if (attempts && attempts.length > 0) {
    const attemptIds = attempts.map((a) => a.id)
    await supabase.from("simulado_respostas").delete().in("attempt_id", attemptIds)
  }

  await supabase.from("simulado_attempts").delete().eq("simulado_id", simuladoId)

  const { error: delError } = await supabase
    .from("simulados")
    .delete()
    .eq("id", simuladoId)
    .eq("user_id", user.id)

  if (delError) {
    return NextResponse.json({ error: delError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
