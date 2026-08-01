// Instrumentação mínima de produto (tabela `user_events`).
//
// Existe porque hoje o app não registra um único clique: toda a análise de
// ativação sai de inferência sobre `question_attempts`, e há perguntas simples
// ("quantos clicam no CTA da tela de resultado?") que são literalmente
// impossíveis de responder com os dados atuais.
//
// Server-only (RLS ligado sem policies). Nunca lança e nunca bloqueia a
// resposta: gravar telemetria não pode derrubar o fluxo do usuário.
import { PAREDE_CTA_CLICADO } from "./events-client"
import { logWarning } from "./logger"
import { supabaseAdmin } from "./supabase-admin"

// Só entram chaves que TÊM um ponto de emissão. Chave definida que nunca grava
// é pior que chave ausente: quem lê este mapa assume que o dado existe e monta
// métrica em cima do vazio.
//
// Removidas de propósito:
//   `diagnostico_modulo2_aberto` — redundante, MODULO_INICIADO já traz {modulo}
//   `diagnostico_cta_clicado`    — virou o prop `origem` do TREINO_INICIADO,
//                                  que mede o handoff em vez do clique
export const EVENTOS = {
  DIAGNOSTICO_MODULO_INICIADO: "diagnostico_modulo_iniciado",
  DIAGNOSTICO_QUESTAO_RESPONDIDA: "diagnostico_questao_respondida",
  DIAGNOSTICO_MODULO_CONCLUIDO: "diagnostico_modulo_concluido",
  DIAGNOSTICO_LEMBRETE_PEDIDO: "diagnostico_lembrete_pedido",
  DIAGNOSTICO_LEMBRETE_ENVIADO: "diagnostico_lembrete_enviado",
  TREINO_INICIADO: "treino_iniciado",
  LIMITE_DIARIO_ATINGIDO: "limite_diario_atingido",
  // Vem de `events-client.ts` porque é o único que nasce no navegador — a tela
  // e a whitelist da rota têm que apontar pra mesma string.
  PAREDE_CTA_CLICADO,
} as const

export type Evento = (typeof EVENTOS)[keyof typeof EVENTOS]

/**
 * Os únicos eventos que o CLIENTE pode mandar gravar (via `POST /api/eventos`).
 *
 * Lista fechada, não filtro: `user_events` alimenta o `/admin/metricas`, e um
 * endpoint de escrita que aceita nome livre deixa qualquer usuário logado
 * inventar métrica no painel que existe justamente pra ser confiável.
 *
 * `parede_cta_clicado` está aqui porque não tem como nascer no servidor — o
 * clique acontece antes de qualquer requisição, e o destino (trial ou planos) é
 * decisão da tela. Todo o resto continua sendo emitido server-side, onde não dá
 * pra forjar.
 */
export const EVENTOS_DO_CLIENTE: readonly Evento[] = [EVENTOS.PAREDE_CTA_CLICADO]

/**
 * Grava um evento. Chame com `void track(...)` quando não quiser esperar —
 * é o uso esperado na maioria dos casos.
 */
export async function track(
  userId: string | null,
  event: Evento,
  props: Record<string, unknown> = {},
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from("user_events")
      .insert({ user_id: userId, event, props })

    // supabase-js devolve o erro no retorno em vez de lançar.
    if (error) {
      logWarning("Falha gravando user_event", { area: "events", event, erro: error.message })
    }
  } catch (err) {
    logWarning("Exceção gravando user_event", {
      area: "events",
      event,
      erro: err instanceof Error ? err.message : String(err),
    })
  }
}
