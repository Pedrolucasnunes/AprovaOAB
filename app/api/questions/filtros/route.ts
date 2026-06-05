import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { fetchAllRows } from "@/lib/supabase-paginate"

export async function GET() {
  const { supabase, error } = await requireUser()
  if (error) return error

  // questions passa de 1000 linhas: pagina os selects de valores distintos, senão
  // alguma edição de prova (banca) some do dropdown de filtro.
  const [
    { data: subjects },
    dificuldades,
    bancas,
  ] = await Promise.all([
    supabase.from("subjects").select("id, name").order("name"),
    fetchAllRows<{ dificuldade: string }>(
      () => supabase.from("questions").select("dificuldade").not("dificuldade", "is", null),
    ),
    fetchAllRows<{ banca: string }>(
      () => supabase.from("questions").select("banca").not("banca", "is", null),
    ),
  ])

  const dificuldadesUnicas = [...new Set(dificuldades.map((d) => d.dificuldade))].sort()
  const bancasUnicas = [...new Set(bancas.map((b) => b.banca))].sort()

  return NextResponse.json({
    subjects: subjects ?? [],
    dificuldades: dificuldadesUnicas,
    bancas: bancasUnicas,
  }, { status: 200 })
}