// Carga do resultado de um simulado — a busca única.
//
// `/api/simulados/finalizar` e `/api/simulados/[id]/gabarito` montavam o MESMO
// gabarito com o mesmo código copiado (busca attempts, busca respostas, ordena
// por `ordem`, resolve subject, monta o array). Duas cópias da mesma regra é
// como as duas passam a discordar: a tela que você vê ao terminar a prova e a
// que você vê ao reabrir o simulado são a mesma tela.
//
// A diferença em relação ao que existia: o gabarito agora sai com AS 80
// QUESTÕES, não só as respondidas. Sem as não respondidas não há como separar
// "errei" de "não cheguei lá" — e branco é o caso comum (10 dos 14 simulados
// finalizados em set/2026 têm pelo menos um).
import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchByIds } from "@/lib/supabase-paginate"
import { acertosParaNotaDeCorte, type ItemGabarito } from "@/lib/simulado-resultado"

export interface ResultadoSimulado {
  id: string
  titulo: string | null
  numeroQuestoes: number
  /**
   * Gravado em `simulados` — é o que o dashboard usa em `taxaSimulados`.
   * `null` = ainda em andamento. Não coalescer pra `0`: quem zerou a prova tem
   * `0` de verdade, e o guard de "não terminou" deixaria de distinguir os dois.
   */
  percentual: number | null
  startedAt: string | null
  criadoEm: string
  /** Acertos necessários pra nota de corte, sobre o total real da prova. */
  notaDeCorte: number
  /**
   * `false` nos simulados gerados antes de `gerar` passar a gravar `ordem`
   * (2 dos 15 da base, abr e mai/2026: os 80 attempts têm `ordem` nula). Sem
   * ordem não existe "posição na prova", então a tela esconde o mapa e a curva
   * em vez de numerar as questões por uma ordem que o banco não garante.
   */
  temOrdem: boolean
  /** Simulado finalizado imediatamente anterior a este, pra comparação. */
  anterior: {
    percentual: number
    acertos: number
    numeroQuestoes: number
    criadoEm: string
  } | null
  gabarito: ItemGabarito[]
}

interface LinhaSimulado {
  id: string
  titulo: string | null
  numero_questoes: number | null
  acertos: number | null
  percentual: number | null
  started_at: string | null
  created_at: string
}

/**
 * Duas idas ao banco, não cinco.
 *
 * A 1ª leva tudo que não depende de nada: os simulados do usuário (que já
 * trazem ESTE e o anterior — não precisa de consulta separada pra comparação),
 * os attempts e as matérias (tabela de ~20 linhas, sem filtro pra não esperar
 * os ids das questões). A 2ª leva respostas e questões, que dependem da 1ª.
 */
export async function carregarResultadoSimulado(
  supabase: SupabaseClient,
  userId: string,
  simuladoId: string,
): Promise<ResultadoSimulado | null> {
  const [{ data: simulados }, { data: attempts }, { data: subjects }] = await Promise.all([
    supabase
      .from("simulados")
      .select("id, titulo, numero_questoes, acertos, percentual, started_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("simulado_attempts")
      .select("id, question_id, ordem")
      .eq("simulado_id", simuladoId)
      .eq("user_id", userId),
    supabase.from("subjects").select("id, name"),
  ])

  const simulado = (simulados as LinhaSimulado[] | null)?.find((s) => s.id === simuladoId)
  if (!simulado || !attempts || attempts.length === 0) return null

  const attemptIds = attempts.map((a) => a.id as string)
  const questionIds = [...new Set(attempts.map((a) => a.question_id as string))]

  const [respostas, questions] = await Promise.all([
    fetchByIds<{ attempt_id: string; resposta_usuario: string | null; acertou: boolean | null }>(
      (ids) =>
        supabase
          .from("simulado_respostas")
          .select("attempt_id, resposta_usuario, acertou")
          .in("attempt_id", ids),
      attemptIds,
    ),
    fetchByIds<{
      id: string
      enunciado: string | null
      resposta_correta: string | null
      explicacao: string | null
      alternativa_a: string | null
      alternativa_b: string | null
      alternativa_c: string | null
      alternativa_d: string | null
      subject_id: string | null
    }>(
      (ids) =>
        supabase
          .from("questions")
          .select(
            "id, enunciado, resposta_correta, explicacao, alternativa_a, alternativa_b, alternativa_c, alternativa_d, subject_id",
          )
          .in("id", ids),
      questionIds,
    ),
  ])

  const nomeDaMateria = new Map((subjects ?? []).map((s) => [s.id as string, s.name as string]))
  const questaoPorId = new Map(questions.map((q) => [q.id, q]))
  const respostaPorAttempt = new Map(respostas.map((r) => [r.attempt_id, r]))

  const temOrdem = attempts.every((a) => a.ordem !== null && a.ordem !== undefined)

  // Sem `ordem` no banco, a ordem de retorno do PostgREST é arbitrária: ordenar
  // por matéria + id ao menos mantém a lista igual entre dois carregamentos.
  const ordenados = temOrdem
    ? [...attempts].sort((a, b) => (a.ordem as number) - (b.ordem as number))
    : [...attempts].sort((a, b) => {
        const ma = nomeDaMateria.get(questaoPorId.get(a.question_id)?.subject_id ?? "") ?? ""
        const mb = nomeDaMateria.get(questaoPorId.get(b.question_id)?.subject_id ?? "") ?? ""
        return ma.localeCompare(mb, "pt-BR") || (a.question_id as string).localeCompare(b.question_id)
      })

  const gabarito: ItemGabarito[] = ordenados.map((attempt, indice) => {
    const questao = questaoPorId.get(attempt.question_id as string)
    const resposta = respostaPorAttempt.get(attempt.id as string)

    return {
      questionId: attempt.question_id as string,
      ordem: indice,
      enunciado: questao?.enunciado ?? "",
      alternativaA: questao?.alternativa_a ?? "",
      alternativaB: questao?.alternativa_b ?? "",
      alternativaC: questao?.alternativa_c ?? "",
      alternativaD: questao?.alternativa_d ?? "",
      // Ausência de linha em `simulado_respostas` É a questão em branco: a rota
      // de resposta rejeita corpo sem letra, então não existe linha "vazia".
      respostaUsuario: resposta?.resposta_usuario ?? null,
      respostaCorreta: questao?.resposta_correta ?? "",
      acertou: resposta ? (resposta.acertou ?? false) : null,
      explicacao: questao?.explicacao ?? null,
      subjectId: questao?.subject_id ?? null,
      subjectName: nomeDaMateria.get(questao?.subject_id ?? "") ?? "Sem matéria",
    }
  })

  const anteriores = (simulados as LinhaSimulado[])
    .filter((s) => s.percentual !== null && s.created_at < simulado.created_at)
  const anterior = anteriores.at(-1)

  const numeroQuestoes = simulado.numero_questoes ?? gabarito.length

  return {
    id: simulado.id,
    titulo: simulado.titulo,
    numeroQuestoes,
    percentual: simulado.percentual,
    startedAt: simulado.started_at,
    criadoEm: simulado.created_at,
    notaDeCorte: acertosParaNotaDeCorte(numeroQuestoes),
    temOrdem,
    anterior: anterior
      ? {
          percentual: anterior.percentual as number,
          acertos: anterior.acertos ?? 0,
          numeroQuestoes: anterior.numero_questoes ?? 0,
          criadoEm: anterior.created_at,
        }
      : null,
    gabarito,
  }
}
