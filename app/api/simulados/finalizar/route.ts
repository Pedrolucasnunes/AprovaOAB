import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { logError } from "@/lib/logger"

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

  const { simuladoId } = body

  if (!simuladoId) {
    return NextResponse.json({ error: "simuladoId é obrigatório" }, { status: 400 })
  }

  // 1. Busca attempts — ✅ filtra por user_id para garantir ownership
  const { data: attempts, error: atError } = await supabase
    .from("simulado_attempts")
    .select("id, question_id")
    .eq("simulado_id", simuladoId)
    .eq("user_id", userId)

  if (atError || !attempts || attempts.length === 0) {
    logError(atError ?? new Error("Sem attempts"), {
      area: "simulados-finalizar", userId, simuladoId, phase: "fetch-attempts",
    })
    return NextResponse.json(
      { error: "Simulado não encontrado ou sem questões" },
      { status: 404 }
    )
  }

  const attemptIds = attempts.map((a) => a.id)

  // 2. Busca respostas
  const { data: respostas, error: rError } = await supabase
    .from("simulado_respostas")
    .select("attempt_id, question_id, resposta_usuario, acertou")
    .in("attempt_id", attemptIds)

  if (rError || !respostas) {
    logError(rError ?? new Error("Falha respostas"), {
      area: "simulados-finalizar", userId, simuladoId, phase: "fetch-respostas",
    })
    return NextResponse.json({ error: "Erro ao buscar respostas" }, { status: 500 })
  }

  if (respostas.length === 0) {
    return NextResponse.json({ error: "Nenhuma questão respondida" }, { status: 400 })
  }

  // 3. Busca numero_questoes do simulado (total oficial da prova, ex: 80)
  const { data: simData, error: simFetchError } = await supabase
    .from("simulados")
    .select("numero_questoes")
    .eq("id", simuladoId)
    .eq("user_id", userId)
    .single()

  if (simFetchError || !simData) {
    logError(simFetchError ?? new Error("Simulado não encontrado"), {
      area: "simulados-finalizar", userId, simuladoId, phase: "fetch-simulado",
    })
    return NextResponse.json({ error: "Simulado não encontrado" }, { status: 404 })
  }

  const numeroQuestoes = simData.numero_questoes ?? 80

  // 4. Calcula métricas — percentual sobre o total da prova, não só sobre as respondidas
  // Questões não respondidas contam como erros (padrão OAB)
  const total = respostas.length          // quantas o usuário respondeu
  const acertos = respostas.filter((r) => r.acertou).length
  const erros = numeroQuestoes - acertos  // inclui não respondidas
  const percentual = parseFloat(((acertos / numeroQuestoes) * 100).toFixed(2))

  console.log(`[finalizar] Resultado — acertos=${acertos} erros=${erros} percentual=${percentual}%`)

  // 4. Atualiza simulado — ✅ filtra por user_id para garantir ownership
  const { error: uError } = await supabase
    .from("simulados")
    .update({ acertos, erros, percentual })
    .eq("id", simuladoId)
    .eq("user_id", userId)

  if (uError) {
    logError(uError, { area: "simulados-finalizar", userId, simuladoId, phase: "update-simulado" })
    return NextResponse.json({ error: uError.message }, { status: 500 })
  }

  // 5. Busca gabarito
  const questionIds = respostas.map((r) => r.question_id)

  const { data: questions } = await supabase
    .from("questions")
    .select("id, enunciado, resposta_correta, subject_id")
    .in("id", questionIds)

  // 6. Busca nomes das matérias
  const subjectIds = [...new Set((questions ?? []).map((q) => q.subject_id).filter(Boolean))]
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .in("id", subjectIds.length > 0 ? subjectIds : ["null"])

  const subjectMap = Object.fromEntries((subjects ?? []).map((s) => [s.id, s.name]))
  const questionMap = Object.fromEntries((questions ?? []).map((q) => [q.id, q]))

  // 7. Monta gabarito
  const gabarito = respostas.map((r) => {
    const q = questionMap[r.question_id]
    return {
      question_id: r.question_id,
      enunciado: q?.enunciado ?? "",
      resposta_usuario: r.resposta_usuario,
      resposta_correta: q?.resposta_correta ?? "",
      acertou: r.acertou,
      subject_name: subjectMap[q?.subject_id] ?? "Desconhecida",
    }
  })

  console.log(`[finalizar] Gabarito montado com ${gabarito.length} questões`)

  return NextResponse.json({ acertos, erros, percentual, total, gabarito }, { status: 200 })
}