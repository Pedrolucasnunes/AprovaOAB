import { Resend } from "resend"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { buildNewsletterHtml, type NewsletterEdicao } from "@/lib/newsletter"
import { logError } from "@/lib/logger"

// Orquestração da newsletter "Café com OAB" no Resend. Centraliza a lógica usada
// tanto pelas rotas admin (sync/send) quanto pelo cron semanal, pra não duplicar.
// Tudo aqui exige a chave Full access (RESEND_FULL_API_KEY) — audiência/broadcast
// não funcionam com a chave send-only.

const FROM = "Café com OAB <oi@aprovaoab.app.br>"

export type SyncResult = { total: number; criados: number; jaExistiam: number; erros: number }

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// Joga os usuários do Supabase Auth na audiência do Resend.
//
// O contacts.create do Resend é idempotente (recriar quem já existe devolve
// sucesso), mas a API cobra um rate limit de ~2 req/s. Chamar create pra TODO
// mundo a cada sync estoura esse limite em massa: as chamadas tomam 429 e usuários
// novos ficam de fora silenciosamente (foi o bug que deixou 9 usuários sem entrar).
//
// Correção: listar quem já está na audiência e só criar quem falta — com pausa
// entre as criações e retry com backoff, pra ninguém ficar de fora sem registro.
export async function syncContactsToAudience(
  apiKey: string,
  audienceId: string,
): Promise<SyncResult> {
  const resend = new Resend(apiKey)

  const existentes = new Set<string>()
  const listed = await resend.contacts.list({ audienceId })
  for (const c of listed.data?.data ?? []) {
    if (c.email) existentes.add(c.email.toLowerCase())
  }

  let total = 0
  let criados = 0
  let jaExistiam = 0
  let erros = 0

  const perPage = 1000
  for (let page = 1; ; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage })
    if (error) throw error
    const users = data.users
    if (users.length === 0) break

    for (const u of users) {
      if (!u.email) continue
      total++
      if (existentes.has(u.email.toLowerCase())) {
        jaExistiam++
        continue
      }

      const fullName = (u.user_metadata?.full_name as string | undefined) ?? ""
      const firstName = fullName.trim().split(/\s+/)[0] || undefined

      let ok = false
      for (let tentativa = 1; tentativa <= 3 && !ok; tentativa++) {
        const res = await resend.contacts.create({
          audienceId,
          email: u.email,
          firstName,
          unsubscribed: false,
        })
        if (!res.error) {
          ok = true
          break
        }
        await sleep(1500 * tentativa) // backoff progressivo em 429/erro transitório
      }

      if (ok) {
        criados++
      } else {
        erros++
        logError(new Error("Falha ao criar contato na audiência após retries"), {
          area: "newsletter", phase: "sync-contact", email: u.email,
        })
      }

      await sleep(600) // throttle entre criações reais (~1.5 req/s, abaixo do limite)
    }

    if (users.length < perPage) break
  }

  return { total, criados, jaExistiam, erros }
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
    // Broadcast oficial sai terça de manhã (ver memória), então fixa "Bom dia"
    // independentemente de quando o rascunho foi gerado pelo cron.
    html: buildNewsletterHtml(edicao, { greeting: "Bom dia" }),
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
