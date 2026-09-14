"use client"

import { WHATSAPP_ICON_PATH, whatsappSupportUrl } from "@/lib/support"

export function WhatsAppFab() {
  return (
    <a
      href={whatsappSupportUrl()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Suporte via WhatsApp"
      title="Fale com a gente no WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition-transform hover:scale-110 hover:bg-[#1FB855] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
    >
      <svg
        viewBox="0 0 24 24"
        fill="white"
        className="h-7 w-7"
        aria-hidden="true"
      >
        <path d={WHATSAPP_ICON_PATH} />
      </svg>
    </a>
  )
}
