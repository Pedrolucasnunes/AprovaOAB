import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { stripe, planoFromPriceId } from "@/lib/stripe"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { sendWelcomeProEmail } from "@/lib/email"
import { logWarning } from "@/lib/logger"
import Stripe from "stripe"

/**
 * Ativa o plano pago a partir de uma Checkout Session em modo subscription.
 * Reusado pelo caminho síncrono (cartão → `checkout.session.completed`) e pelo
 * caminho assíncrono (PIX → `checkout.session.async_payment_succeeded`).
 *
 * O e-mail de boas-vindas só é enviado se o usuário ainda estava `free`, para
 * não reenviar quando outro evento (ex.: `customer.subscription.updated`) já
 * tiver ativado o plano antes.
 */
async function activatePlanFromCheckoutSession(
  session: Stripe.Checkout.Session,
  eventId: string,
) {
  const customerId = session.customer as string
  const subscriptionId = session.subscription as string

  const sub = await stripe.subscriptions.retrieve(subscriptionId)
  const priceId = sub.items.data[0].price.id
  const plano = planoFromPriceId(priceId)

  if (!plano) {
    Sentry.captureException(new Error("priceId desconhecido em checkout session"), {
      tags: { area: "stripe-webhook" },
      extra: { event_id: eventId, priceId, customerId },
    })
    return
  }

  // Lê o plano atual antes de atualizar — base para decidir o e-mail.
  const { data: before } = await supabaseAdmin
    .from("users")
    .select("plano")
    .eq("stripe_customer_id", customerId)
    .single()

  await supabaseAdmin
    .from("users")
    .update({
      plano,
      stripe_subscription_id: subscriptionId,
      subscription_status: "active",
    })
    .eq("stripe_customer_id", customerId)

  // Boas-vindas só na primeira ativação (estava free).
  if (before && before.plano !== "free") return

  const email = session.customer_details?.email
  const fullName = session.customer_details?.name
  const firstName = fullName ? fullName.split(" ")[0] : null
  if (email) {
    await sendWelcomeProEmail({ toEmail: email, firstName, plano })
  } else {
    logWarning("checkout sem customer_details.email, pulando email de boas-vindas", {
      area: "stripe-webhook",
      customerId,
      event_id: eventId,
    })
  }
}

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

        // PIX é assíncrono: o pagamento ainda não confirmou neste evento.
        // Só ativa de imediato quando já está pago (cartão). Para PIX pendente,
        // a ativação acontece em `checkout.session.async_payment_succeeded`.
        if (session.payment_status !== "paid") {
          logWarning("checkout.session.completed sem pagamento confirmado (provável PIX), aguardando confirmação assíncrona", {
            area: "stripe-webhook",
            customerId: session.customer as string,
            event_id: event.id,
          })
          break
        }

        await activatePlanFromCheckoutSession(session, event.id)
        break
      }

      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== "subscription") break

        await activatePlanFromCheckoutSession(session, event.id)
        break
      }

      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== "subscription") break

        // Pagamento PIX falhou/expirou — usuário permanece free, nenhuma ação.
        // Apenas registra para visibilidade.
        logWarning("pagamento assíncrono (PIX) falhou no checkout, plano não ativado", {
          area: "stripe-webhook",
          customerId: session.customer as string,
          event_id: event.id,
        })
        break
      }

      case "mandate.updated": {
        const mandate = event.data.object as Stripe.Mandate
        // Cliente pode revogar o mandato PIX no app do banco. A cobrança
        // seguinte vai falhar e cair em `invoice.payment_failed`. Aqui apenas
        // registramos para visibilidade.
        if (mandate.status === "inactive") {
          logWarning("mandato PIX revogado/inativo", {
            area: "stripe-webhook",
            event_id: event.id,
            mandate_id: mandate.id,
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

          await supabaseAdmin
            .from("users")
            .update({
              plano,
              stripe_subscription_id: sub.id,
              subscription_status: "active",
            })
            .eq("stripe_customer_id", customerId)
        } else if (sub.status === "past_due" || sub.status === "unpaid") {
          await supabaseAdmin
            .from("users")
            .update({ subscription_status: "past_due" })
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
