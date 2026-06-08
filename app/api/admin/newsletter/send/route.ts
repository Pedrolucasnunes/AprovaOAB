import { NextResponse } from "next/server"
import { Resend } from "resend"
import { requireAdmin } from "@/lib/auth-server"
import { buildNewsletterHtml, EDICAO_1, type NewsletterEdicao } from "@/lib/newsletter"
import { logError } from "@/lib/logger"

const FROM = "Café com OAB <oi@aprovaoab.app.br>"

// Cria um broadcast da newsletter no Resend a partir de uma edição.
// Por padrão cria como RASCUNHO (você revisa e dispara no painel do Resend).
// Use ?send=true para disparar imediatamente pra audiência.
//
// Body opcional: uma NewsletterEdicao para sobrescrever a edição padrão.
// Requer: RESEND_API_KEY e RESEND_AUDIENCE_ID no ambiente.
// POST /api/admin/newsletter/send[?send=true]  (somente admin)
export async function POST(req: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const apiKey = process.env.RESEND_API_KEY
  const audienceId = process.env.RESEND_AUDIENCE_ID
  if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY não configurada" }, { status: 500 })
  if (!audienceId) return NextResponse.json({ error: "RESEND_AUDIENCE_ID não configurada" }, { status: 500 })

  let edicao: NewsletterEdicao = EDICAO_1
  try {
    const body = await req.json().catch(() => null)
    if (body && typeof body === "object" && "questao" in body) edicao = body as NewsletterEdicao
  } catch {
    // sem body → usa a edição padrão
  }

  const enviarAgora = new URL(req.url).searchParams.get("send") === "true"
  const resend = new Resend(apiKey)

  try {
    const created = await resend.broadcasts.create({
      audienceId,
      from: FROM,
      subject: edicao.subject,
      name: `Café com OAB #${edicao.numero}`,
      previewText: edicao.preheader,
      html: buildNewsletterHtml(edicao),
    })
    if (created.error || !created.data) {
      logError(created.error, { area: "newsletter", phase: "broadcast-create" })
      return NextResponse.json({ error: "Falha ao criar o broadcast" }, { status: 502 })
    }

    const broadcastId = created.data.id

    if (enviarAgora) {
      const sent = await resend.broadcasts.send(broadcastId)
      if (sent.error) {
        logError(sent.error, { area: "newsletter", phase: "broadcast-send", broadcastId })
        return NextResponse.json({ error: "Broadcast criado, mas falhou ao enviar", broadcastId }, { status: 502 })
      }
      return NextResponse.json({ ok: true, enviado: true, broadcastId })
    }

    return NextResponse.json({
      ok: true,
      enviado: false,
      broadcastId,
      mensagem: "Rascunho criado. Revise e dispare no painel do Resend (Broadcasts).",
    })
  } catch (err) {
    logError(err, { area: "newsletter", phase: "broadcast" })
    return NextResponse.json({ error: "Falha ao montar a newsletter" }, { status: 500 })
  }
}
