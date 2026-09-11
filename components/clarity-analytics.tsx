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
 * `afterInteractive`, e NÃO `lazyOnload` — já foi trocado por lazyOnload uma vez
 * e revertido, em set/2026, com a medição que explica por quê.
 *
 * O argumento pra adiar era que o clarity.js custa ~940 ms de CPU, mais que
 * qualquer chunk da aplicação. O número é real, mas irrelevante pro LCP: no
 * relógio observado, o clarity só COMEÇA a rodar em ~5,9 s, e o LCP acontece em
 * ~0,8 s. Ele já rodava cinco segundos depois da pintura. O `lazyOnload` mudou
 * o início de 5,9 s pra 5,3 s e não separou nenhuma métrica da baseline em três
 * execuções do Lighthouse.
 *
 * A armadilha que produziu o erro: `bootup-time` mede CPU TOTAL, não quando ela
 * é gasta. Script caro fora da janela crítica parece problema de caminho
 * crítico em qualquer relatório que ordene por CPU.
 *
 * E o custo do adiamento era real: a gravação de sessão começaria mais tarde,
 * perdendo os primeiros cliques. Enquanto o Search Console não estiver ligado,
 * o Clarity é a única ferramenta de comportamento que o produto tem — degradá-la
 * por ganho não demonstrado é troca ruim.
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
