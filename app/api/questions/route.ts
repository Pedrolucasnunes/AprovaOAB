import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"

export async function GET(req: NextRequest) {
  const { user, supabase, error } = await requireUser()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const subjectId   = searchParams.get("subjectId")
  const topicId     = searchParams.get("topicId")
  const dificuldade = searchParams.get("dificuldade")
  const banca       = searchParams.get("banca")
  const busca       = searchParams.get("busca")
  const page        = Math.max(1, Number(searchParams.get("page") ?? "1"))
  const limit       = 10
  const offset      = (page - 1) * limit

  let query = supabase
    .from("questions")
    .select(`
      id, enunciado,
      alternativa_a, alternativa_b, alternativa_c, alternativa_d,
      dificuldade, banca, ano, subject_id, topic_id
    `, { count: "exact" })

  if (busca && busca.length > 200) {
    return NextResponse.json({ error: "Busca muito longa (máx 200 caracteres)" }, { status: 400 })
  }

  if (subjectId)   query = query.eq("subject_id", subjectId)
  if (topicId)     query = query.eq("topic_id", topicId)
  if (dificuldade) query = query.eq("dificuldade", dificuldade)
  if (banca)       query = query.eq("banca", banca)
  if (busca)       query = query.ilike("enunciado", `%${busca}%`)

  query = query.range(offset, offset + limit - 1)

  const { data: questions, error: dbError, count } = await query

  if (dbError) {
    console.error("[questions] Erro ao buscar questões:", dbError.message)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  const subjectIds = [...new Set((questions ?? []).map((q) => q.subject_id).filter(Boolean))]
  const topicIds   = [...new Set((questions ?? []).map((q) => q.topic_id).filter(Boolean))]

  const [{ data: subjects }, { data: topics }] = await Promise.all([
    supabase.from("subjects").select("id, name").in("id", subjectIds.length > 0 ? subjectIds : ["null"]),
    supabase.from("topics").select("id, name").in("id", topicIds.length > 0 ? topicIds : ["null"]),
  ])

  const subjectMap = Object.fromEntries((subjects ?? []).map((s) => [s.id, s.name]))
  const topicMap   = Object.fromEntries((topics ?? []).map((t) => [t.id, t.name]))

  const questoesComNomes = (questions ?? []).map((q) => ({
    ...q,
    subject_name: subjectMap[q.subject_id] ?? "Desconhecida",
    topic_name:   topicMap[q.topic_id] ?? "Desconhecido",
  }))

  return NextResponse.json({
    questions: questoesComNomes,
    pagination: {
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  }, { status: 200 })
}