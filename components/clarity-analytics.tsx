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
 *
 * `lazyOnload`, não `afterInteractive`, e o motivo é medido: o clarity.js é o
 * MAIOR consumidor de CPU da landing — 964 ms, mais que qualquer chunk da
 * própria aplicação e mais que o GTM e o GA4 somados. Em `afterInteractive` ele
 * disputa a thread principal justamente na janela do LCP. Em `lazyOnload` só
 * roda depois do `load`, quando a página já está pintada e interativa.
 *
 * A troca tem custo, e é o custo aceito: a gravação começa mais tarde, então
 * clique feito nos primeiros instantes pode ficar de fora do replay. Clarity é
 * ferramenta de diagnóstico, não de cobrança — vale menos que o primeiro
 * segundo de quem chegou pela busca.
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
    <Script id="clarity-init" strategy="lazyOnload">
      {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`}
    </Script>
  )
}
