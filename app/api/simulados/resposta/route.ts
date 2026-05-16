import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { checkDailyLimit } from "@/lib/check-daily-limit"
import { logError } from "@/lib/logger"

const DURACAO_SIMULADO_MS = 5 * 60 * 60 * 1000 // 5 horas

export async function POST(req: NextRequest) {
  const { user, supabase, error } = await requireUser()
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

  // Busca o gabarito
  const { data: question, error: qError } = await supabase
    .from("questions")
    .select("resposta_correta")
    .eq("id", questionId)
    .single()

  if (qError || !question) {
    return NextResponse.json({ error: "Questão não encontrada" }, { status: 404 })
  }

  const acertou = respostaFormatada === question.resposta_correta.toUpperCase().trim()

  if (simuladoId) {
    // ✅ Verifica que o attempt pertence ao usuário autenticado
    const { data: attempt, error: atError } = await supabase
      .from("simulado_attempts")
      .select("id")
      .eq("simulado_id", simuladoId)
      .eq("question_id", questionId)
      .eq("user_id", userId) // ← garante ownership
      .single()

    if (atError || !attempt) {
      logError(atError ?? new Error("Attempt não encontrado"), {
        area: "simulados-resposta", userId, simuladoId, questionId, phase: "ownership-check",
      })
      return NextResponse.json(
        { error: "Questão não pertence a este simulado" },
        { status: 404 }
      )
    }

    // Server-side timeout: rejeita respostas após 5h do started_at
    const { data: simulado } = await supabase
      .from("simulados")
      .select("started_at, percentual")
      .eq("id", simuladoId)
      .eq("user_id", userId)
      .single()

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
    // Treino avulso — verifica limite diário para plano free
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("plano")
      .eq("id", userId)
      .single()

    const plano = (userData?.plano ?? "free") as "free" | "pro" | "aprovacao"
    const limit = await checkDailyLimit(supabase, userId, plano)

    if (limit.exceeded) {
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
      })

    if (qaError) {
      logError(qaError, { area: "simulados-resposta", userId, questionId, phase: "insert-treino" })
      return NextResponse.json({ error: qaError.message }, { status: 500 })
    }

  }

  // No simulado, NÃO devolve acertou/resposta_correta — senão o usuário veria o gabarito
  // em tempo de prova (DevTools) e poderia corrigir a resposta. O treino mostra na hora.
  return NextResponse.json(
    simuladoId
      ? { ok: true }
      : { acertou, resposta_correta: question.resposta_correta },
    { status: 200 }
  )
}