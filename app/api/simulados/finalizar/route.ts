import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { logError } from "@/lib/logger"
import { carregarResultadoSimulado } from "@/lib/services/simulado-resultado"
import { contarEstados } from "@/lib/simulado-resultado"

export async function POST(req: NextRequest) {
  const { user, supabase, error } = await requireUser()
  if (error) return error

  const userId = user.id

  let body: { simuladoId?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const { simuladoId } = body

  if (!simuladoId) {
    return NextResponse.json({ error: "simuladoId é obrigatório" }, { status: 400 })
  }

  const resultado = await carregarResultadoSimulado(supabase, userId, simuladoId)

  if (!resultado) {
    logError(new Error("Simulado não encontrado ou sem attempts"), {
      area: "simulados-finalizar", userId, simuladoId, phase: "carregar",
    })
    return NextResponse.json(
      { error: "Simulado não encontrado ou sem questões" },
      { status: 404 },
    )
  }

  const contagem = contarEstados(resultado.gabarito)

  if (contagem.respondidas === 0) {
    return NextResponse.json({ error: "Nenhuma questão respondida" }, { status: 400 })
  }

  // `erros` gravado continua sendo TUDO que não é acerto — erradas mais brancas.
  // É a regra da OAB e é o que o `/api/dashboard` já consome em `taxaSimulados`;
  // a separação entre errar e não responder existe na tela, não nesta coluna.
  const { acertos } = contagem
  const erros = resultado.numeroQuestoes - acertos
  const percentual = parseFloat(((acertos / resultado.numeroQuestoes) * 100).toFixed(2))

  const { error: uError } = await supabase
    .from("simulados")
    .update({ acertos, erros, percentual })
    .eq("id", simuladoId)
    .eq("user_id", userId)

  if (uError) {
    logError(uError, { area: "simulados-finalizar", userId, simuladoId, phase: "update-simulado" })
    return NextResponse.json({ error: uError.message }, { status: 500 })
  }

  return NextResponse.json({ ...resultado, percentual }, { status: 200 })
}
