import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { rateLimit } from "@/lib/rate-limit"
import { logError } from "@/lib/logger"

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, "simulados-gerar", 10, 60)
  if (!rl.success) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde alguns segundos." }, { status: 429 })
  }

  const { user, supabase, error } = await requireUser()
  if (error) return error

  const userId = user.id

  try {
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("plano")
      .eq("id", userId)
      .single()

    if (userData?.plano === "free") {
      return NextResponse.json(
        { error: "Simulados completos são exclusivos do plano Pro.", upgrade: true },
        { status: 403 }
      )
    }

    const { data: questions, error: qError } = await supabase
      .from("questions")
      .select("id")
      .limit(500)

    if (qError) {
      logError(qError, { area: "simulados-gerar", userId, phase: "fetch-questions" })
      return NextResponse.json({ error: qError.message }, { status: 500 })
    }

    if (!questions || questions.length < 80) {
      logError(new Error(`Questões insuficientes: ${questions?.length ?? 0}`), {
        area: "simulados-gerar", userId, count: questions?.length ?? 0,
      })
      return NextResponse.json(
        { error: `Questões insuficientes: ${questions?.length ?? 0} encontradas` },
        { status: 500 }
      )
    }

    const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, 80)

    const { data: simulado, error: sError } = await supabase
      .from("simulados")
      .insert({
        user_id: userId,
        numero_questoes: 80,
        titulo: "Simulado OAB",
        tipo: "oab_completo",
      })
      .select("id")
      .single()

    if (sError || !simulado) {
      logError(sError ?? new Error("Falha ao criar simulado"), {
        area: "simulados-gerar", userId, phase: "insert-simulado",
      })
      return NextResponse.json({ error: sError?.message }, { status: 500 })
    }

    const attempts = shuffled.map((q) => ({
      user_id: userId,
      simulado_id: simulado.id,
      question_id: q.id,
    }))

    const { error: aError } = await supabase
      .from("simulado_attempts")
      .insert(attempts)

    if (aError) {
      logError(aError, { area: "simulados-gerar", userId, simuladoId: simulado.id, phase: "insert-attempts" })
      await supabase.from("simulados").delete().eq("id", simulado.id)
      return NextResponse.json({ error: aError.message }, { status: 500 })
    }

    return NextResponse.json({ simuladoId: simulado.id }, { status: 201 })
  } catch (err) {
    logError(err, { area: "simulados-gerar", userId })
    return NextResponse.json({ error: "Erro ao gerar simulado" }, { status: 500 })
  }
}