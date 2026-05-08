import { NextRequest, NextResponse } from "next/server"
import { rateLimit, hashEmail } from "@/lib/rate-limit"

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_ACTIONS = new Set(["reset", "resend"])

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const { action, email } = body

  if (
    typeof action !== "string" ||
    !VALID_ACTIONS.has(action) ||
    typeof email !== "string" ||
    !EMAIL_REGEX.test(email) ||
    email.length > 254
  ) {
    return NextResponse.json({ ok: true })
  }

  const { success } = await rateLimit(req, `auth-${action}`, 3, 300, hashEmail(email))
  if (!success) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429 },
    )
  }

  return NextResponse.json({ ok: true })
}
