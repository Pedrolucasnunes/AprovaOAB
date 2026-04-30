import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(req: NextRequest) {
  const { user, supabase, error } = await requireUser()
  if (error) return error

  const userId = user.id

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

  console.log(`[gerar] Iniciando simulado para userId=${userId}`)

  // 1. Busca pool de questões
  const { data: questions, error: qError } = await supabase
    .from("questions")
    .select("id")
    .limit(500)

  if (qError) {
    console.error("[gerar] Erro ao buscar questões:", qError.message)
    return NextResponse.json({ error: qError.message }, { status: 500 })
  }

  if (!questions || questions.length < 80) {
    console.error(`[gerar] Questões insuficientes: ${questions?.length ?? 0}`)
    return NextResponse.json(
      { error: `Questões insuficientes: ${questions?.length ?? 0} encontradas` },
      { status: 500 }
    )
  }

  const shuffled = questions.sort(() => Math.random() - 0.5).slice(0, 80)

  // 2. Cria o simulado
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
    console.error("[gerar] Erro ao criar simulado:", sError?.message)
    return NextResponse.json({ error: sError?.message }, { status: 500 })
  }

  console.log(`[gerar] Simulado criado: simuladoId=${simulado.id}`)

  // 3. Cria os vínculos em simulado_attempts
  const attempts = shuffled.map((q) => ({
    user_id: userId,
    simulado_id: simulado.id,
    question_id: q.id,
  }))

  const { error: aError } = await supabase
    .from("simulado_attempts")
    .insert(attempts)

  if (aError) {
    console.error("[gerar] Erro ao criar attempts:", aError.message)
    await supabase.from("simulados").delete().eq("id", simulado.id)
    return NextResponse.json({ error: aError.message }, { status: 500 })
  }

  console.log(`[gerar] ${shuffled.length} attempts criados para simuladoId=${simulado.id}`)

  return NextResponse.json({ simuladoId: simulado.id }, { status: 201 })
}