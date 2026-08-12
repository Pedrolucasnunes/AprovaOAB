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

// Cobrança recusada (Stripe invoice.payment_failed). Aviso PROATIVO de recuperação:
// o aluno segue com acesso Pro durante a janela de retentativas do Stripe (~2-3 sem),
// mas pode nunca ver o banner do dashboard se não logar. A maioria das falhas é
// recuperável (cartão vencido/sem saldo) → este e-mail é o que de fato recupera receita.
export async function sendPaymentFailedEmail(opts: {
  toEmail: string
  firstName: string | null
}): Promise<void> {
  if (!resend) {
    logWarning("RESEND_API_KEY não configurada, pulando email", {
      area: "email",
      phase: "send-payment-failed",
    })
    return
  }

  const greeting = opts.firstName ? `Olá, ${opts.firstName}!` : "Olá!"
  // Mesmo destino do banner: a sessão do portal exige auth, então mandamos pro
  // perfil, onde o botão "Gerenciar assinatura" abre o portal do Stripe.
  const billingUrl = `${APP_URL}/dashboard/perfil`

  try {
    await resend.emails.send({
      from: FROM,
      to: opts.toEmail,
      subject: "Sua cobrança no AprovaOAB falhou — atualize seu cartão",
      html: buildPaymentFailedHtml({ greeting, billingUrl }),
    })
  } catch (err) {
    logError(err, { area: "email", phase: "send-payment-failed" })
    // Não propaga — webhook não deve falhar por causa de email
  }
}

/**
 * Aviso de que o acesso pago acabou, depois de a Stripe esgotar as retentativas.
 *
 * Existe porque o `sendPaymentFailedEmail` só dispara na PRIMEIRA tentativa, e o
 * banner do painel só alcança quem entra no app. Verificado em 12/ago/2026: a
 * primeira aluna a passar por isso não tinha logado havia três semanas quando a
 * cobrança começou a falhar — ou seja, o único aviso saiu semanas antes de o
 * acesso cair, e no dia em que caiu, ninguém falou nada.
 *
 * Quem chamar precisa garantir que a perda foi por PAGAMENTO (ver o webhook):
 * mandar "seu acesso terminou" pra quem clicou em cancelar é dar notícia velha
 * com cara de cobrança.
 */
