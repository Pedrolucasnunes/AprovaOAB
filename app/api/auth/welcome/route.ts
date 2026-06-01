import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { sendWelcomeFreeEmail } from "@/lib/email"
import { logWarning } from "@/lib/logger"

export async function POST(req: NextRequest) {
  // Autentica pelo token explícito (mais robusto que depender do cookie logo
  // após o verifyOtp); cai pro cookie via requireUser() como fallback.
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null

  let user
  if (token) {
    const { data, error } = await supabaseAdmin.auth.getUser(token)
    if (error || !data.user) {
      logWarning("token inválido, pulando email de boas-vindas", { area: "auth-welcome" })
      return NextResponse.json({ ok: true })
    }
    user = data.user
  } else {
    const res = await requireUser()
    if (res.error) {
      logWarning("sem sessão, pulando email de boas-vindas", { area: "auth-welcome" })
      return NextResponse.json({ ok: true })
    }
    user = res.user
  }

  // Idempotência: só envia uma vez por usuário
  if (user.user_metadata?.welcome_email_sent) {
    return NextResponse.json({ ok: true })
  }

  const email = user.email
  if (!email) {
    logWarning("usuário sem email, pulando boas-vindas", { area: "auth-welcome", userId: user.id })
    return NextResponse.json({ ok: true })
  }

  const fullName = user.user_metadata?.full_name as string | undefined
  const firstName = fullName ? fullName.split(" ")[0] : null

  await sendWelcomeFreeEmail({ toEmail: email, firstName })

  // updateUserById faz merge do user_metadata — não sobrescreve outras chaves
  await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: { welcome_email_sent: true },
  })

  return NextResponse.json({ ok: true })
}
