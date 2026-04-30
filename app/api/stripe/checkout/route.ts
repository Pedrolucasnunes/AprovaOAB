import { NextRequest, NextResponse } from "next/server"
import { stripe, STRIPE_PRICES } from "@/lib/stripe"
import { requireUser } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(req: NextRequest) {
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

  let customerId = userData?.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: userData?.email ?? undefined,
      metadata: { supabase_user_id: user.id },
    })
    customerId = customer.id

    await supabaseAdmin
      .from("users")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id)
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/assinar/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/#planos`,
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
  })

  return NextResponse.json({ url: session.url })
}
