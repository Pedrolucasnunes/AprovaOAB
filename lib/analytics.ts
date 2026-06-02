// Eventos custom para o GTM/GA4. Empurra para o dataLayer com a chave `event`,
// que é o que os gatilhos de "Evento personalizado" do GTM escutam. No GTM,
// cada evento precisa de um gatilho + tag de evento do GA4 (ver guia no PR).
type EventParams = Record<string, string | number | boolean | null | undefined>

export function trackEvent(event: string, params: EventParams = {}): void {
  if (typeof window === "undefined") return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ event, ...params })
}
