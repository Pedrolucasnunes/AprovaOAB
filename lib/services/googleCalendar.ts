import type { SupabaseClient } from "@supabase/supabase-js"
import { encrypt, decrypt } from "@/lib/crypto"

const GOOGLE_AUTH_URL   = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_URL  = "https://oauth2.googleapis.com/token"
const GOOGLE_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events"

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID!,
    redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`,
    response_type: "code",
    scope:         "https://www.googleapis.com/auth/calendar.events",
    access_type:   "offline",
    prompt:        "consent",
    state,
  })
  return `${GOOGLE_AUTH_URL}?${params}`
}

export async function exchangeCodeForTokens(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  `${process.env.NEXT_PUBLIC_APP_URL}/api/google-calendar/callback`,
      grant_type:    "authorization_code",
    }),
  })
  if (!res.ok) throw new Error("Falha ao trocar código por tokens")
  return res.json()
}

async function refreshToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method:  "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type:    "refresh_token",
    }),
  })
  if (!res.ok) throw new Error("Falha ao renovar token")
  return res.json()
}

export async function getValidAccessToken(
  userId: string,
  supabase: SupabaseClient
): Promise<string | null> {
  const { data } = await supabase
    .from("google_calendar_tokens")
    .select("access_token, refresh_token, expires_at")
    .eq("user_id", userId)
    .single()

  if (!data) return null

  const expiresAt = new Date(data.expires_at)
  const isExpiringSoon = expiresAt.getTime() - Date.now() < 5 * 60 * 1000

  if (!isExpiringSoon) {
    return decrypt(data.access_token).catch(() => null)
  }

  try {
    const plainRefresh = await decrypt(data.refresh_token)
    const refreshed = await refreshToken(plainRefresh)
    const encryptedAccess = await encrypt(refreshed.access_token)
    await supabase
      .from("google_calendar_tokens")
      .update({
        access_token: encryptedAccess,
        expires_at:   new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      })
      .eq("user_id", userId)
    return refreshed.access_token
  } catch {
    return null
  }
}

const EVENT_DURATION: Record<string, number> = {
  study:    90,
  simulado: 240,
  revisao:  60,
  prova:    180,
}

export async function createGoogleEvent(
  accessToken: string,
  event: { title: string; date: string; time: string; type: string; description?: string | null }
): Promise<string | null> {
  const [y, mo, d] = event.date.split("-").map(Number)
  const [h, mi]    = event.time.split(":").map(Number)
  const durationMs = (EVENT_DURATION[event.type] ?? 90) * 60_000

  const start = new Date(y, mo - 1, d, h, mi)
  const end   = new Date(start.getTime() + durationMs)

  const toIso = (dt: Date) => dt.toISOString()

  const res = await fetch(GOOGLE_EVENTS_URL, {
    method:  "POST",
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      summary:     event.title,
      description: event.description ?? undefined,
      start: { dateTime: toIso(start), timeZone: "America/Sao_Paulo" },
      end:   { dateTime: toIso(end),   timeZone: "America/Sao_Paulo" },
    }),
  })

  if (!res.ok) return null
  const data = await res.json()
  return data.id ?? null
}

export async function deleteGoogleEvent(accessToken: string, eventId: string): Promise<void> {
  await fetch(`${GOOGLE_EVENTS_URL}/${eventId}`, {
    method:  "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
