import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { sendWelcomeFreeEmail } from "@/lib/email"

export async function POST() {
  const { user, error } = await requireUser()
  if (error) return error

  // Idempotência: só envia uma vez por usuário
  if (user.user_metadata?.welcome_email_sent) {
    return NextResponse.json({ ok: true })
  }

  const email = user.email
  if (!email) {
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
