/**
 * Lógica pura da tela de prova — zero I/O, zero React.
 *
 * Está separada porque a mesma pergunta ("em que estado está esta questão?")
 * é feita em três superfícies: a barra segmentada do topo, o mapa da prova e os
 * contadores do cabeçalho. Enquanto a regra morava dentro do JSX, ela já existia
 * escrita duas vezes (a grade de navegação e a legenda logo abaixo dela), e é
 * assim que duas superfícies da mesma tela passam a discordar.
 */

export type EstadoQuestao = "respondida" | "marcada" | "branco"

/**
 * MARCADA VENCE RESPONDIDA, de propósito. Quem marcou pediu explicitamente pra
 * voltar naquela questão; se o estado "respondida" ganhasse, a marcação sumiria
 * da barra no instante em que a pessoa respondesse — justamente o caso normal
 * de "respondi no chute e quero revisar".
 */
export function estadoDaQuestao(
  questionId: string,
  respostas: Record<string, string>,
  marcadas: Set<string>,
): EstadoQuestao {
  if (marcadas.has(questionId)) return "marcada"
  if (respostas[questionId]) return "respondida"
  return "branco"
}

export interface BlocoMateria {
  materia: string
  /** Posições 0-based no simulado, na ordem em que aparecem. */
  indices: number[]
  respondidas: number
  total: number
}

/**
 * Agrupa em blocos CONTÍGUOS, não por chave.
 *
 * `/api/simulados/gerar` insere as questões em blocos por disciplina, na ordem
 * do BLUEPRINT_OAB. Agrupar por contiguidade preserva essa ordem e a numeração
 * mostrada ao aluno ("11 a 18 = Constitucional"). Um `Map` por nome daria os
 * mesmos grupos hoje e reordenaria silenciosamente no dia em que o blueprint
 * intercalar matérias — com os números do mapa fora de ordem.
 */
export function agruparPorMateria<T extends { id: string; subject_name: string }>(
  questoes: T[],
  respostas: Record<string, string>,
): BlocoMateria[] {
  const blocos: BlocoMateria[] = []

  questoes.forEach((q, indice) => {
    const ultimo = blocos[blocos.length - 1]
    const bloco =
      ultimo && ultimo.materia === q.subject_name
        ? ultimo
        : (blocos.push({ materia: q.subject_name, indices: [], respondidas: 0, total: 0 }),
          blocos[blocos.length - 1])

    bloco.indices.push(indice)
    bloco.total += 1
    if (respostas[q.id]) bloco.respondidas += 1
  })

  return blocos
}

/**
 * Ritmo restante: quanto sobra por questão ainda não respondida.
 *
 * Devolve `null` — e não "0min00" — quando não há mais o que ritmar (tudo
 * respondido, ou tempo esgotado). Mesma regra do card de contagem regressiva
 * da prova: número inventado envelhece pior que campo ausente.
 */
export function formatarRitmo(
  segundosRestantes: number,
  questoesRestantes: number,
): string | null {
  if (questoesRestantes <= 0 || segundosRestantes <= 0) return null

  const porQuestao = Math.floor(segundosRestantes / questoesRestantes)
  if (porQuestao < 60) return `${porQuestao}s`

  const minutos = Math.floor(porQuestao / 60)
  const segundos = porQuestao % 60
  return `${minutos}min${segundos.toString().padStart(2, "0")}`
}
