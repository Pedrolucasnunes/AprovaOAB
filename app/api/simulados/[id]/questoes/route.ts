import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { logError } from "@/lib/logger"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: simuladoId } = await params

  if (!simuladoId) {
    return NextResponse.json({ error: "simuladoId inválido" }, { status: 400 })
  }

  const { user, supabase, error } = await requireUser()
  if (error) return error

  const { data, error: dbError } = await supabase
    .from("simulado_attempts")
    .select(`
      id,
      question_id,
      questions (
        id,
        enunciado,
        alternativa_a,
        alternativa_b,
        alternativa_c,
        alternativa_d,
        subject_id,
        topic_id
      ),
      simulado_respostas (
        resposta_usuario
      )
    `)
    .eq("simulado_id", simuladoId)
    .eq("user_id", user.id)
    .order("ordem", { nullsFirst: false })

  if (dbError) {
    logError(dbError, { area: "simulados-questoes", userId: user.id, simuladoId })
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Busca nomes das matérias
  const subjectIds = [...new Set(
    data.map((row: any) => row.questions?.subject_id).filter(Boolean)
  )]

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .in("id", subjectIds.length > 0 ? subjectIds : ["null"])

  const subjectMap = Object.fromEntries((subjects ?? []).map(s => [s.id, s.name]))

  const questions = data
    .map((row: any) => ({
      attemptId: row.id,
      ...row.questions,
      subject_name: subjectMap[row.questions?.subject_id] ?? "Desconhecida",
      topic_name: "",
      // Resposta já salva (recupera o progresso ao reabrir o simulado).
      // simulado_respostas é relação 1-1 (UNIQUE em attempt_id) → objeto, não array.
      resposta_usuario: row.simulado_respostas?.resposta_usuario ?? null,
    }))
    .filter((q: any) => q.id)

  return NextResponse.json({ questions }, { status: 200 })
}