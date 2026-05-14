import type { SupabaseClient } from "@supabase/supabase-js"
import { startOfDay } from "date-fns"
import { toZonedTime, fromZonedTime } from "date-fns-tz"

const TZ_BR = "America/Sao_Paulo"
const FREE_DAILY_LIMIT = 10

export interface DailyLimitResult {
  exceeded: boolean
  count: number
  limit: number
}

export async function checkDailyLimit(
  supabase: SupabaseClient,
  userId: string,
  plano: "free" | "pro" | "aprovacao",
): Promise<DailyLimitResult> {
  if (plano !== "free") {
    return { exceeded: false, count: 0, limit: Infinity }
  }

  const nowSP = toZonedTime(new Date(), TZ_BR)
  const inicioDoDiaSP = startOfDay(nowSP)
  const inicioDoDiaUTC = fromZonedTime(inicioDoDiaSP, TZ_BR)

  const { count } = await supabase
    .from("question_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_diagnostic", false)
    .gte("created_at", inicioDoDiaUTC.toISOString())

  const c = count ?? 0
  return { exceeded: c >= FREE_DAILY_LIMIT, count: c, limit: FREE_DAILY_LIMIT }
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
