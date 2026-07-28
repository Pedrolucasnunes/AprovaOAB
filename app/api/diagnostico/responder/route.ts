import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/lib/auth-server"
import { EVENTOS, track } from "@/lib/events"
import { logError } from "@/lib/logger"
import { recomputarResultados } from "@/lib/services/diagnostico"
import { supabaseAdmin } from "@/lib/supabase-admin"

const schema = z.object({
  question_id: z.string().uuid(),
  resposta: z.enum(["A", "B", "C", "D"]),
  time_spent_ms: z.number().int().min(0).max(1_800_000),
  changed_answer: z.boolean(),
  modulo: z.string().min(1).default("m1"),
})

export async function POST(req: NextRequest) {
  const { user, supabase, error } = await requireUser()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const { question_id, resposta, time_spent_ms, changed_answer, modulo } = parsed.data

  const { data: sessao } = await supabaseAdmin
    .from("diagnostic_sessions")
    .select("id, question_ids, posicao, status")
    .eq("user_id", user.id)
    .eq("modulo", modulo)
    .maybeSingle()

  if (!sessao) {
    return NextResponse.json({ error: "SESSAO_NAO_ENCONTRADA" }, { status: 404 })
  }
  if (sessao.status === "concluida") {
    return NextResponse.json({ error: "MODULO_CONCLUIDO", concluido: true }, { status: 409 })
  }

  const ids: string[] = sessao.question_ids
  const esperada = ids[sessao.posicao]

  // Duplo-clique ou retry de rede: a questão anterior já foi gravada e `posicao`
  // já andou. Devolve o mesmo resultado em vez de 409 na cara do usuário.
  if (question_id !== esperada && sessao.posicao > 0 && ids[sessao.posicao - 1] === question_id) {
    const { data: anterior } = await supabaseAdmin
      .from("question_attempts")
      .select("acertou")
      .eq("user_id", user.id)
      .eq("question_id", question_id)
      .eq("is_diagnostic", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    const { data: q } = await supabase
      .from("questions")
      .select("resposta_correta, explicacao")
      .eq("id", question_id)
      .single()

    return NextResponse.json({
      correta: String(q?.resposta_correta ?? "").toUpperCase().trim(),
      acertou: anterior?.acertou ?? false,
      explicacao: q?.explicacao ?? null,
      posicao: sessao.posicao,
      total: ids.length,
      concluido: false,
    })
  }

  // Fora de ordem de verdade: a UI está dessincronizada da sessão. Devolve a
  // posição real pra ela se realinhar em vez de gravar a resposta errada.
  if (question_id !== esperada) {
    return NextResponse.json(
      { error: "FORA_DE_ORDEM", posicao: sessao.posicao, total: ids.length },
      { status: 409 },
    )
  }

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

  const { error: insertError } = await supabaseAdmin.from("question_attempts").insert({
    user_id: user.id,
    question_id,
    resposta_usuario: resposta,
    acertou,
    time_spent_ms,
    changed_answer,
    is_diagnostic: true,
    diagnostic_module: modulo,
  })

  if (insertError) {
    logError(insertError, { area: "diagnostico-responder", userId: user.id, question_id, modulo })
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  const novaPosicao = sessao.posicao + 1
  const concluido = novaPosicao >= ids.length

  await supabaseAdmin
    .from("diagnostic_sessions")
    .update({
      posicao: novaPosicao,
      ...(concluido ? { status: "concluida", completed_at: new Date().toISOString() } : {}),
    })
    .eq("id", sessao.id)

  void track(user.id, EVENTOS.DIAGNOSTICO_QUESTAO_RESPONDIDA, {
    modulo,
    posicao: novaPosicao,
    total: ids.length,
    time_spent_ms,
    acertou,
  })

  let materiasMedidas: number | null = null
  if (concluido) {
    try {
      // Consolida o mapa por matéria. Se falhar, a resposta do usuário já está
      // gravada — a tela de resultado recalcula na leitura, então não vale
      // derrubar a requisição por causa disso.
      const linhas = await recomputarResultados(user.id)
      materiasMedidas = linhas.length
    } catch (err) {
      logError(err, { area: "diagnostico-recomputar", userId: user.id, modulo })
    }

    void track(user.id, EVENTOS.DIAGNOSTICO_MODULO_CONCLUIDO, {
      modulo,
      total: ids.length,
      materiasMedidas,
    })
  }

  return NextResponse.json({
    correta: respostaCorreta,
    acertou,
    explicacao: question.explicacao ?? null,
    posicao: novaPosicao,
    total: ids.length,
    concluido,
  })
}
