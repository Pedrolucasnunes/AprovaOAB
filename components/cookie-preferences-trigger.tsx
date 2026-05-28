"use client"

import { OPEN_PREFS_EVENT } from "@/lib/consent"

export function CookiePreferencesTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_PREFS_EVENT))}
      className="text-left transition-opacity hover:opacity-80"
    >
      Gerenciar cookies
    </button>
  )
}
