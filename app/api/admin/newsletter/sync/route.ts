import { NextResponse } from "next/server"
import { Resend } from "resend"
import { requireAdmin } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { logError } from "@/lib/logger"

// Sincroniza os usuários cadastrados (Supabase Auth) com a audiência do Resend.
// Idempotente: rodar de novo só adiciona quem é novo. Descadastros feitos pelo
// usuário NÃO são revertidos (não reescrevemos contatos já existentes).
//
// Requer: RESEND_FULL_API_KEY (chave Full access, separada da de envio) e
// RESEND_AUDIENCE_ID no ambiente.
// Aceita GET (abrir a URL no navegador, logado como admin) ou POST.
// /api/admin/newsletter/sync  (somente admin)
async function handle() {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const apiKey = process.env.RESEND_FULL_API_KEY
  const audienceId = process.env.RESEND_AUDIENCE_ID
  if (!apiKey) return NextResponse.json({ error: "RESEND_FULL_API_KEY não configurada" }, { status: 500 })
  if (!audienceId) return NextResponse.json({ error: "RESEND_AUDIENCE_ID não configurada" }, { status: 500 })

  const resend = new Resend(apiKey)
  let criados = 0
  let pulados = 0
  let total = 0

  try {
    const perPage = 1000
    for (let page = 1; ; page++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
      if (error) throw error
      const users = data.users
      if (users.length === 0) break

      for (const u of users) {
        if (!u.email) continue
        total++
        const fullName = (u.user_metadata?.full_name as string | undefined) ?? ""
        const firstName = fullName.trim().split(/\s+/)[0] || undefined

        const res = await resend.contacts.create({
          audienceId,
          email: u.email,
          firstName,
          unsubscribed: false,
        })
        // Resend devolve erro quando o contato já existe — tratamos como "pulado".
        if (res.error) pulados++
        else criados++
      }

      if (users.length < perPage) break
    }
  } catch (err) {
    logError(err, { area: "newsletter", phase: "sync-contacts" })
    return NextResponse.json({ error: "Falha ao sincronizar contatos" }, { status: 500 })
  }

  return NextResponse.json({ ok: true, total, criados, pulados })
}

export const GET = handle
export const POST = handle
