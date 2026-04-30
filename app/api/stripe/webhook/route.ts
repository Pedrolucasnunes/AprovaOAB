import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
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

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.CheckoutSession
      if (session.mode !== "subscription") break

      const customerId = session.customer as string
      const subscriptionId = session.subscription as string

      const sub = await stripe.subscriptions.retrieve(subscriptionId)
      const priceId = sub.items.data[0].price.id
      const plano = priceId === process.env.STRIPE_PRICE_PRO ? "pro" : "aprovacao"

      await supabaseAdmin
        .from("users")
        .update({ plano, stripe_subscription_id: subscriptionId })
        .eq("stripe_customer_id", customerId)
      break
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string

      if (sub.status === "active" || sub.status === "trialing") {
        const priceId = sub.items.data[0].price.id
        const plano = priceId === process.env.STRIPE_PRICE_PRO ? "pro" : "aprovacao"

        await supabaseAdmin
          .from("users")
          .update({ plano, stripe_subscription_id: sub.id })
          .eq("stripe_customer_id", customerId)
      }
      break
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string

      await supabaseAdmin
        .from("users")
        .update({ plano: "free", stripe_subscription_id: null })
        .eq("stripe_customer_id", customerId)
      break
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      const customerId = invoice.customer as string

      await supabaseAdmin
        .from("users")
        .update({ plano: "free" })
        .eq("stripe_customer_id", customerId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
