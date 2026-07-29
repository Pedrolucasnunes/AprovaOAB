import { NextResponse } from "next/server"
import { addDays, startOfDay } from "date-fns"
import { fromZonedTime, toZonedTime } from "date-fns-tz"
import { requireUser } from "@/lib/auth-server"
import { TZ_BRASIL } from "@/lib/datas"
import { EVENTOS, track } from "@/lib/events"
import { logError } from "@/lib/logger"
import { proximoModuloPendente } from "@/lib/services/diagnostico"
import { supabaseAdmin } from "@/lib/supabase-admin"

// "Me lembra amanhã" da tela de resultado do diagnóstico.
//
// Antes esse botão era um <Link href="/dashboard"> — não lembrava ninguém de
// nada. Era o único elemento que mentia numa tela cujo argumento inteiro é
// honestidade sobre o que foi medido.

/**
 * Início do próximo dia no fuso de Brasília.
 *
 * NÃO é `now + 24h`. O cron roda uma vez por dia em hora fixa: se o lembrete
 * fosse marcado pra 24h à frente, quem clicasse às 15h ficaria com alvo às 15h
 * de amanhã, o cron da manhã não pegaria, e o e-mail sairia depois de amanhã.
 * Marcando a meia-noite de amanhã, qualquer execução de amanhã dispara — e
 * "amanhã" passa a ser verdade independentemente da hora do cron.
 */
function inicioDeAmanhaBR(): Date {
  const agoraSP = toZonedTime(new Date(), TZ_BRASIL)
  return fromZonedTime(addDays(startOfDay(agoraSP), 1), TZ_BRASIL)
}

export async function POST() {
  const { user, error } = await requireUser()
  if (error) return error

  // Não agenda lembrete pra quem não tem o que medir. Sem esta checagem, o
  // usuário com mapa completo receberia um e-mail dizendo "faltam 0 matérias".
  const proximo = await proximoModuloPendente(user.id)
  if (!proximo) {
    return NextResponse.json({ error: "MAPA_COMPLETO" }, { status: 409 })
  }

  const quando = inicioDeAmanhaBR()

  const { error: updateError } = await supabaseAdmin
    .from("users")
    .update({ diagnostic_reminder_at: quando.toISOString() })
    .eq("id", user.id)

  if (updateError) {
    logError(updateError, { area: "diagnostico-lembrete", userId: user.id })
    return NextResponse.json({ error: "Não foi possível agendar o lembrete" }, { status: 500 })
  }

  void track(user.id, EVENTOS.DIAGNOSTICO_LEMBRETE_PEDIDO, {
    modulo: proximo.id,
    materias_pendentes: proximo.materiasPendentes,
  })

  return NextResponse.json({ ok: true, quando: quando.toISOString() })
}
