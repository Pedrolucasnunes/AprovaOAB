import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { requireUser } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { APP_URL } from "@/lib/app-url"

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireUser()
    if (error) return error

    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single()

    if (!userData?.stripe_customer_id) {
      return NextResponse.json({ error: "Sem assinatura ativa" }, { status: 400 })
    }

    const headerOrigin = req.headers.get("origin")
    const headerHost = req.headers.get("host")
    const origin =
      (headerOrigin && headerOrigin !== "null" ? headerOrigin : null) ??
      (headerHost ? `https://${headerHost}` : null) ??
      APP_URL

    if (!origin) {
      return NextResponse.json({ error: "Origem da requisição inválida" }, { status: 400 })
    }

    try {
      const session = await stripe.billingPortal.sessions.create({
        customer: userData.stripe_customer_id,
        return_url: `${origin}/dashboard`,
      })
      return NextResponse.json({ url: session.url })
    } catch (err) {
      if (
        err instanceof Stripe.errors.StripeInvalidRequestError &&
        err.code === "resource_missing"
      ) {
        await supabaseAdmin
          .from("users")
          .update({ stripe_customer_id: null, stripe_subscription_id: null, plano: "free" })
          .eq("id", user.id)
        return NextResponse.json(
          { error: "Sua assinatura não foi encontrada. Inicie uma nova assinatura." },
          { status: 400 },
        )
      }
      throw err
    }
  } catch (err) {
    console.error("[stripe/portal] erro:", err)
    const message = err instanceof Error ? err.message : "Erro ao abrir portal"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
