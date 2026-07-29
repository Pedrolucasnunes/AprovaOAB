// Placar de desempenho por matéria — a fusão única.
//
// Antes deste arquivo a mesma agregação existia em três lugares, com três regras
// diferentes: o passo 5.5 de /api/dashboard somava avulsas + simulado, o passo
// 2.5 de /api/treino somava só avulsas, e recomputarResultados filtrava tempo
// mas só olhava o diagnóstico. Nenhuma view do banco entrega isso —
// `desempenho_materia` não agrega e ignora `question_attempts`; `materias_risco`
// só cobre simulado.
//
// A divergência não era cosmética: a matéria cujas respostas do diagnóstico
// foram todas descartadas por virem em menos de 3s aparecia como "não medimos"
// na tela de resultado e, ao mesmo tempo, como matéria crítica dirigindo 70% do
// treino. Uma régua só resolve isso por construção.
//
// DUAS CONTAGENS, DE PROPÓSITO:
//   total/acertos             -> ORDENAÇÃO. Acumula tudo (diagnóstico + treino +
//                                simulado). É o que decide por onde começar.
//   totalTreino/acertosTreino -> CLASSIFICAÇÃO. Sem o diagnóstico. É o que
//                                libera o rótulo de banda ("crítico").
//
// O diagnóstico ordena, não carimba: 2 questões por matéria apontam direção, mas
// não sustentam dizer a alguém que ele é crítico numa disciplina.
import type { SupabaseClient } from "@supabase/supabase-js"
import { getDiagnosticoConfig } from "@/lib/config"
import { fetchAllRows, fetchByIds } from "@/lib/supabase-paginate"

export interface PlacarMateria {
  subject_id: string
  /** Acumulado no escopo pedido — base da ORDENAÇÃO. */
  acertos: number
  total: number
  /** Sem o diagnóstico — base da CLASSIFICAÇÃO (rótulo de banda). */
  acertosTreino: number
  totalTreino: number
  /** Respostas ignoradas por virem abaixo de `minTempoRespostaMs`. */
  descartadas: number
}

/**
 * `"tudo"` soma diagnóstico + treino avulso + simulado.
 * `"diagnostico"` fica só no diagnóstico — é o retrato que a tela de resultado
 * mostra, que não pode mudar quando o usuário treina depois.
 */
export type EscopoPlacar = "tudo" | "diagnostico"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Cliente = SupabaseClient<any, any, any>

interface AttemptRow {
  question_id: string
  acertou: boolean
  is_diagnostic: boolean
  time_spent_ms: number | null
}

function vazio(subject_id: string): PlacarMateria {
  return { subject_id, acertos: 0, total: 0, acertosTreino: 0, totalTreino: 0, descartadas: 0 }
}

/**
 * Placar por matéria do usuário.
 *
 * O filtro de baixa confiança vale para TODAS as fontes que têm tempo gravado,
 * não só o diagnóstico: respostas abaixo do piso acertam menos que o chute puro,
 * então são clique e não resposta, venham de onde vierem.
 *
 * `time_spent_ms` nulo conta como válida. É o caso das 384 respostas de treino
 * anteriores à instrumentação e das respostas de simulado (que não têm a coluna):
 * descartar por ausência de dado apagaria metade do histórico. Consequência
 * aceita: o filtro é prospectivo.
 */
export async function placarPorMateria(
  supabase: Cliente,
  userId: string,
  escopo: EscopoPlacar = "tudo",
): Promise<Map<string, PlacarMateria>> {
  const { minTempoRespostaMs } = await getDiagnosticoConfig()

  const attempts = await fetchAllRows<AttemptRow>(() => {
    const q = supabase
      .from("question_attempts")
      .select("question_id, acertou, is_diagnostic, time_spent_ms")
      .eq("user_id", userId)
    return escopo === "diagnostico" ? q.eq("is_diagnostic", true) : q
  })

  // Simulado só entra no escopo "tudo": ele não faz parte do diagnóstico.
  let simulado: { question_id: string; acertou: boolean }[] = []
  if (escopo === "tudo") {
    const attemptIds = (
      await fetchAllRows<{ id: string }>(() =>
        supabase.from("simulado_attempts").select("id").eq("user_id", userId),
      )
    ).map((a) => a.id)

    simulado = await fetchByIds<{ question_id: string; acertou: boolean }>(
      (ids) => supabase.from("simulado_respostas").select("question_id, acertou").in("attempt_id", ids),
      attemptIds,
    )
  }

  const questionIds = [
    ...new Set([...attempts.map((a) => a.question_id), ...simulado.map((r) => r.question_id)]),
  ]
  if (questionIds.length === 0) return new Map()

  const questoes = await fetchByIds<{ id: string; subject_id: string }>(
    (ids) => supabase.from("questions").select("id, subject_id").in("id", ids),
    questionIds,
  )
  const subjectDaQuestao = new Map(questoes.map((q) => [q.id, q.subject_id]))

  const placar = new Map<string, PlacarMateria>()

  for (const a of attempts) {
    const sid = subjectDaQuestao.get(a.question_id)
    if (!sid) continue
    const p = placar.get(sid) ?? vazio(sid)

    if (a.time_spent_ms !== null && a.time_spent_ms < minTempoRespostaMs) {
      p.descartadas += 1
    } else {
      p.total += 1
      if (a.acertou) p.acertos += 1
      // O diagnóstico entra no acumulado (ordenação) mas fica fora da amostra
      // que libera o rótulo (classificação).
      if (!a.is_diagnostic) {
        p.totalTreino += 1
        if (a.acertou) p.acertosTreino += 1
      }
    }

    placar.set(sid, p)
  }

  // Simulado não tem `time_spent_ms` (a coluna não existe em simulado_respostas),
  // então nenhuma resposta de simulado é descartável hoje. É a fonte não filtrada
  // conhecida do placar. Conta como treino: é medição, não é o diagnóstico.
  for (const r of simulado) {
    const sid = subjectDaQuestao.get(r.question_id)
    if (!sid) continue
    const p = placar.get(sid) ?? vazio(sid)
    p.total += 1
    p.totalTreino += 1
    if (r.acertou) {
      p.acertos += 1
      p.acertosTreino += 1
    }
    placar.set(sid, p)
  }

  return placar
}

/** Taxa de acerto acumulada (0–100). `null` quando não há resposta válida. */
export function taxaDoPlacar(p: PlacarMateria): number | null {
  return p.total > 0 ? parseFloat(((p.acertos / p.total) * 100).toFixed(2)) : null
}
