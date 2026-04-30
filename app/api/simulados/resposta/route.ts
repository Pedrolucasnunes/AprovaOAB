import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

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
      console.error(`[resposta] Attempt não encontrado para userId=${userId} simuladoId=${simuladoId} questionId=${questionId}`)
      return NextResponse.json(
        { error: "Questão não pertence a este simulado" },
        { status: 404 }
      )
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
      console.error("[resposta] Erro ao salvar resposta:", rError.message)
      return NextResponse.json({ error: rError.message }, { status: 500 })
    }

    console.log(`[resposta] Resposta salva — userId=${userId} questionId=${questionId} acertou=${acertou}`)
  } else {
    // Treino avulso — verifica limite diário para plano free
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("plano")
      .eq("id", userId)
      .single()

    if (userData?.plano === "free") {
      const hoje = new Date()
      hoje.setUTCHours(0, 0, 0, 0)

      const { count } = await supabase
        .from("question_attempts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", hoje.toISOString())

      if ((count ?? 0) >= 10) {
        return NextResponse.json(
          { error: "Você atingiu o limite de 10 questões por dia no plano Grátis.", upgrade: true, limiteDiario: true },
          { status: 403 }
        )
      }
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
      console.error("[resposta] Erro ao salvar treino:", qaError.message)
      return NextResponse.json({ error: qaError.message }, { status: 500 })
    }

    console.log(`[resposta] Treino salvo — userId=${userId} questionId=${questionId} acertou=${acertou}`)
  }

  return NextResponse.json(
    { acertou, resposta_correta: question.resposta_correta },
    { status: 200 }
  )
}