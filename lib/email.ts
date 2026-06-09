import { Resend } from "resend"
import { logError, logWarning } from "@/lib/logger"
import { APP_URL } from "@/lib/app-url"

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM = "AprovaOAB <oi@aprovaoab.app.br>"

const FEATURES_POR_PLANO: Record<"pro" | "aprovacao", string[]> = {
  pro: [
    "Questões ilimitadas",
    "Simulados completos da OAB (80 questões)",
    "Calendário inteligente de estudos",
  ],
  aprovacao: [
    "Tudo do plano Pro",
    "Análise avançada de desempenho",
    "Suporte prioritário",
  ],
}

export async function sendWelcomeProEmail(opts: {
  toEmail: string
  firstName: string | null
  plano: "pro" | "aprovacao"
}): Promise<void> {
  if (!resend) {
    logWarning("RESEND_API_KEY não configurada, pulando email", {
      area: "email",
      plano: opts.plano,
    })
    return
  }

  const planoLabel = opts.plano === "pro" ? "Pro" : "Aprovação"
  const greeting = opts.firstName ? `Olá, ${opts.firstName}!` : "Olá!"
  const features = FEATURES_POR_PLANO[opts.plano]
  const dashboardUrl = `${APP_URL}/dashboard`

  try {
    await resend.emails.send({
      from: FROM,
      to: opts.toEmail,
      subject: `Bem-vindo ao plano ${planoLabel} do AprovaOAB`,
      html: buildWelcomeHtml({ greeting, planoLabel, features, dashboardUrl }),
    })
  } catch (err) {
    logError(err, { area: "email", phase: "send-welcome-pro", plano: opts.plano })
    // Não propaga — webhook não deve falhar por causa de email
  }
}

export async function sendWelcomeFreeEmail(opts: {
  toEmail: string
  firstName: string | null
}): Promise<void> {
  if (!resend) {
    logWarning("RESEND_API_KEY não configurada, pulando email", {
      area: "email",
      phase: "send-welcome-free",
    })
    return
  }

  const greeting = opts.firstName ? `Olá, ${opts.firstName}!` : "Olá!"
  const dashboardUrl = `${APP_URL}/dashboard`

  try {
    await resend.emails.send({
      from: FROM,
      to: opts.toEmail,
      subject: "Bem-vindo ao AprovaOAB! 🎉",
      html: buildWelcomeFreeHtml({ greeting, dashboardUrl }),
    })
  } catch (err) {
    logError(err, { area: "email", phase: "send-welcome-free" })
    // Não propaga — cadastro não deve falhar por causa de email
  }
}

const FREE_FEATURES = [
  "10 questões comentadas por dia",
  "Treino inteligente focado nas suas dificuldades",
  "Agenda inteligente de estudos personalizada",
]

function buildWelcomeFreeHtml(o: {
  greeting: string
  dashboardUrl: string
}): string {
  const featuresHtml = FREE_FEATURES
    .map((f) => `<li style="margin: 8px 0; color: #1f2937; padding-left: 24px; position: relative;"><span style="position: absolute; left: 0; color: #10b981; font-weight: bold;">✓</span> ${f}</li>`)
    .join("")

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Bem-vindo ao AprovaOAB</title></head>
<body style="margin: 0; padding: 32px 16px; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 40px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <h1 style="margin: 0 0 8px 0; color: #10b981; font-size: 28px; font-weight: 700;">Bem-vindo ao AprovaOAB!</h1>
    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px;">${o.greeting}</p>
    <p style="margin: 0 0 16px 0; color: #1f2937; font-size: 15px; line-height: 1.6;">
      Sua conta está ativa e sua preparação para a OAB começa agora. Já dá pra usar:
    </p>
    <ul style="margin: 0 0 32px 0; padding: 0; list-style: none;">
      ${featuresHtml}
    </ul>
    <a href="${o.dashboardUrl}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
      Ir pro meu painel
    </a>
    <p style="margin: 32px 0 0 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
      Quando quiser questões ilimitadas e simulados completos da OAB (80 questões), conheça os planos
      <strong style="color: #1f2937;">Pro</strong> e <strong style="color: #1f2937;">Aprovação</strong> direto no painel.
    </p>
    <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.5;">
      Bons estudos!<br>
      Time AprovaOAB
    </p>
  </div>
</body>
</html>`
}

// Aviso interno (pra você, não pro usuário): o cron semanal já sincronizou a
// audiência e deixou o rascunho da edição pronto no Resend. Basta revisar o
// conteúdo (notícia/curiosidade) e disparar. Usa a chave send-only (RESEND_API_KEY).
export async function sendNewsletterDraftReadyEmail(opts: {
  numero: number
  subject: string
  sync: { total: number; criados: number; pulados: number }
}): Promise<void> {
  if (!resend) {
    logWarning("RESEND_API_KEY não configurada, pulando aviso da newsletter", {
      area: "email",
      phase: "newsletter-draft-ready",
    })
    return
  }

  const to = process.env.NEWSLETTER_NOTIFY_EMAIL ?? "oi@aprovaoab.app.br"

  try {
    await resend.emails.send({
      from: FROM,
      to,
      subject: `📝 Rascunho da Café com OAB #${opts.numero} pronto pra revisar`,
      html: buildNewsletterDraftReadyHtml(opts),
    })
  } catch (err) {
    logError(err, { area: "email", phase: "newsletter-draft-ready" })
    // Não propaga — o cron não deve falhar por causa do aviso
  }
}

