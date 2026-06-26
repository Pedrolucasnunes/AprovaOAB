// Stats agregados (server-only) das páginas públicas de SEO. Usa supabaseAdmin:
// roda só no servidor (SSG/ISR), a service role key nunca vai pro cliente.
//
// O "% de alunos que erram esta questão" é dado PRODUCT-DERIVED (vem das respostas
// reais dos alunos) — o diferencial que concorrentes com as mesmas questões FGV não
// têm, e que NÃO revela a resolução comentada (`explicacao` segue gated).
//
// Regra anti–prova social fabricada: só retorna stat com amostra real >= MIN_ATTEMPTS;
// abaixo disso retorna null e a página não renderiza número nenhum.
import { supabaseAdmin } from "@/lib/supabase-admin"

const MIN_ATTEMPTS = 30

export type QuestionStat = {
  total: number // total de respostas (treino avulso + diagnóstico + simulados)
  errPct: number // % que errou, inteiro arredondado
}

// Conta acertos/total cruzando as duas fontes de resposta:
//   - question_attempts (treino avulso + diagnóstico): tem question_id + acertou
//   - simulado_respostas (simulados completos): tem question_id + acertou
// Usa counts com head:true (não traz linhas) para não esbarrar no teto de 1000 do
// PostgREST em questões muito respondidas.
export async function getQuestionErrorRate(questionId: string): Promise<QuestionStat | null> {
  const [totalAttempts, acertosAttempts, totalSim, acertosSim] = await Promise.all([
    supabaseAdmin
      .from("question_attempts")
      .select("id", { count: "exact", head: true })
      .eq("question_id", questionId),
    supabaseAdmin
      .from("question_attempts")
      .select("id", { count: "exact", head: true })
      .eq("question_id", questionId)
      .eq("acertou", true),
    supabaseAdmin
      .from("simulado_respostas")
      .select("id", { count: "exact", head: true })
      .eq("question_id", questionId),
    supabaseAdmin
      .from("simulado_respostas")
      .select("id", { count: "exact", head: true })
      .eq("question_id", questionId)
      .eq("acertou", true),
  ])

  const total = (totalAttempts.count ?? 0) + (totalSim.count ?? 0)
  if (total < MIN_ATTEMPTS) return null

  const acertos = (acertosAttempts.count ?? 0) + (acertosSim.count ?? 0)
  const errPct = Math.round((1 - acertos / total) * 100)
  return { total, errPct }
}
