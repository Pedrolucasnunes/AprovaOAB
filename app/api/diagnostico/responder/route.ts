import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/lib/auth-server"

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
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({
    correta: respostaCorreta,
    acertou,
    explicacao: question.explicacao ?? null,
  })
}
