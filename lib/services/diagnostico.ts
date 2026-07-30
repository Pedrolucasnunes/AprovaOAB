// Consolidação do mapa por matéria do diagnóstico.
//
// `diagnostic_subject_results` é derivada: a fonte da verdade continua sendo
// `question_attempts` com `is_diagnostic = true`. Por isso recalculamos o mapa
// inteiro a cada conclusão de módulo em vez de somar incrementalmente — assim
// m0 (legado), m1 e m2 convergem sozinhos, sem merge manual e sem risco de
// contar duas vezes se um POST for reprocessado.
import { getDiagnosticoConfig } from "@/lib/config"
import { logError } from "@/lib/logger"
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

/**
 * Dados que o chamador já buscou, para não repetir a ida ao banco.
 *
 * O /api/dashboard já lê `diagnostic_subject_results` e já sabe quantas
 * tentativas de diagnóstico o usuário tem — sem isto, o mapa refazia as duas
 * consultas dentro da mesma requisição.
 */
export interface PreCarregado {
  medidos?: Set<string>
  attemptsDiagnostico?: number
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
 * Mapa consolidado do usuário, materializando na leitura se ainda não existe.
 *
 * Os ~23 usuários do diagnóstico legado (5 questões, `m0`) nunca passaram por
 * uma conclusão de módulo, que é onde o `responder` chama o recompute. Sem esta
 * materialização, quem lê `diagnostic_subject_results` cru vê zero matérias
 * medidas pra eles — e o dashboard passaria a oferecer "faltam 8 matérias, 16
 * questões" enquanto a tela de resultado, que recalcula, mostraria 2 ou 3
 * medidas. Duas telas discordando sobre o mesmo usuário.
 *
 * Custo: um write por usuário legado, na primeira leitura. Quem tem TODAS as
 * respostas descartadas (< 3s) não gera linha nenhuma e repete a tentativa a
 * cada leitura — são poucos, e a alternativa (persistir "não deu pra medir")
 * quebraria a invariante `CHECK (total > 0)` que sustenta "linha existe =
 * matéria medida".
 */
export async function mapaConsolidado(userId: string, pre?: PreCarregado): Promise<Set<string>> {
  const medidos = pre?.medidos ?? (await subjectsMedidos(userId))
  if (medidos.size > 0) return medidos

  let count = pre?.attemptsDiagnostico
  if (count === undefined) {
    const res = await supabaseAdmin
      .from("question_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_diagnostic", true)
    count = res.count ?? 0
  }

  if (count === 0) return medidos

  try {
    const linhas = await recomputarResultados(userId)
    return new Set(linhas.map((l) => l.subject_id))
  } catch (err) {
    logError(err, { area: "diagnostico-mapa-consolidado", userId })
    return medidos
  }
}

export interface ModuloPendente {
  id: string
  label: string
  /** Quantas questões FALTAM — não o tamanho nominal do módulo. */
  questoes: number
  materiasPendentes: number
  /** Profundidade da medição: 1 questão por matéria é mais raso que 2. */
  questoesPorMateria: number
}

/**
 * Próximo módulo com matéria pendente, ou null se o mapa está completo.
 *
 * "Próximo" é o que tem matéria PENDENTE, não o que não foi concluído: um
 * Módulo 1 respondido inteiro mas com 5 matérias sem medir (respostas rápidas
 * demais) ainda é o próximo, e oferecer o Módulo 2 nesse caso não cobriria
 * nenhuma delas.
 *
 * Mora aqui porque o dashboard e a tela de resultado precisam da MESMA resposta.
 * Quando eram dois cálculos, o dashboard não tinha nenhum — os entry points do
 * diagnóstico eram todos gateados em `!diagnosticoCompleto`, então o Módulo 2
 * ficava inalcançável pra quem saísse da tela de resultado.
 */
export async function proximoModuloPendente(
  userId: string,
  pre?: PreCarregado,
): Promise<ModuloPendente | null> {
  // Consolida na leitura: sem isso os usuários legados apareceriam com zero
  // matérias medidas e o card ofereceria o módulo inteiro de novo.
  const [{ modulos }, medidos] = await Promise.all([
    getDiagnosticoConfig(),
    mapaConsolidado(userId, pre),
  ])

  for (const m of modulos) {
    const pendentes = m.subjects.filter((id) => !medidos.has(id))
    if (pendentes.length === 0) continue
    return {
      id: m.id,
      label: m.label,
      questoes: pendentes.length * m.questoesPorMateria,
      materiasPendentes: pendentes.length,
      questoesPorMateria: m.questoesPorMateria,
    }
  }
  return null
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
