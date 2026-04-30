import { NextRequest, NextResponse } from "next/server"
import { stripe } from "@/lib/stripe"
import { requireUser } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(req: NextRequest) {
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

  const session = await stripe.billingPortal.sessions.create({
    customer: userData.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  })

  return NextResponse.json({ url: session.url })
}
