// Estado da parede do limite diário — puro, zero I/O.
//
// Existe porque a parede tinha SEIS superfícies com copy própria e nenhuma
// delas sabia se era a primeira vez que o usuário batia no teto ou a décima.
// Momentos diferentes pedem mensagens diferentes: quem tem 30 minutos de
// produto não é candidato a compra, quem bate no limite toda semana é.
//
// A fonte do estado é `question_attempts` (dias distintos com o teto batido),
// não o evento `limite_diario_atingido`: o evento só existe desde 28/jul e
// classificaria como "primeira vez" quem já batia no teto em junho. O evento
// mede o que a tabela não consegue — intenção RECUSADA — e é o que mede
// conversão depois.

import { parseDbDate, ymdBrasil } from "./datas"

export type EstadoParede = "habito" | "recorrente"

/**
 * A partir de quantos dias-com-teto a parede vira oferta.
 *
 * Mora aqui sozinho de propósito: é o número que vai ser ajustado quando
 * houver dado, e ajustar um número espalhado por seis telas é o que gerou
 * esta refatoração.
 */
export const DIAS_PARA_OFERTA = 3

export type DiasNoTeto = {
  /** Dias distintos em que o usuário bateu no teto, desde sempre. */
  total: number
  /** Quantos desses caem nos últimos 7 dias — é o que autoriza dizer "essa semana". */
  ultimos7: number
}

/**
 * Conta dias-com-teto a partir de tentativas já carregadas. **Sem I/O de
 * propósito**: o `/api/dashboard` já tem `question_attempts` inteiro em
 * memória (com `created_at` e `is_diagnostic`), e aquela rota é a mais chamada
 * do app — transformar isto em query seria desfazer o trabalho de performance.
 *
 * Bucket por `ymdBrasil`, nunca por UTC: as respostas da noite migram de dia e
 * a métrica do limite diário falseia.
 *
 * O diagnóstico fica de fora, como em todo lugar que conta o limite — ele é
 * isento (ver `contarQuestoesHoje` e o trigger `enforce_free_daily_limit`).
 */
export function contarDiasNoTeto(
  attempts: { created_at: string; is_diagnostic: boolean }[],
  limite: number,
  agora: Date = new Date(),
): DiasNoTeto {
  const porDia = new Map<string, number>()

  for (const a of attempts) {
    if (a.is_diagnostic) continue
    const dia = ymdBrasil(parseDbDate(a.created_at))
    porDia.set(dia, (porDia.get(dia) ?? 0) + 1)
  }

  // Janela dos 7 dias como conjunto de datas formatadas, não como comparação de
  // instantes: assim "hoje" é o dia de Brasília, igual ao bucket acima.
  const janela = new Set<string>()
  for (let i = 0; i < 7; i++) {
    janela.add(ymdBrasil(new Date(agora.getTime() - i * 86_400_000)))
  }

  let total = 0
  let ultimos7 = 0

  for (const [dia, respostas] of porDia) {
    if (respostas < limite) continue
    total++
    if (janela.has(dia)) ultimos7++
  }

  return { total, ultimos7 }
}

/**
 * `habito` — empurra a volta amanhã, não vende. `recorrente` — a restrição já
 * foi sentida várias vezes, a parede vira oferta (com o caminho gratuito
 * sempre visível, o que é responsabilidade de quem renderiza).
 */
export function estadoDaParede(diasNoTeto: number): EstadoParede {
  return diasNoTeto >= DIAS_PARA_OFERTA ? "recorrente" : "habito"
}

/**
 * Como nomear a frequência sem mentir.
 *
 * "Terceira vez essa semana" só pode ser dito se os últimos 7 dias
 * sustentarem — senão é exatamente o tipo de afirmação vaga que estamos
 * tirando da landing. Devolve `null` quando não há frequência que valha
 * mencionar, e aí a copy cai no genérico.
 */
export function frasePeriodo(total: number, ultimos7: number): string | null {
  if (ultimos7 >= 2) return `${ordinal(ultimos7)} vez essa semana`
  if (total >= 2) return `${ordinal(total)} vez`
  return null
}

const ORDINAIS = [
  "Primeira", "Segunda", "Terceira", "Quarta", "Quinta",
  "Sexta", "Sétima", "Oitava", "Nona", "Décima",
] as const

function ordinal(n: number): string {
  return ORDINAIS[n - 1] ?? `${n}ª`
}

/**
 * O que a sessão que acabou de ser barrada produziu. Alimenta a copy do
 * estado `habito`, que mostra o que a pessoa fez antes de falar do que ela
 * não pode fazer.
 *
 * `materia` é o nome quando a sessão inteira foi de uma matéria só, e `null`
 * quando foi misturada — nesse caso a copy omite a matéria em vez de eleger
 * uma arbitrariamente.
 */
export type SessaoParede = {
  total: number
  acertos: number
  materia: string | null
}

/**
 * Resume as respostas SALVAS de uma sessão.
 *
 * "Salvas", não "tentadas": o 403 dispara na resposta seguinte ao teto, então
 * contar tentativas faria a parede reportar 11 de um limite de 10.
 */
export function resumirSessao(
  respondidas: { acertou: boolean; materia: string }[],
): SessaoParede | null {
  if (respondidas.length === 0) return null

  const materias = new Set(respondidas.map((r) => r.materia))

  return {
    total: respondidas.length,
    acertos: respondidas.filter((r) => r.acertou).length,
    materia: materias.size === 1 ? [...materias][0] : null,
  }
}
