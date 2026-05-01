import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { rateLimit } from "@/lib/rate-limit"

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, "feedback", 10, 60)
  if (!rl.success) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde alguns segundos." }, { status: 429 })
  }

  const { user, supabase, error } = await requireUser()
  if (error) return error

  let body: { type?: string; message?: string; page?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const { type, message, page } = body

  if (!type || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "type e message são obrigatórios" }, { status: 400 })
  }

  if (message.length > 2000) {
    return NextResponse.json({ error: "Mensagem muito longa (máx 2000 caracteres)" }, { status: 400 })
  }

  if (page && (typeof page !== "string" || page.length > 200)) {
    return NextResponse.json({ error: "page inválido" }, { status: 400 })
  }

  const VALID_TYPES = ["bug", "sugestao", "elogio"]
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 })
  }

  const { error: dbError } = await supabase.from("feedback").insert({
    user_id: user.id,
    type,
    message: message.trim(),
    page: page ?? null,
  })

  if (dbError) {
    console.error("[feedback] Erro ao salvar:", dbError.message)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 201 })
}
