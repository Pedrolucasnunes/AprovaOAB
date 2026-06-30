import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/lib/auth-server"
import { logError } from "@/lib/logger"

const schema = z.object({
  question_id: z.string().uuid(),
  resposta: z.enum(["A", "B", "C", "D"]),
  time_spent_ms: z.number().int().min(0).max(1_800_000),
  changed_answer: z.boolean(),
})

export async function POST(req: NextRequest) {
  const { user, supabase, error } = await requireUser()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const { question_id, resposta, time_spent_ms, changed_answer } = parsed.data

  const { data: question, error: qError } = await supabase
    .from("questions")
    .select("resposta_correta, explicacao")
    .eq("id", question_id)
    .single()

  if (qError || !question) {
    return NextResponse.json({ error: "Questão não encontrada" }, { status: 404 })
  }

  const respostaCorreta = String(question.resposta_correta).toUpperCase().trim()
  const acertou = resposta === respostaCorreta

  // Idempotency leve: duplo-click ou retry de rede dentro de 5s retorna o mesmo resultado.
  const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString()
  const { data: existing } = await supabase
    .from("question_attempts")
    .select("acertou")
    .eq("user_id", user.id)
    .eq("question_id", question_id)
    .gte("created_at", fiveSecondsAgo)
    .limit(1)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      correta: respostaCorreta,
      acertou: existing.acertou,
      explicacao: question.explicacao ?? null,
    })
  }

  // Backstop da trava de 1x: o diagnóstico tem 5 questões. Quem já tem 5 não grava mais
  // (defesa server-side contra hit direto na API ou corrida do caso "abandonou em 4, reabriu").
  const { count: diagCount } = await supabase
    .from("question_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_diagnostic", true)

  if ((diagCount ?? 0) >= 5) {
    return NextResponse.json(
      { error: "Diagnóstico já concluído", completed: true },
      { status: 409 }
    )
  }

  const { error: insertError } = await supabase
    .from("question_attempts")
    .insert({
      user_id: user.id,
      question_id,
      resposta_usuario: resposta,
      acertou,
      time_spent_ms,
      changed_answer,
      is_diagnostic: true,
    })

  if (insertError) {
    logError(insertError, { area: "diagnostico-responder", userId: user.id, question_id })
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    correta: respostaCorreta,
    acertou,
    explicacao: question.explicacao ?? null,
  })
}
