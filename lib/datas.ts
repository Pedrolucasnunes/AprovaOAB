// Fonte única de data/timezone da aplicação.
//
// Contexto (verificado no banco em jul/2026): as colunas `created_at` do schema
// público são `timestamp WITHOUT time zone` gravando hora UTC, e o PostgREST
// devolve a string SEM offset (ex.: "2026-06-18T22:22:34.677157"). Se essa
// string cair num `new Date()` cru, o JS interpreta como hora LOCAL — no
// navegador em Brasília isso mostra a hora UTC como se fosse local (3h
// adiantada); no servidor depende do fuso da máquina. Todo parse de data vinda
// do banco deve passar por `parseDbDate`. Strings da Auth API já vêm com "Z" e
// passam intactas.

export const TZ_BRASIL = "America/Sao_Paulo"

/** Termina em "Z" ou offset explícito (+03:00, -0300)? */
const TEM_OFFSET = /(?:Z|[+-]\d{2}:?\d{2})$/

/** Converte string de data do banco/Auth em Date correto (naive = UTC). */
export function parseDbDate(iso: string): Date {
  return new Date(TEM_OFFSET.test(iso) ? iso : `${iso}Z`)
}

/** "04 de jul., 20:02" no fuso de Brasília. */
export function formatarDataHoraBrasil(iso: string): string {
  return parseDbDate(iso).toLocaleString("pt-BR", {
    timeZone: TZ_BRASIL,
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/** "04 de jul. de 2026" no fuso de Brasília. */
export function formatarDataBrasil(iso: string): string {
  return parseDbDate(iso).toLocaleDateString("pt-BR", {
    timeZone: TZ_BRASIL,
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

// en-CA formata como YYYY-MM-DD — chave estável de bucket por dia.
const YMD_BRASIL = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ_BRASIL,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** "YYYY-MM-DD" do instante no fuso de Brasília. */
export function ymdBrasil(d: Date): string {
  return YMD_BRASIL.format(d)
}

const HORA_BRASIL = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ_BRASIL,
  hour: "numeric",
  hourCycle: "h23",
})

/** Hora 0–23 do instante no fuso de Brasília. */
export function horaBrasil(d: Date): number {
  return Number(HORA_BRASIL.format(d))
}

/** "há 5 min", "há 3h", "há 2d", "há 4 meses"… (diff de instantes; tz-agnóstico) */
export function tempoRelativo(iso: string): string {
  const diff = Date.now() - parseDbDate(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "agora"
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `há ${d}d`
  const meses = Math.floor(d / 30)
  if (meses < 12) return `há ${meses} ${meses === 1 ? "mês" : "meses"}`
  const anos = Math.floor(d / 365)
  return `há ${anos} ${anos === 1 ? "ano" : "anos"}`
}

/**
 * Instante (Date) da meia-noite de hoje em Brasília.
 * O Brasil não tem mais horário de verão (abolido em 2019), então o offset da
 * meia-noite corrente vale para o próprio dia.
 */
export function inicioDoDiaBrasil(agora: Date = new Date()): Date {
  const ymd = ymdBrasil(agora) // dia corrente em SP
  // Meia-noite em SP = 03:00 UTC do mesmo dia (offset fixo -03:00).
  return new Date(`${ymd}T03:00:00.000Z`)
}
