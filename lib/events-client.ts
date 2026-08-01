// Telemetria emitida pelo CLIENTE, gravada em `user_events` via `/api/eventos`.
//
// Módulo separado de `lib/events.ts` de propósito: aquele importa
// `supabaseAdmin` (service role) e não pode ser puxado por um client component
// em hipótese nenhuma. O nome do evento mora AQUI e o servidor importa daqui —
// assim a whitelist da rota e o emissor da tela nunca divergem.

/** Clique no CTA da parede do limite diário. */
export const PAREDE_CTA_CLICADO = "parede_cta_clicado"

export type PropsCliente = Record<string, string | number | boolean | null | undefined>

/**
 * Fire-and-forget. Nunca lança: telemetria não pode impedir uma navegação.
 *
 * `keepalive` é obrigatório aqui — o clique que estamos medindo navega pra
 * outra página, e sem ele o browser cancela a requisição em voo. É a diferença
 * entre medir o CTA e medir nada.
 */
export function trackClient(event: string, props: PropsCliente = {}): void {
  try {
    void fetch("/api/eventos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, props: limpar(props) }),
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Ignorado de propósito.
  }
}

/** Tira `undefined` (que o JSON some com ele de qualquer jeito, mas explicitar evita prop fantasma). */
function limpar(props: PropsCliente): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(props).filter(([, v]) => v !== undefined),
  ) as Record<string, string | number | boolean | null>
}
