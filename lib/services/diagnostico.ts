// Consolidação do mapa por matéria do diagnóstico.
//
// `diagnostic_subject_results` é derivada: a fonte da verdade continua sendo
// `question_attempts` com `is_diagnostic = true`. Por isso recalculamos o mapa
// inteiro a cada conclusão de módulo em vez de somar incrementalmente — assim
// m0 (legado), m1 e m2 convergem sozinhos, sem merge manual e sem risco de
// contar duas vezes se um POST for reprocessado.
import { placarPorMateria } from "@/lib/services/desempenho"
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
  // Escopo "diagnostico": o mapa é o retrato do que O DIAGNÓSTICO mediu. Com o
  // escopo "tudo", um "0/2 em Penal" viraria "2/6" depois de algumas questões de
  // treino e a tela deixaria de ser o que promete ser. Quem acumula as duas
  // fontes é o placar que ordena o treino e os cards do dashboard.
  const placar = await placarPorMateria(supabaseAdmin, userId, "diagnostico")
  if (placar.size === 0) return []

  // O módulo de origem não está no placar (ele agrega por matéria, não por
  // módulo), então vem de uma leitura própria — é só rótulo de procedência.
  const modulos = await fetchAllRows<{ question_id: string; diagnostic_module: string | null }>(() =>
    supabaseAdmin
      .from("question_attempts")
      .select("question_id, diagnostic_module")
      .eq("user_id", userId)
      .eq("is_diagnostic", true),
  )

  const questoes = await fetchByIds<{ id: string; subject_id: string }>(
    (ids) => supabaseAdmin.from("questions").select("id, subject_id").in("id", ids),
    [...new Set(modulos.map((a) => a.question_id))],
  )
  const subjectDaQuestao = new Map(questoes.map((q) => [q.id, q.subject_id]))

  // Guarda o módulo mais recente que contribuiu (m2 > m1 > m0).
  const moduloPorMateria = new Map<string, string>()
  for (const a of modulos) {
    const sid = subjectDaQuestao.get(a.question_id)
    if (!sid) continue
    const mod = a.diagnostic_module ?? "m0"
    if (mod > (moduloPorMateria.get(sid) ?? "")) moduloPorMateria.set(sid, mod)
  }

  // total = 0 significa matéria com TODAS as respostas descartadas: não ganha
  // linha. É a regra que sustenta "linha existe = matéria medida" — e o
  // CHECK (total > 0) no banco torna isso impossível de violar por acidente.
  const linhas: ResultadoMateria[] = [...placar.values()]
    .filter((p) => p.total > 0)
    .map((p) => ({
      subject_id: p.subject_id,
      modulo: moduloPorMateria.get(p.subject_id) ?? "m0",
      acertos: p.acertos,
      total: p.total,
      descartadas: p.descartadas,
    }))

  if (linhas.length === 0) return []

  const { error } = await supabaseAdmin.from("diagnostic_subject_results").upsert(
    linhas.map((r) => ({ ...r, user_id: userId, measured_at: new Date().toISOString() })),
    { onConflict: "user_id,subject_id" },
  )
  if (error) throw error

  return linhas
}
