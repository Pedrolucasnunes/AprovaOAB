import Stripe from "stripe"

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-04-30.basil",
})

export const STRIPE_PRICES = {
  pro: process.env.STRIPE_PRICE_PRO!,
  aprovacao: process.env.STRIPE_PRICE_APROVACAO!,
} as const

export type Plano = "free" | "pro" | "aprovacao"
