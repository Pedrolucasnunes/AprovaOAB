import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { carregarResultadoSimulado } from "@/lib/services/simulado-resultado"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: simuladoId } = await params
  const { user, supabase, error } = await requireUser()
  if (error) return error

  const resultado = await carregarResultadoSimulado(supabase, user.id, simuladoId)

  if (!resultado) {
    return NextResponse.json({ error: "Simulado não encontrado" }, { status: 404 })
  }

  // `percentual` nulo = ainda em andamento. O gabarito de uma prova não
  // terminada entregaria as respostas certas de quem ainda pode respondê-las.
  if (resultado.percentual === null) {
    return NextResponse.json(
      { error: "Simulado ainda em andamento" },
      { status: 404 },
    )
  }

  return NextResponse.json(resultado)
}
