"use client"

import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { trackEvent } from "@/lib/analytics"

// CTA das páginas públicas de SEO. Dispara `seo_cta_click` no dataLayer (GTM/GA4),
// mesmo padrão do `hero_cta_click`. Lembrar de criar o gatilho + tag no GTM.
export function SeoCtaButton({
  location,
  label = "Começar diagnóstico gratuito",
}: {
  location: string
  label?: string
}) {
  return (
    <Link
      href="/cadastro"
      onClick={() => trackEvent("seo_cta_click", { location })}
      className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
    >
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  )
}
