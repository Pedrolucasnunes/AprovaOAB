import { NextResponse } from "next/server"
import { Resend } from "resend"
import { requireAdmin } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { buildNewsletterHtml, CURRENT_EDICAO } from "@/lib/newsletter"
import { urlDescadastro } from "@/lib/email-optout"
import { logError } from "@/lib/logger"

const FROM = "Café com OAB <oi@aprovaoab.app.br>"

// Envio DIRECIONADO da edição atual pra endereços específicos — pra quando entram
// usuários novos depois que o broadcast da edição já foi disparado pra audiência.
// NÃO usa Broadcast (que iria pra audiência inteira e duplicaria pros antigos):
// manda um email real por destinatário via RESEND_API_KEY (send-only), com o
// primeiro nome correto de cada um e um descadastro que de fato funciona.
//
// O descadastro era `mailto:oi@aprovaoab.app.br` — e o domínio NÃO TEM MX, então
// quem clicava mandava e-mail pro vazio e continuava recebendo. Agora é uma URL
// assinada (lib/email-optout.ts) nos dois lugares que importam: no corpo e nos
// headers List-Unsubscribe + List-Unsubscribe-Post, que são o que faz o Gmail
// mostrar o botão nativo. Quem já pediu pra sair é pulado aqui, não no Resend.
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

// Monta um mapa email → { id, primeiro nome } a partir do Supabase Auth.
//
// O `id` passou a ser obrigatório: é ele que assina o link de descadastro. Quem
// não tem conta não recebe — ver o comentário do laço de envio.
async function buildRecipientMap(
  emails: string[],
): Promise<Map<string, { id: string; firstName: string | null }>> {
  const wanted = new Set(emails)
  const map = new Map<string, { id: string; firstName: string | null }>()
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
      map.set(email, { id: u.id, firstName: fullName.trim().split(/\s+/)[0] || null })
    }
    if (users.length < perPage) break
  }
  return map
}

/** Ids que pediram pra sair. Uma consulta, não uma por destinatário. */
async function idsQueSairam(ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set()
  const { data, error } = await supabaseAdmin
    .from("users")
    .select("id")
    .in("id", ids)
    .not("email_optout_at", "is", null)
  if (error) throw error
  return new Set((data ?? []).map((r) => r.id as string))
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

  const destinatarios = await buildRecipientMap(recipients)
  const saiu = await idsQueSairam([...destinatarios.values()].map((d) => d.id))
  const resend = new Resend(apiKey)

  const resultados: { to: string; ok: boolean; emailId?: string; erro?: string }[] = []
  for (const to of recipients) {
    const conta = destinatarios.get(to)

    // Sem conta = sem id = sem link de descadastro assinado. Não mandar é a
    // decisão certa: e-mail em massa sem saída funcional é o que faz a pessoa
    // usar o botão de spam, e a reputação queimada leva junto o OTP e a
    // cobrança, que não têm substituto.
    if (!conta) {
      resultados.push({ to, ok: false, erro: "sem conta no Auth — descadastro não pode ser assinado" })
      continue
    }
    if (saiu.has(conta.id)) {
      resultados.push({ to, ok: false, erro: "pediu pra sair (email_optout_at)" })
      continue
    }

    const unsubUrl = urlDescadastro(conta.id)
    const html = buildNewsletterHtml(CURRENT_EDICAO)
      .replace(/\{\{\{FIRST_NAME\|[^}]*\}\}\}/g, conta.firstName || "futuro(a) advogado(a)")
      .replace(/\{\{\{RESEND_UNSUBSCRIBE_URL\}\}\}/g, unsubUrl)

    try {
      const res = await resend.emails.send({
        from: FROM,
        to,
        subject: CURRENT_EDICAO.subject,
        html,
        headers: {
          // Os dois juntos são o que faz o Gmail/Yahoo mostrarem o botão nativo
          // "Cancelar inscrição" e mandarem POST direto (RFC 8058), sem abrir
          // navegador. Sem o `-Post`, o cliente trata o link como visita comum.
          "List-Unsubscribe": `<${unsubUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
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
