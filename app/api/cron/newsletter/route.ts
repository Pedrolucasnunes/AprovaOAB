import { NextResponse } from "next/server"
import { CURRENT_EDICAO } from "@/lib/newsletter"
import { syncContactsToAudience, createNewsletterDraft } from "@/lib/services/newsletter"
import { sendNewsletterDraftReadyEmail } from "@/lib/email"
import { logError } from "@/lib/logger"

export const dynamic = "force-dynamic"

// Cron semanal da newsletter (configurado em vercel.json). NÃO dispara o envio —
// só prepara tudo e avisa por email, mantendo o portão humano:
//   1. sincroniza usuários novos na audiência do Resend;
//   2. cria o RASCUNHO da edição atual (CURRENT_EDICAO);
//   3. manda um email de aviso pra revisar e disparar manualmente.
//
// Protegido por CRON_SECRET: a Vercel envia "Authorization: Bearer <CRON_SECRET>"
// automaticamente quando a env var existe. Sem o header certo → 401.
async function handle(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const apiKey = process.env.RESEND_FULL_API_KEY
  const audienceId = process.env.RESEND_AUDIENCE_ID
  if (!apiKey) return NextResponse.json({ error: "RESEND_FULL_API_KEY não configurada" }, { status: 500 })
  if (!audienceId) return NextResponse.json({ error: "RESEND_AUDIENCE_ID não configurada" }, { status: 500 })

  try {
    const sync = await syncContactsToAudience(apiKey, audienceId)
    const broadcastId = await createNewsletterDraft(apiKey, audienceId, CURRENT_EDICAO)

    await sendNewsletterDraftReadyEmail({
      numero: CURRENT_EDICAO.numero,
      subject: CURRENT_EDICAO.subject,
      sync,
    })

    return NextResponse.json({ ok: true, sync, broadcastId, enviado: false })
  } catch (err) {
    logError(err, { area: "newsletter", phase: "cron" })
    return NextResponse.json({ error: "Falha no cron da newsletter" }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
