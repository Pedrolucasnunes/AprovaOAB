"use client"

import Link from "next/link"
import { Lock, ArrowRight } from "lucide-react"
import { trackEvent } from "@/lib/analytics"

// Bloco "comentário gated": teaser embaçado + CTA. A explicação real NUNCA chega
// ao cliente (não é renderizada nem escondida via CSS) — o gate é server-side.
export function GatedExplanation({ materia }: { materia: string }) {
  return (
    <div className="relative mt-6 overflow-hidden rounded-xl border border-border bg-muted/20 p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Lock className="h-4 w-4 text-primary" />
        Resolução comentada
      </div>

      {/* Teaser embaçado (sem conteúdo real) */}
      <div aria-hidden="true" className="select-none space-y-2 blur-sm">
        <div className="h-3 w-full rounded bg-foreground/10" />
        <div className="h-3 w-11/12 rounded bg-foreground/10" />
        <div className="h-3 w-10/12 rounded bg-foreground/10" />
        <div className="h-3 w-8/12 rounded bg-foreground/10" />
      </div>

      <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Veja a resolução comentada e pratique milhares de questões no AprovaOAB.
        </p>
        <Link
          href="/cadastro"
          onClick={() => trackEvent("seo_cta_click", { location: "questao_comentario", materia })}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Ver resolução — criar conta grátis
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
