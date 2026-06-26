import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { stripe, planoFromPriceId } from "@/lib/stripe"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { sendWelcomeProEmail, sendPaymentFailedEmail } from "@/lib/email"
import { logWarning } from "@/lib/logger"
import Stripe from "stripe"

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get("stripe-signature")

  if (!sig) {
    return NextResponse.json({ error: "Sem assinatura" }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: "Webhook inválido" }, { status: 400 })
  }

  // Idempotência: INSERT com ON CONFLICT. Se já processado, retorna cedo.
  const { error: insertError } = await supabaseAdmin
    .from("stripe_events_processed")
    .insert({ event_id: event.id, event_type: event.type })

  if (insertError) {
    // Postgres unique violation = evento já processado anteriormente
    if (insertError.code === "23505") {
      return NextResponse.json({ received: true, idempotent: true })
    }
    Sentry.captureException(insertError, {
      tags: { area: "stripe-webhook" },
      extra: { event_id: event.id, event_type: event.type, phase: "idempotency-insert" },
    })
    return NextResponse.json({ error: "Erro ao registrar evento" }, { status: 500 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== "subscription") break

        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        const sub = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = sub.items.data[0].price.id
        const plano = planoFromPriceId(priceId)

        if (!plano) {
          Sentry.captureException(new Error("priceId desconhecido em checkout.session.completed"), {
            tags: { area: "stripe-webhook" },
            extra: { event_id: event.id, priceId, customerId },
          })
          break
        }

        const isTrial = sub.status === "trialing"
        const trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null

        await supabaseAdmin
          .from("users")
          .update({
            plano,
            stripe_subscription_id: subscriptionId,
            subscription_status: isTrial ? "trialing" : "active",
            cancel_at_period_end: sub.cancel_at_period_end ?? false,
            ...(isTrial ? { trial_used: true, trial_ends_at: trialEndsAt } : {}),
          })
          .eq("stripe_customer_id", customerId)

        // Email de boas-vindas (best-effort, não bloqueia webhook)
        const email = session.customer_details?.email
        const fullName = session.customer_details?.name
        const firstName = fullName ? fullName.split(" ")[0] : null
        if (email) {
          await sendWelcomeProEmail({ toEmail: email, firstName, plano })
        } else {
          logWarning("checkout sem customer_details.email, pulando email de boas-vindas", {
            area: "stripe-webhook",
            customerId,
            event_id: event.id,
          })
        }
        break
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string

        if (sub.status === "active" || sub.status === "trialing") {
          const priceId = sub.items.data[0].price.id
          const plano = planoFromPriceId(priceId)

          if (!plano) {
            Sentry.captureException(new Error("priceId desconhecido em customer.subscription.updated"), {
              tags: { area: "stripe-webhook" },
              extra: { event_id: event.id, priceId, customerId },
            })
            break
          }

          const isTrial = sub.status === "trialing"
          const trialEndsAt = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null

          await supabaseAdmin
            .from("users")
            .update({
              plano,
              stripe_subscription_id: sub.id,
              subscription_status: isTrial ? "trialing" : "active",
              cancel_at_period_end: sub.cancel_at_period_end ?? false,
              ...(isTrial ? { trial_used: true, trial_ends_at: trialEndsAt } : {}),
            })
            .eq("stripe_customer_id", customerId)
        } else if (sub.status === "past_due") {
          // Carência: cobrança falhou, mas o Stripe ainda vai retentar. Mantém o
          // plano Pro (não pune soluço temporário) — só sinaliza o atraso.
          await supabaseAdmin
            .from("users")
            .update({ subscription_status: "past_due" })
            .eq("stripe_customer_id", customerId)
        } else if (sub.status === "unpaid") {
          // Retentativas esgotadas com a config "Mark as unpaid" (o `.deleted` nunca
          // dispara nesse caso). Rebaixa pra free defensivamente, mas PRESERVA o
          // stripe_subscription_id: a assinatura ainda existe no Stripe e, se o aluno
          // pagar e ela voltar a `active`, o branch acima re-promove pra Pro.
          await supabaseAdmin
            .from("users")
            .update({ plano: "free", subscription_status: "canceled" })
            .eq("stripe_customer_id", customerId)
        }
        break
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription
        const customerId = sub.customer as string

        await supabaseAdmin
          .from("users")
          .update({
            plano: "free",
            stripe_subscription_id: null,
            subscription_status: "canceled",
            cancel_at_period_end: false,
          })
          .eq("stripe_customer_id", customerId)
        break
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        await supabaseAdmin
          .from("users")
          .update({ subscription_status: "past_due" })
          .eq("stripe_customer_id", customerId)

        // E-mail de recuperação só na 1ª falha do ciclo. invoice.payment_failed
        // dispara a cada retentativa (~4 ao longo de 2-3 semanas); o banner do
        // dashboard cobre o estado contínuo, então não reenviamos a cada tentativa.
        if (invoice.attempt_count === 1) {
          const email = invoice.customer_email
          const firstName = invoice.customer_name
            ? invoice.customer_name.split(" ")[0]
            : null
          if (email) {
            await sendPaymentFailedEmail({ toEmail: email, firstName })
          } else {
            logWarning("invoice.payment_failed sem customer_email, pulando email de cobrança", {
              area: "stripe-webhook",
              customerId,
              event_id: event.id,
            })
          }
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    Sentry.captureException(err, {
      tags: { area: "stripe-webhook" },
      extra: { event_id: event.id, event_type: event.type },
    })
    // Apaga o registro de idempotência pra permitir retry do Stripe processar de fato.
    await supabaseAdmin
      .from("stripe_events_processed")
      .delete()
      .eq("event_id", event.id)
    return NextResponse.json({ error: "Erro ao processar evento" }, { status: 500 })
  }
}
