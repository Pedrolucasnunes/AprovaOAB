import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getGoogleAuthUrl } from "@/lib/services/googleCalendar"
import { requireUser } from "@/lib/auth-server"

export async function GET() {
  const { error } = await requireUser()
  if (error) return error

  const state = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set("google_oauth_state", state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "lax",
    path:     "/",
    maxAge:   600,
  })

  return NextResponse.redirect(getGoogleAuthUrl(state))
}
