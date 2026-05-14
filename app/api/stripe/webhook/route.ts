import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { stripe, planoFromPriceId } from "@/lib/stripe"
import { supabaseAdmin } from "@/lib/supabase-admin"
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

        await supabaseAdmin
          .from("users")
          .update({
            plano,
            stripe_subscription_id: subscriptionId,
            subscription_status: "active",
          })
          .eq("stripe_customer_id", customerId)
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
