import { Resend } from "resend"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { buildNewsletterHtml, type NewsletterEdicao } from "@/lib/newsletter"
import { logError } from "@/lib/logger"

// Orquestração da newsletter "Café com OAB" no Resend. Centraliza a lógica usada
// tanto pelas rotas admin (sync/send) quanto pelo cron semanal, pra não duplicar.
// Tudo aqui exige a chave Full access (RESEND_FULL_API_KEY) — audiência/broadcast
// não funcionam com a chave send-only.

const FROM = "Café com OAB <oi@aprovaoab.app.br>"

export type SyncResult = { total: number; criados: number; pulados: number }

// Joga todos os usuários do Supabase Auth na audiência do Resend. Idempotente:
// contatos já existentes voltam como erro do Resend e contam como "pulados".
export async function syncContactsToAudience(
  apiKey: string,
  audienceId: string,
): Promise<SyncResult> {
  const resend = new Resend(apiKey)
  let criados = 0
  let pulados = 0
  let total = 0

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
      if (res.error) pulados++
      else criados++
    }

    if (users.length < perPage) break
  }

  return { total, criados, pulados }
}

// Cria o broadcast da edição como RASCUNHO e devolve o id. Lança em caso de falha.
export async function createNewsletterDraft(
  apiKey: string,
  audienceId: string,
  edicao: NewsletterEdicao,
): Promise<string> {
  const resend = new Resend(apiKey)
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
    throw new Error("Falha ao criar o broadcast")
  }
  return created.data.id
}

// Dispara um broadcast já criado pra audiência inteira. Lança em caso de falha.
export async function sendBroadcast(apiKey: string, broadcastId: string): Promise<void> {
  const resend = new Resend(apiKey)
  const sent = await resend.broadcasts.send(broadcastId)
  if (sent.error) {
    logError(sent.error, { area: "newsletter", phase: "broadcast-send", broadcastId })
    throw new Error("Falha ao enviar o broadcast")
  }
}
