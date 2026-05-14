import Stripe from "stripe"
import { supabaseAdmin } from "@/lib/supabase-admin"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-04-22.dahlia",
})

export const STRIPE_PRICES = {
  pro: process.env.STRIPE_PRICE_PRO?.trim() ?? "",
  aprovacao: process.env.STRIPE_PRICE_APROVACAO?.trim() ?? "",
} as const

export type Plano = "free" | "pro" | "aprovacao"

export function planoFromPriceId(priceId: string): "pro" | "aprovacao" | null {
  if (priceId === STRIPE_PRICES.pro) return "pro"
  if (priceId === STRIPE_PRICES.aprovacao) return "aprovacao"
  return null
}

export async function ensureStripeCustomer(
  userId: string,
  email: string | null | undefined,
  savedCustomerId: string | null | undefined,
): Promise<string> {
  if (savedCustomerId) {
    try {
      const c = await stripe.customers.retrieve(savedCustomerId)
      if (!c.deleted) return savedCustomerId
    } catch (err) {
      const isMissing =
        err instanceof Stripe.errors.StripeInvalidRequestError &&
        err.code === "resource_missing"
      if (!isMissing) throw err
    }
  }

  const customer = await stripe.customers.create({
    email: email ?? undefined,
    metadata: { supabase_user_id: userId },
  })

  await supabaseAdmin
    .from("users")
    .update({ stripe_customer_id: customer.id })
    .eq("id", userId)

  return customer.id
}
