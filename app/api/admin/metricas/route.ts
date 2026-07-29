import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth-server"
import { logError } from "@/lib/logger"
import { calcularMetricas } from "@/lib/services/metricas"

// Métricas de ativação do painel admin. Toda a lógica vive em
// lib/services/metricas.ts — esta rota só valida a janela e serve.
//
// force-dynamic: é painel, não pode servir cache de uma hora atrás.
export const dynamic = "force-dynamic"

const JANELAS_VALIDAS = [7, 14, 30]

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const bruto = Number(new URL(req.url).searchParams.get("janela"))
  const janela = JANELAS_VALIDAS.includes(bruto) ? bruto : 7

  try {
    return NextResponse.json(await calcularMetricas(janela))
  } catch (err) {
    logError(err, { area: "admin-metricas", janela })
    return NextResponse.json({ error: "Falha ao calcular métricas" }, { status: 500 })
  }
}
