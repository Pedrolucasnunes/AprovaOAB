import { requireAdmin } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { NextRequest, NextResponse } from "next/server"
import { questaoSchema } from "./schema"

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"))
  const busca = searchParams.get("busca") ?? ""
  const banca = searchParams.get("banca") ?? ""
  const limit = 20
  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from("questions")
    .select(`
      id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d,
      resposta_correta, dificuldade, banca, ano, subject_id, topic_id, explicacao
    `, { count: "exact" })

  if (busca) {
    if (busca.length > 200) {
      return NextResponse.json({ error: "Busca muito longa (máx 200 caracteres)" }, { status: 400 })
    }
    query = query.ilike("enunciado", `%${busca}%`)
  }

  if (banca) {
    query = query.eq("banca", banca)
  }

  query = query.range(offset, offset + limit - 1).order("created_at", { ascending: false })

  const { data, error: dbError, count } = await query

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  const subjectIds = [...new Set((data ?? []).map(q => q.subject_id).filter(Boolean))]
  const { data: subjects } = await supabaseAdmin
    .from("subjects").select("id, name")
    .in("id", subjectIds.length > 0 ? subjectIds : ["null"])

  const subjectMap = Object.fromEntries((subjects ?? []).map(s => [s.id, s.name]))

  const questions = (data ?? []).map(q => ({
    ...q,
    subject_name: subjectMap[q.subject_id] ?? "—",
  }))

  return NextResponse.json({
    questions,
    pagination: { total: count ?? 0, page, limit, totalPages: Math.ceil((count ?? 0) / limit) }
  })
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = questaoSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", detalhes: parsed.error.flatten().fieldErrors },
      { status: 400 },
    )
  }

  const { data, error: dbError } = await supabaseAdmin
    .from("questions")
    .insert(parsed.data)
    .select("id").single()

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  return NextResponse.json({ id: data.id }, { status: 201 })
}
