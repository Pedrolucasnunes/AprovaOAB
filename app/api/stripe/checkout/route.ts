import { NextRequest, NextResponse } from "next/server"
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
      .select("stripe_customer_id, email")
      .eq("id", user.id)
      .single()

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
    console.error("[stripe/checkout] erro:", err)
    const message = err instanceof Error ? err.message : "Erro ao iniciar checkout"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
