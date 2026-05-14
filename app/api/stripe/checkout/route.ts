import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import { stripe, STRIPE_PRICES, ensureStripeCustomer } from "@/lib/stripe"
import { requireUser } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  try {
    const rl = await rateLimit(req, "stripe-checkout", 10, 60)
    if (!rl.success) {
      return NextResponse.json({ error: "Muitas requisições. Aguarde alguns segundos." }, { status: 429 })
    }

    const { user, error } = await requireUser()
    if (error) return error

    const { plano } = await req.json()
    const priceId = STRIPE_PRICES[plano as keyof typeof STRIPE_PRICES]

    if (!priceId) {
      return NextResponse.json({ error: "Plano inválido" }, { status: 400 })
    }

    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("stripe_customer_id, email, plano")
      .eq("id", user.id)
      .single()

    if (userData?.plano && userData.plano !== "free") {
      const planoLabel = userData.plano === "pro" ? "Pro" : "Aprovação"
      const message =
        userData.plano === plano
          ? `Você já tem o plano ${planoLabel} ativo. Para cancelar ou alterar a forma de pagamento, acesse "Gerenciar assinatura" no seu perfil.`
          : `Você já tem o plano ${planoLabel} ativo. Para trocar de plano, acesse "Gerenciar assinatura" no seu perfil.`
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const customerId = await ensureStripeCustomer(
      user.id,
      userData?.email,
      userData?.stripe_customer_id,
    )

    const headerOrigin = req.headers.get("origin")
    const headerHost = req.headers.get("host")
    const origin =
      (headerOrigin && headerOrigin !== "null" ? headerOrigin : null) ??
      (headerHost ? `https://${headerHost}` : null) ??
      process.env.NEXT_PUBLIC_APP_URL

    if (!origin) {
      return NextResponse.json({ error: "Origem da requisição inválida" }, { status: 400 })
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/assinar/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/#planos`,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "stripe-checkout" } })
    console.error("[stripe/checkout] erro:", err)
    const message = err instanceof Error ? err.message : "Erro ao iniciar checkout"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
