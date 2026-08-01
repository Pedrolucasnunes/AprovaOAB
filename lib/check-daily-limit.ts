import type { SupabaseClient } from "@supabase/supabase-js"
import { startOfDay } from "date-fns"
import { toZonedTime, fromZonedTime } from "date-fns-tz"
import { contarDiasNoTeto, type DiasNoTeto } from "./limite-diario"
import { fetchAllRows } from "./supabase-paginate"

const TZ_BR = "America/Sao_Paulo"

export interface DailyLimitResult {
  exceeded: boolean
  count: number
  limit: number
}

/**
 * Contagem e limite ficam separados de propósito.
 *
 * O limite mora em `app_config` (`getLimitesConfig`, o mesmo valor que o
 * trigger `enforce_free_daily_limit` lê no banco), e a contagem é uma ida ao
 * banco. Se esta função buscasse as duas, a config viraria uma consulta EM
 * SEQUÊNCIA na rota que roda a cada questão respondida. Separadas, quem chama
 * dispara as duas no mesmo `Promise.all` e junta com `avaliarLimite`, que é
 * pura.
 *
 * Devolve `null` para quem não tem teto — sem consultar nada.
 */
export async function contarQuestoesHoje(
  supabase: SupabaseClient,
  userId: string,
  plano: "free" | "pro" | "aprovacao",
): Promise<number | null> {
  if (plano !== "free") return null

  const { count } = await supabase
    .from("question_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_diagnostic", false)
    .gte("created_at", inicioDoDiaBR().toISOString())

  return count ?? 0
}

/** Pura: junta a contagem com o limite configurado. */
export function avaliarLimite(count: number | null, limite: number): DailyLimitResult {
  if (count === null) return { exceeded: false, count: 0, limit: Infinity }
  return { exceeded: count >= limite, count, limit: limite }
}

/**
 * Dias distintos em que o usuário já bateu no teto — separa a parede de
 * "primeira vez" da de "toda semana".
 *
 * **Só pode ser chamada dentro do ramo do 403.** Ela é uma consulta a mais, e
 * `/api/simulados/resposta` roda a cada questão respondida; no caminho de
 * sucesso isso seria uma ida ao banco por resposta. No ramo bloqueado ela é
 * rara por definição — o usuário já está barrado.
 *
 * Quem já tem `question_attempts` em memória (o `/api/dashboard`) não usa esta
 * função: chama `contarDiasNoTeto` direto.
 */
export async function carregarDiasNoTeto(
  supabase: SupabaseClient,
  userId: string,
  limite: number,
): Promise<DiasNoTeto> {
  const attempts = await fetchAllRows<{ created_at: string; is_diagnostic: boolean }>(
    () =>
      supabase
        .from("question_attempts")
        .select("created_at, is_diagnostic")
        .eq("user_id", userId),
  )

  return contarDiasNoTeto(attempts, limite)
}

export function inicioDoDiaBR(): Date {
  const nowSP = toZonedTime(new Date(), TZ_BR)
  return fromZonedTime(startOfDay(nowSP), TZ_BR)
}

export function hojeStringBR(): string {
  const nowSP = toZonedTime(new Date(), TZ_BR)
  return `${nowSP.getFullYear()}-${String(nowSP.getMonth() + 1).padStart(2, "0")}-${String(nowSP.getDate()).padStart(2, "0")}`
}

export function diaDaSemanaBR(): number {
  const nowSP = toZonedTime(new Date(), TZ_BR)
  return nowSP.getDay()
}
