import { requireAdmin } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await req.json()

  const {
    enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d,
    resposta_correta, dificuldade, banca, ano, subject_id, topic_id,
    explicacao, incidencia_prova,
  } = body

  const { error: dbError } = await supabaseAdmin
    .from("questions")
    .update({
      enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d,
      resposta_correta, dificuldade, banca, ano, subject_id, topic_id,
      explicacao, incidencia_prova,
    })
    .eq("id", id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params

  const { error: dbError } = await supabaseAdmin
    .from("questions")
    .delete()
    .eq("id", id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
