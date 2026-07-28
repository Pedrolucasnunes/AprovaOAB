// Consolidação do mapa por matéria do diagnóstico.
//
// `diagnostic_subject_results` é derivada: a fonte da verdade continua sendo
// `question_attempts` com `is_diagnostic = true`. Por isso recalculamos o mapa
// inteiro a cada conclusão de módulo em vez de somar incrementalmente — assim
// m0 (legado), m1 e m2 convergem sozinhos, sem merge manual e sem risco de
// contar duas vezes se um POST for reprocessado.
import { getDiagnosticoConfig } from "@/lib/config"
import { fetchAllRows, fetchByIds } from "@/lib/supabase-paginate"
import { supabaseAdmin } from "@/lib/supabase-admin"

export interface ResultadoMateria {
  subject_id: string
  modulo: string
  acertos: number
  total: number
  descartadas: number
}

/** Matérias que já têm medição válida — linha em diagnostic_subject_results. */
export async function subjectsMedidos(userId: string): Promise<Set<string>> {
  const { data } = await supabaseAdmin
    .from("diagnostic_subject_results")
    .select("subject_id")
    .eq("user_id", userId)
  return new Set((data ?? []).map((r) => r.subject_id as string))
}

/**
 * Matérias do módulo que ainda não têm medição.
 *
 * "Medida" = tem ao menos uma resposta válida, não "tem as N questões que o
 * módulo promete". Perseguir profundidade total faria o módulo pedir mais
 * questões toda vez que uma resposta caísse no filtro de tempo, e o usuário
 * nunca sairia dele. A tela já é explícita sobre a medição ser rasa.
 */
export async function materiasPendentes(userId: string, subjects: string[]): Promise<string[]> {
  const medidos = await subjectsMedidos(userId)
  return subjects.filter((s) => !medidos.has(s))
}

/**
 * Recalcula e grava o mapa por matéria do usuário.
 *
 * Respostas abaixo de `minTempoRespostaMs` não entram em acertos/total: elas
 * acertam 15% contra os 25% do chute puro, ou seja, são clique e não resposta.
 * Contam em `descartadas` só pra tela poder ser honesta sobre o que ignorou.
 *
 * Matéria cujas respostas foram TODAS descartadas não ganha linha. É a regra
 * que sustenta "linha existe = matéria medida" — e o CHECK (total > 0) no banco
 * torna isso impossível de violar por acidente.
 */
export async function recomputarResultados(userId: string): Promise<ResultadoMateria[]> {
  const { minTempoRespostaMs } = await getDiagnosticoConfig()

  const attempts = await fetchAllRows<{
    question_id: string
    acertou: boolean
    time_spent_ms: number | null
    diagnostic_module: string | null
  }>(() =>
    supabaseAdmin
      .from("question_attempts")
      .select("question_id, acertou, time_spent_ms, diagnostic_module")
      .eq("user_id", userId)
      .eq("is_diagnostic", true),
  )

  if (attempts.length === 0) return []

  const questoes = await fetchByIds<{ id: string; subject_id: string }>(
    (ids) => supabaseAdmin.from("questions").select("id, subject_id").in("id", ids),
    [...new Set(attempts.map((a) => a.question_id))],
  )
  const subjectDaQuestao = new Map(questoes.map((q) => [q.id, q.subject_id]))

  const porMateria = new Map<string, ResultadoMateria>()
  for (const a of attempts) {
    const subjectId = subjectDaQuestao.get(a.question_id)
    if (!subjectId) continue

    const atual = porMateria.get(subjectId) ?? {
      subject_id: subjectId,
      modulo: a.diagnostic_module ?? "m0",
      acertos: 0,
      total: 0,
      descartadas: 0,
    }

    // time_spent_ms nulo (dados antigos) conta como válida: sem medição não dá
    // pra afirmar que foi clique, e descartar por ausência de dado apagaria
    // metade do histórico.
    const rapidaDemais = a.time_spent_ms !== null && a.time_spent_ms < minTempoRespostaMs
    if (rapidaDemais) {
      atual.descartadas += 1
    } else {
      atual.total += 1
      if (a.acertou) atual.acertos += 1
    }

    // Guarda o módulo mais recente que contribuiu (m2 > m1 > m0).
    if ((a.diagnostic_module ?? "m0") > atual.modulo) atual.modulo = a.diagnostic_module ?? "m0"

    porMateria.set(subjectId, atual)
  }

  const linhas = [...porMateria.values()].filter((r) => r.total > 0)
  if (linhas.length === 0) return []

  const { error } = await supabaseAdmin.from("diagnostic_subject_results").upsert(
    linhas.map((r) => ({ ...r, user_id: userId, measured_at: new Date().toISOString() })),
    { onConflict: "user_id,subject_id" },
  )
  if (error) throw error

  return linhas
}
