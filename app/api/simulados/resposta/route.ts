import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { checkDailyLimit } from "@/lib/check-daily-limit"
import { EVENTOS, track } from "@/lib/events"
import { logError } from "@/lib/logger"

const DURACAO_SIMULADO_MS = 5 * 60 * 60 * 1000 // 5 horas

export async function POST(req: NextRequest) {
  const { user, supabase, plano, error } = await requireUser()
  if (error) return error

  const userId = user.id

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  // ✅ userId vem do Auth — ignora userId do body
  const { questionId, simuladoId, resposta } = body

  // Tempo de resposta: alimenta o filtro de baixa confiança (< minTempoRespostaMs)
  // que o diagnóstico já aplica. Nunca rejeita a resposta — valor ausente, não
  // numérico ou fora da faixa vira null, e null conta como resposta válida.
  // O teto de 30 min é o mesmo de /api/diagnostico/responder: acima disso a aba
  // ficou aberta, não é tempo de leitura.
  const rawTempo = body.time_spent_ms
  const timeSpentMs =
    typeof rawTempo === "number" && Number.isFinite(rawTempo) && rawTempo >= 0 && rawTempo <= 1_800_000
      ? Math.round(rawTempo)
      : null

  if (!questionId || !resposta) {
    return NextResponse.json(
      { error: "questionId e resposta são obrigatórios" },
      { status: 400 }
    )
  }

  const respostaFormatada = String(resposta).toUpperCase().trim()

  if (!["A", "B", "C", "D"].includes(respostaFormatada)) {
    return NextResponse.json(
      { error: "Resposta inválida. Use A, B, C ou D" },
      { status: 400 }
    )
  }

  // Esta rota roda a CADA questão respondida (treino, questões e simulado), então
  // o número de idas ao banco em sequência é o que define a sensação de lentidão
  // ao estudar. As leituras de validação são independentes entre si e vão juntas;
  // a ESCRITA continua depois de todas elas, e a ordem em que os erros são
  // checados é a mesma de antes (gabarito → ownership → estado do simulado).
  const gabarito = supabase
    .from("questions")
    .select("resposta_correta")
    .eq("id", questionId)
    .single()

  let acertou = false
  // Só o ramo de treino devolve o gabarito — no simulado ele fica vazio de
  // propósito (ver o comentário do retorno lá embaixo).
  let respostaCorreta = ""

  if (simuladoId) {
    const [
      { data: question, error: qError },
      { data: attempt, error: atError },
      { data: simulado },
    ] = await Promise.all([
      gabarito,
      // ✅ Verifica que o attempt pertence ao usuário autenticado
      supabase
        .from("simulado_attempts")
        .select("id")
        .eq("simulado_id", simuladoId)
        .eq("question_id", questionId)
        .eq("user_id", userId) // ← garante ownership
        .single(),
      // Server-side timeout: rejeita respostas após 5h do started_at
      supabase
        .from("simulados")
        .select("started_at, percentual")
        .eq("id", simuladoId)
        .eq("user_id", userId)
        .single(),
    ])

    // O gabarito foi buscado em paralelo, então pode ter vindo mesmo quando a
    // validação falha — mas ele nunca é devolvido no ramo de simulado, então não
    // há como vazar resposta correta em tempo de prova.
    if (qError || !question) {
      return NextResponse.json({ error: "Questão não encontrada" }, { status: 404 })
    }

    if (atError || !attempt) {
      logError(atError ?? new Error("Attempt não encontrado"), {
        area: "simulados-resposta", userId, simuladoId, questionId, phase: "ownership-check",
      })
      return NextResponse.json(
        { error: "Questão não pertence a este simulado" },
        { status: 404 }
      )
    }

    if (simulado?.percentual !== null && simulado?.percentual !== undefined) {
      return NextResponse.json(
        { error: "Simulado já finalizado", finalizado: true },
        { status: 409 }
      )
    }

    if (simulado?.started_at) {
      const elapsed = Date.now() - new Date(simulado.started_at).getTime()
      if (elapsed > DURACAO_SIMULADO_MS) {
        return NextResponse.json(
          { error: "Tempo do simulado esgotado", expired: true },
          { status: 409 }
        )
      }
    }

    acertou = respostaFormatada === question.resposta_correta.toUpperCase().trim()

    const { error: rError } = await supabase
      .from("simulado_respostas")
      .upsert(
        {
          attempt_id: attempt.id,
          question_id: questionId,
          resposta_usuario: respostaFormatada,
          acertou,
        },
        { onConflict: "attempt_id" }
      )

    if (rError) {
      logError(rError, { area: "simulados-resposta", userId, simuladoId, questionId, phase: "upsert-resposta" })
      return NextResponse.json({ error: rError.message }, { status: 500 })
    }

  } else {
    // Treino avulso. `plano` vem do guard (mesma linha de `users` que o `role`),
    // então o limite diário pode ser contado em paralelo com o gabarito —
    // checkDailyLimit retorna cedo, sem consultar, para quem não é free.
    const [{ data: question, error: qError }, limit] = await Promise.all([
      gabarito,
      checkDailyLimit(supabase, userId, plano),
    ])

    if (qError || !question) {
      return NextResponse.json({ error: "Questão não encontrada" }, { status: 404 })
    }

    respostaCorreta = question.resposta_correta
    acertou = respostaFormatada === respostaCorreta.toUpperCase().trim()

    if (limit.exceeded) {
      // Métrica de preço: registra a resposta RECUSADA, não só "chegou a 10".
      // A reconstrução por question_attempts mostra quem alcançou o teto; só o
      // evento mostra quem quis passar dele.
      void track(userId, EVENTOS.LIMITE_DIARIO_ATINGIDO, {
        origem: "resposta",
        motivo: "teto",
        limite: limit.limit,
        count: limit.count,
      })
      return NextResponse.json(
        { error: "Você atingiu o limite de 10 questões por dia no plano Grátis.", upgrade: true, limiteDiario: true },
        { status: 403 }
      )
    }

    // Salva em question_attempts
    const { error: qaError } = await supabase
      .from("question_attempts")
      .insert({
        user_id: userId,
        question_id: questionId,
        resposta_usuario: respostaFormatada,
        acertou,
        time_spent_ms: timeSpentMs,
      })

    if (qaError) {
      // Trigger atômico do banco — defesa contra race condition que escapa do checkDailyLimit acima.
      if (qaError.message?.includes("free_daily_limit_exceeded")) {
        return NextResponse.json(
          { error: "Você atingiu o limite de 10 questões por dia no plano Grátis.", upgrade: true, limiteDiario: true },
          { status: 403 }
        )
      }
      logError(qaError, { area: "simulados-resposta", userId, questionId, phase: "insert-treino" })
      return NextResponse.json({ error: qaError.message }, { status: 500 })
    }

  }

  // No simulado, NÃO devolve acertou/resposta_correta — senão o usuário veria o gabarito
  // em tempo de prova (DevTools) e poderia corrigir a resposta. O treino mostra na hora.
  return NextResponse.json(
    simuladoId
      ? { ok: true }
      : { acertou, resposta_correta: respostaCorreta },
    { status: 200 }
  )
}