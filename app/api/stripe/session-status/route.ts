import { NextRequest, NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"
import Stripe from "stripe"
import { stripe } from "@/lib/stripe"
import { requireUser } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await requireUser()
    if (error) return error

    const sessionId = req.nextUrl.searchParams.get("session_id")
    if (!sessionId || !sessionId.startsWith("cs_")) {
      return NextResponse.json({ error: "session_id ausente ou inválido" }, { status: 400 })
    }

    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("stripe_customer_id, plano")
      .eq("id", user.id)
      .single()

    let session: Stripe.Checkout.Session
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId)
    } catch (err) {
      if (
        err instanceof Stripe.errors.StripeInvalidRequestError &&
        err.code === "resource_missing"
      ) {
        return NextResponse.json({ error: "Sessão não encontrada" }, { status: 404 })
      }
      throw err
    }

    // Proteção: só pode ver status da própria session
    if (
      userData?.stripe_customer_id &&
      session.customer &&
      session.customer !== userData.stripe_customer_id
    ) {
      return NextResponse.json({ error: "Sessão não pertence ao usuário" }, { status: 403 })
    }

    const pago = session.payment_status === "paid"
    const plano = userData?.plano ?? "free"
    const planoAtivo = plano !== "free"

    if (pago && planoAtivo) {
      return NextResponse.json({ confirmed: true, plano })
    }

    if (pago && !planoAtivo) {
      return NextResponse.json({ confirmed: false, reason: "webhook_pending" })
    }

    return NextResponse.json({ confirmed: false, reason: "payment_pending" })
  } catch (err) {
    Sentry.captureException(err, { tags: { area: "stripe-session-status" } })
    console.error("[stripe/session-status] erro:", err)
    const message = err instanceof Error ? err.message : "Erro ao consultar sessão"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
