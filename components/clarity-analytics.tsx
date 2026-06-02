"use client"

import Script from "next/script"
import { useEffect, useState } from "react"
import { getStoredConsent } from "@/lib/consent"

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID

/**
 * Microsoft Clarity (heatmap + gravação de sessão).
 * Só carrega se NEXT_PUBLIC_CLARITY_ID estiver setado e o usuário não tiver
 * recusado a categoria de análise. Análise é opt-out (ligada por padrão), então
 * só pula quando há consentimento salvo com analytics === false.
 */
export function ClarityAnalytics() {
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    if (!CLARITY_ID) return
    const consent = getStoredConsent()
    if (consent && consent.analytics === false) return
    setAllowed(true)
  }, [])

  if (!CLARITY_ID || !allowed) return null

  return (
    <Script id="clarity-init" strategy="afterInteractive">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`}
    </Script>
  )
}