export async function sendSubscriptionEndedEmail(opts: {
  toEmail: string
  firstName: string | null
}): Promise<void> {
  if (!resend) {
    logWarning("RESEND_API_KEY não configurada, pulando email", {
      area: "email",
      phase: "send-subscription-ended",
    })
    return
  }

  const greeting = opts.firstName ? `Olá, ${opts.firstName}!` : "Olá!"

  try {
    await resend.emails.send({
      from: FROM,
      to: opts.toEmail,
      subject: "Seu acesso Pro terminou — sua conta continua no plano grátis",
      html: buildSubscriptionEndedHtml({
        greeting,
        dashboardUrl: `${APP_URL}/dashboard`,
        planosUrl: `${APP_URL}/#planos`,
      }),
    })
  } catch (err) {
    logError(err, { area: "email", phase: "send-subscription-ended" })
    // Não propaga — webhook não deve falhar por causa de email
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

function buildPaymentFailedHtml(o: {
  greeting: string
  billingUrl: string
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Sua cobrança falhou</title></head>
<body style="margin: 0; padding: 32px 16px; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 40px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <h1 style="margin: 0 0 8px 0; color: #b45309; font-size: 24px; font-weight: 700;">Sua última cobrança falhou</h1>
    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px;">${o.greeting}</p>
    <p style="margin: 0 0 16px 0; color: #1f2937; font-size: 15px; line-height: 1.6;">
      Não conseguimos renovar sua assinatura do <strong style="color: #1f2937;">AprovaOAB</strong> —
      normalmente é cartão vencido ou sem saldo no momento da cobrança.
    </p>
    <div style="margin: 0 0 28px 0; padding: 16px; background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 8px 8px 0;">
      <p style="margin: 0; color: #1f2937; font-size: 14px; line-height: 1.6;">
        Seu acesso Pro <strong>continua ativo</strong> e vamos tentar cobrar de novo nos próximos dias.
        Atualize seu cartão pra não perder o acesso.
      </p>
    </div>
    <a href="${o.billingUrl}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
      Atualizar forma de pagamento
    </a>
    <p style="margin: 32px 0 0 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
      Já atualizou ou pagou? Pode ignorar este aviso — a próxima tentativa deve passar normalmente.
    </p>
    <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.5;">
      Time AprovaOAB
    </p>
  </div>
</body>
</html>`
}

// O tom aqui é o da parede do limite diário: o caminho gratuito aparece PRIMEIRO
// e por inteiro, e a volta pro Pro vem depois, como opção. Quem perdeu o acesso
// por cartão recusado quase nunca decidiu sair — tratar como churn e fechar a
// porta com um "assine de novo" seria ler errado o que aconteceu. Também não
// citamos preço, pela mesma razão do resto do produto: ele muda, e o e-mail fica.
function buildSubscriptionEndedHtml(o: {
  greeting: string
  dashboardUrl: string
  planosUrl: string
}): string {
  const featuresHtml = FREE_FEATURES
    .map((f) => `<li style="margin: 8px 0; color: #1f2937; padding-left: 24px; position: relative;"><span style="position: absolute; left: 0; color: #10b981; font-weight: bold;">✓</span> ${f}</li>`)
    .join("")

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Seu acesso Pro terminou</title></head>
<body style="margin: 0; padding: 32px 16px; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 40px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <h1 style="margin: 0 0 8px 0; color: #1f2937; font-size: 24px; font-weight: 700;">Seu acesso Pro terminou</h1>
    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px;">${o.greeting}</p>
    <p style="margin: 0 0 16px 0; color: #1f2937; font-size: 15px; line-height: 1.6;">
      Não conseguimos renovar sua assinatura depois de algumas tentativas, então ela foi encerrada.
      Nada de errado com sua conta — quase sempre é cartão vencido ou banco bloqueando cobrança recorrente.
    </p>
    <div style="margin: 0 0 28px 0; padding: 16px; background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 8px 0; color: #1f2937; font-size: 14px; line-height: 1.6;">
        <strong>Sua conta continua funcionando</strong>, agora no plano grátis:
      </p>
      <ul style="margin: 0; padding: 0; list-style: none;">
        ${featuresHtml}
      </ul>
    </div>
    <p style="margin: 0 0 28px 0; color: #1f2937; font-size: 15px; line-height: 1.6;">
      Seu histórico, seu diagnóstico e todo o seu progresso continuam salvos — nada foi apagado.
    </p>
    <a href="${o.dashboardUrl}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
      Continuar estudando
    </a>
    <p style="margin: 32px 0 0 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
      Quando quiser as questões ilimitadas e os simulados completos de volta,
      <a href="${o.planosUrl}" style="color: #10b981; font-weight: 600;">é só reativar o Pro</a>.
    </p>
    <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.5;">
      Time AprovaOAB
    </p>
  </div>
</body>
</html>`
}

// Lembrete do Módulo 2 do diagnóstico, pedido pelo próprio usuário no botão
// "Me lembra amanhã". Disparado uma única vez pelo cron diário.
//
// O tom é o mesmo da tela de resultado: dizer o que falta medir em número, sem
// fingir que o mapa está completo. É o motivo pra voltar — e a única coisa que
// alcança quem não voltou por conta própria.
export async function sendDiagnosticoLembreteEmail(opts: {
  toEmail: string
  firstName: string | null
  /** `materiasPendentes` é do MÓDULO — não confundir com o mapa inteiro. */
  modulo: { label: string; questoes: number; materiasPendentes: number }
  materiasMedidas: number
  /** Não medidas no mapa TODO. É este o número de "pro mapa ficar completo". */
  materiasNaoMedidas: number
  coberturaPercentual: number
}): Promise<void> {
  if (!resend) {
    logWarning("RESEND_API_KEY não configurada, pulando lembrete do diagnóstico", {
      area: "email",
      phase: "diagnostico-lembrete",
    })
    return
  }

  const greeting = opts.firstName ? `Olá, ${opts.firstName}!` : "Olá!"
  const url = `${APP_URL}/dashboard/diagnostico-inicial/resultado`

  try {
    await resend.emails.send({
      from: FROM,
      to: opts.toEmail,
      // O assunto usa o número do MAPA, não do módulo: são coisas diferentes, e
      // prometer "faltam 6" quando faltam 18 é o tipo de erro que essa tela
      // inteira existe pra não cometer.
      subject: `Faltam ${opts.materiasNaoMedidas} matérias pro seu mapa ficar completo`,
      html: buildDiagnosticoLembreteHtml({ greeting, url, ...opts }),
    })
  } catch (err) {
    logError(err, { area: "email", phase: "diagnostico-lembrete" })
    // Não propaga — o cron não deve falhar por causa de um email
  }
}

function buildDiagnosticoLembreteHtml(o: {
  greeting: string
  url: string
  modulo: { label: string; questoes: number; materiasPendentes: number }
  materiasMedidas: number
  materiasNaoMedidas: number
  coberturaPercentual: number
}): string {
  const plural = (n: number, s: string, p: string) => (n === 1 ? s : p)

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Seu mapa de estudos</title></head>
<body style="margin: 0; padding: 32px 16px; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 560px; margin: 0 auto; background-color: white; border-radius: 12px; padding: 40px 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <h1 style="margin: 0 0 8px 0; color: #10b981; font-size: 24px; font-weight: 700;">Você pediu pra ser lembrado</h1>
    <p style="margin: 0 0 24px 0; color: #4b5563; font-size: 16px;">${o.greeting}</p>
    <p style="margin: 0 0 16px 0; color: #1f2937; font-size: 15px; line-height: 1.6;">
      Já medimos <strong style="color: #1f2937;">${o.materiasMedidas} ${plural(o.materiasMedidas, "matéria", "matérias")}</strong>,
      que ${plural(o.materiasMedidas, "vale", "valem")} cerca de <strong style="color: #1f2937;">${o.coberturaPercentual}%</strong> da prova.
    </p>
    <div style="margin: 0 0 28px 0; padding: 16px; background-color: #f0fdf4; border-left: 4px solid #10b981; border-radius: 0 8px 8px 0;">
      <p style="margin: 0 0 10px 0; color: #1f2937; font-size: 14px; line-height: 1.6;">
        Faltam <strong>${o.materiasNaoMedidas} ${plural(o.materiasNaoMedidas, "matéria", "matérias")}</strong>
        pro mapa ficar completo. Enquanto não medirmos, não dizemos nada sobre elas: nem que estão
        boas, nem que estão ruins.
      </p>
      <p style="margin: 0; color: #1f2937; font-size: 14px; line-height: 1.6;">
        O próximo passo cobre <strong>${o.modulo.materiasPendentes} ${plural(o.modulo.materiasPendentes, "delas", "delas")}</strong>:
        ${o.modulo.questoes} ${plural(o.modulo.questoes, "questão", "questões")} no ${o.modulo.label}.
      </p>
    </div>
    <a href="${o.url}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
      Continuar meu mapa
    </a>
    <p style="margin: 32px 0 0 0; color: #4b5563; font-size: 14px; line-height: 1.6;">
      Seu progresso fica salvo: dá pra parar no meio e voltar depois.
    </p>
    <p style="margin: 24px 0 0 0; color: #9ca3af; font-size: 13px; line-height: 1.5;">
      Este é um lembrete único, que você mesmo pediu — não vamos repetir.<br>
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
  sync: { total: number; criados: number; jaExistiam: number; erros: number }
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
  sync: { total: number; criados: number; jaExistiam: number; erros: number }
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
      <strong>Audiência:</strong> ${o.sync.total} usuários (${o.sync.criados} novos, ${o.sync.jaExistiam} já existentes${o.sync.erros > 0 ? `, <span style="color:#dc2626;">${o.sync.erros} com erro</span>` : ""}).
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
