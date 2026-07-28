// Edição do Exame de Ordem e cobertura de prova por conjunto de matérias.
//
// A edição NÃO tem coluna própria: vive dentro da string `questions.banca`, no
// formato "Exame de Ordem Unificado - XLII (FGV)". Este módulo isola esse parse
// num lugar só, pra tela de resultado poder dizer "medimos 8 matérias que valem
// ~63% da prova" com número CALCULADO, nunca escrito à mão — a honestidade da
// tela é o produto, e um número hardcoded apodrece na primeira edição nova.
import { fetchAllRows } from "./supabase-paginate"
import { supabaseAdmin } from "./supabase-admin"

const ROMANOS: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100 }

/** "Exame de Ordem Unificado - XLII (FGV)" -> 42. Null se não reconhecer. */
export function edicaoDaBanca(banca: string | null | undefined): number | null {
  if (!banca) return null
  const m = banca.match(/-\s*([IVXLC]+)\s*\(/i)
  if (!m) return null

  const s = m[1].toUpperCase()
  let total = 0
  for (let i = 0; i < s.length; i++) {
    const atual = ROMANOS[s[i]]
    const proximo = ROMANOS[s[i + 1]]
    if (atual === undefined) return null
    total += proximo !== undefined && proximo > atual ? -atual : atual
  }
  return total > 0 ? total : null
}

export interface Cobertura {
  /** % da prova que as matérias pedidas representam na janela. */
  percentual: number
  /** Questões das matérias pedidas dentro da janela. */
  questoesCobertas: number
  /** Total de questões na janela. */
  questoesNaJanela: number
  /** Edições efetivamente consideradas (as N mais recentes disponíveis). */
  edicoes: number[]
}

/**
 * Peso das `subjectIds` nas `janelaEdicoes` edições mais recentes do banco.
 *
 * A janela é o que torna o número honesto: as 27 edições importadas cobrem de
 * XVIII a XLV, e o peso das matérias mudou no caminho — Processo do Trabalho
 * passou Direito do Trabalho nas mais recentes. Média histórica descreve o
 * passado; a janela curta é o que se parece com a próxima prova.
 */
export async function coberturaDeSubjects(
  subjectIds: string[],
  janelaEdicoes: number,
): Promise<Cobertura> {
  const vazio: Cobertura = { percentual: 0, questoesCobertas: 0, questoesNaJanela: 0, edicoes: [] }
  if (subjectIds.length === 0 || janelaEdicoes <= 0) return vazio

  const questoes = await fetchAllRows<{ banca: string | null; subject_id: string }>(() =>
    supabaseAdmin.from("questions").select("banca, subject_id"),
  )

  const comEdicao = questoes
    .map((q) => ({ ed: edicaoDaBanca(q.banca), subject_id: q.subject_id }))
    .filter((q): q is { ed: number; subject_id: string } => q.ed !== null)

  if (comEdicao.length === 0) return vazio

  const edicoes = [...new Set(comEdicao.map((q) => q.ed))]
    .sort((a, b) => b - a)
    .slice(0, janelaEdicoes)

  const naJanela = new Set(edicoes)
  const alvo = new Set(subjectIds)
  const daJanela = comEdicao.filter((q) => naJanela.has(q.ed))
  const cobertas = daJanela.filter((q) => alvo.has(q.subject_id)).length

  return {
    percentual: daJanela.length > 0 ? (cobertas * 100) / daJanela.length : 0,
    questoesCobertas: cobertas,
    questoesNaJanela: daJanela.length,
    edicoes: edicoes.sort((a, b) => a - b),
  }
}
