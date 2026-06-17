"use client"

import { OPEN_PREFS_EVENT } from "@/lib/consent"
import { cn } from "@/lib/utils"

// Reabre o painel de preferências de cookies (o CookieBanner escuta esse evento).
export function CookiePreferencesTrigger({ className }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_PREFS_EVENT))}
      className={cn("cursor-pointer text-left transition-colors duration-200", className)}
    >
      Gerenciar cookies
    </button>
  )
}
