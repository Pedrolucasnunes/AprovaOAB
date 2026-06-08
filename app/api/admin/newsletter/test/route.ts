import { NextResponse } from "next/server"
import { Resend } from "resend"
import { requireAdmin } from "@/lib/auth-server"
import { buildNewsletterHtml, EDICAO_1 } from "@/lib/newsletter"
import { logError } from "@/lib/logger"

const FROM = "Café com OAB <oi@aprovaoab.app.br>"

// Envia uma edição de TESTE pro próprio admin (ou ?to=email).
// Não usa audiência nem broadcast — serve só pra ver como fica na caixa de entrada.
// Os merge tags do broadcast ({{{FIRST_NAME}}}, {{{RESEND_UNSUBSCRIBE_URL}}}) são
// substituídos por valores de exemplo, já que só o Broadcast os resolve de verdade.
//
// Aceita GET (abrir a URL no navegador, logado como admin) ou POST.
// ?to=email      → destinatário (padrão: email do admin logado)
// ?banner=url    → URL pública do banner (útil em teste local, onde /public não é acessível)
// /api/admin/newsletter/test  (somente admin)

async function handle(req: Request) {
  const { user, error: authError } = await requireAdmin()
  if (authError) return authError

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY não configurada" }, { status: 500 })

  const url = new URL(req.url)
  const to = url.searchParams.get("to") || user.email
  const bannerUrl = url.searchParams.get("banner") || undefined
  if (!to) return NextResponse.json({ error: "Sem email de destino" }, { status: 400 })

  const firstName = (user.user_metadata?.full_name as string | undefined)?.trim().split(/\s+/)[0] || "Pedro"

  const html = buildNewsletterHtml(EDICAO_1, { bannerUrl })
    .replace(/\{\{\{FIRST_NAME\|[^}]*\}\}\}/g, firstName)
    .replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, "#")

  const resend = new Resend(apiKey)
  try {
    const res = await resend.emails.send({
      from: FROM,
      to,
      subject: `[TESTE] ${EDICAO_1.subject}`,
      html,
    })
    if (res.error) {
      logError(res.error, { area: "newsletter", phase: "test-send" })
      return NextResponse.json({ error: "Falha ao enviar o teste", detalhe: res.error.message }, { status: 502 })
    }
    return NextResponse.json({ ok: true, to, emailId: res.data?.id, mensagem: `Teste enviado para ${to}. Confira sua caixa de entrada.` })
  } catch (err) {
    logError(err, { area: "newsletter", phase: "test-send" })
    return NextResponse.json({ error: "Falha ao enviar o teste" }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
