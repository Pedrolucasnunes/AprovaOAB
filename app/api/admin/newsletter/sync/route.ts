import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-server"
import { syncContactsToAudience } from "@/lib/services/newsletter"
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

  try {
    const { total, criados, jaExistiam, erros } = await syncContactsToAudience(apiKey, audienceId)
    return NextResponse.json({ ok: true, total, criados, jaExistiam, erros })
  } catch (err) {
    logError(err, { area: "newsletter", phase: "sync-contacts" })
    return NextResponse.json({ error: "Falha ao sincronizar contatos" }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
