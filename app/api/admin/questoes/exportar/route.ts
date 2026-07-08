import { requireAdmin } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { fetchAllRows } from "@/lib/supabase-paginate"
import { NextRequest, NextResponse } from "next/server"

const COLUNAS = [
  "id", "enunciado", "alternativa_a", "alternativa_b", "alternativa_c", "alternativa_d",
  "resposta_correta", "dificuldade", "banca", "ano", "subject_id", "subject_name",
  "topic_id", "incidencia_prova", "explicacao",
] as const

// Escaping CSV padrão: campo com ; " ou quebra de linha vai entre aspas, com "" internas.
function esc(v: unknown): string {
  const s = v == null ? "" : String(v)
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const busca = searchParams.get("busca") ?? ""
  const banca = searchParams.get("banca") ?? ""

  if (busca.length > 200) {
    return NextResponse.json({ error: "Busca muito longa (máx 200 caracteres)" }, { status: 400 })
  }

  let rows
  try {
    rows = await fetchAllRows<Record<string, unknown>>(() => {
      let query = supabaseAdmin
        .from("questions")
        .select(`
          id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d,
          resposta_correta, dificuldade, banca, ano, subject_id, topic_id,
          incidencia_prova, explicacao
        `)
      if (busca) query = query.ilike("enunciado", `%${busca}%`)
      if (banca) query = query.eq("banca", banca)
      return query.order("created_at", { ascending: false })
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao buscar questões"
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const subjectIds = [...new Set(rows.map(q => q.subject_id).filter(Boolean))] as string[]
  const { data: subjects } = await supabaseAdmin
    .from("subjects").select("id, name")
    .in("id", subjectIds.length > 0 ? subjectIds : ["null"])
  const subjectMap = Object.fromEntries((subjects ?? []).map(s => [s.id, s.name]))

  const linhas = rows.map(q => {
    const registro = { ...q, subject_name: subjectMap[q.subject_id as string] ?? "" }
    return COLUNAS.map(c => esc(registro[c])).join(";")
  })

  // BOM UTF-8 para o Excel abrir os acentos corretamente.
  const csv = "\uFEFF" + [COLUNAS.join(";"), ...linhas].join("\r\n") + "\r\n"

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="questoes.csv"',
    },
  })
}
