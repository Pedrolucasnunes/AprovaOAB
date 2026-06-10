import { NextResponse } from "next/server"
import { Resend } from "resend"
import { requireAdmin } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { buildNewsletterHtml, CURRENT_EDICAO } from "@/lib/newsletter"
import { logError } from "@/lib/logger"

const FROM = "Café com OAB <oi@aprovaoab.app.br>"
const UNSUB_MAILTO = "mailto:oi@aprovaoab.app.br?subject=Descadastrar%20da%20newsletter"

// Envio DIRECIONADO da edição atual pra endereços específicos — pra quando entram
// usuários novos depois que o broadcast da edição já foi disparado pra audiência.
// NÃO usa Broadcast (que iria pra audiência inteira e duplicaria pros antigos):
// manda um email real por destinatário via RESEND_API_KEY (send-only), com o
// primeiro nome correto de cada um e um descadastro funcional (mailto + header
// List-Unsubscribe, que o Gmail/Outlook expõem como botão nativo).
//
// Aceita GET (abrir a URL logado como admin) ou POST.
// ?to=a@x.com,b@y.com   → destinatários, separados por vírgula (obrigatório)
// /api/admin/newsletter/enviar  (somente admin)

async function parseRecipients(req: Request): Promise<string[]> {
  const url = new URL(req.url)
  const fromQuery = url.searchParams.get("to") ?? ""
  let raw = fromQuery
  if (!raw && req.method === "POST") {
    const body = await req.json().catch(() => null)
    if (body && typeof body.to === "string") raw = body.to
    else if (body && Array.isArray(body.to)) raw = body.to.join(",")
  }
  return raw
    .split(/[,\s;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"))
}

// Monta um mapa email → primeiro nome a partir do Supabase Auth.
async function buildNameMap(emails: string[]): Promise<Map<string, string>> {
  const wanted = new Set(emails)
  const map = new Map<string, string>()
  const perPage = 1000
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const users = data.users
    if (users.length === 0) break
    for (const u of users) {
      const email = u.email?.toLowerCase()
      if (!email || !wanted.has(email)) continue
      const fullName = (u.user_metadata?.full_name as string | undefined) ?? ""
      const firstName = fullName.trim().split(/\s+/)[0]
      if (firstName) map.set(email, firstName)
    }
    if (users.length < perPage) break
  }
  return map
}

async function handle(req: Request) {
  const { error: authError } = await requireAdmin()
  if (authError) return authError

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return NextResponse.json({ error: "RESEND_API_KEY não configurada" }, { status: 500 })

  const recipients = await parseRecipients(req)
  if (recipients.length === 0) {
    return NextResponse.json({ error: "Informe ?to=email1,email2 com os destinatários" }, { status: 400 })
  }

  const nameMap = await buildNameMap(recipients)
  const resend = new Resend(apiKey)

  const resultados: { to: string; ok: boolean; emailId?: string; erro?: string }[] = []
  for (const to of recipients) {
    const firstName = nameMap.get(to) || "futuro(a) advogado(a)"
    const html = buildNewsletterHtml(CURRENT_EDICAO)
      .replace(/\{\{\{FIRST_NAME\|[^}]*\}\}\}/g, firstName)
      .replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, UNSUB_MAILTO)

    try {
      const res = await resend.emails.send({
        from: FROM,
        to,
        subject: CURRENT_EDICAO.subject,
        html,
        headers: { "List-Unsubscribe": `<${UNSUB_MAILTO}>` },
      })
      if (res.error) {
        logError(res.error, { area: "newsletter", phase: "enviar-individual", to })
        resultados.push({ to, ok: false, erro: res.error.message })
      } else {
        resultados.push({ to, ok: true, emailId: res.data?.id })
      }
    } catch (err) {
      logError(err, { area: "newsletter", phase: "enviar-individual", to })
      resultados.push({ to, ok: false, erro: "Falha ao enviar" })
    }
  }

  const enviados = resultados.filter((r) => r.ok).length
  return NextResponse.json({
    ok: enviados > 0,
    edicao: CURRENT_EDICAO.numero,
    enviados,
    falhas: resultados.length - enviados,
    resultados,
  })
}

export const GET = handle
export const POST = handle