function buildNewsletterDraftReadyHtml(o: {
  numero: number
  subject: string
  sync: { total: number; criados: number; pulados: number }
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Rascunho da newsletter pronto</title></head>
<body style="margin: 0; padding: 32px 16px; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 40px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <h1 style="margin: 0 0 8px 0; color: #0f172a; font-size: 24px; font-weight: 700;">☕ Rascunho da Café com OAB #${o.numero}</h1>
    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 15px; line-height: 1.6;">
      O cron semanal já rodou. A audiência foi sincronizada e o rascunho desta edição está criado no Resend, pronto pra revisão.
    </p>
    <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 14px;"><strong>Assunto:</strong> ${o.subject}</p>
    <p style="margin: 0 0 24px 0; color: #1f2937; font-size: 14px;">
      <strong>Audiência:</strong> ${o.sync.total} usuários (${o.sync.criados} novos, ${o.sync.pulados} já existentes).
    </p>
    <div style="margin: 0 0 24px 0; padding: 16px; background-color: #fffbeb; border-left: 4px solid #c8a04a; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; color: #1f2937; font-size: 14px; line-height: 1.6;">
        ⚠️ Antes de disparar: confira a <strong>notícia</strong> e a <strong>curiosidade</strong> da semana (conteúdo verificado) e a revisão jurídica.
      </p>
    </div>
    <a href="https://resend.com/broadcasts" style="display: inline-block; padding: 12px 24px; background-color: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
      Abrir Broadcasts no Resend
    </a>
    <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.5;">
      No Resend: abra o rascunho → "Send test email" pra você mesmo → revise → Send.
    </p>
  </div>
</body>
</html>`
}

function buildWelcomeHtml(o: {
  greeting: string
  planoLabel: string
  features: string[]
  dashboardUrl: string
}): string {
  const featuresHtml = o.features
    .map((f) => `<li style="margin: 8px 0; color: #1f2937; padding-left: 24px; position: relative;"><span style="position: absolute; left: 0; color: #10b981; font-weight: bold;">✓</span> ${f}</li>`)
    .join("")

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Bem-vindo ao ${o.planoLabel}</title></head>
<body style="margin: 0; padding: 32px 16px; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 40px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <h1 style="margin: 0 0 8px 0; color: #10b981; font-size: 28px; font-weight: 700;">Bem-vindo ao plano ${o.planoLabel}!</h1>
    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px;">${o.greeting}</p>
    <p style="margin: 0 0 16px 0; color: #1f2937; font-size: 15px; line-height: 1.6;">
      Seu pagamento foi confirmado e seu acesso completo já está ativo. Você acabou de desbloquear:
    </p>
    <ul style="margin: 0 0 32px 0; padding: 0; list-style: none;">
      ${featuresHtml}
    </ul>
    <a href="${o.dashboardUrl}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
      Ir pro meu painel
    </a>
    <p style="margin: 32px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.5;">
      Bons estudos!<br>
      Time AprovaOAB
    </p>
  </div>
</body>
</html>`
}
