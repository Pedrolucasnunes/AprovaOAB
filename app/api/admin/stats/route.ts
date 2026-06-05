import { requireAdmin } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { fetchAllRows } from "@/lib/supabase-paginate"
import { NextResponse } from "next/server"

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const { count: totalUsuarios } = await supabaseAdmin
    .from("users")
    .select("id", { count: "exact", head: true })

  const { count: totalQuestoes } = await supabaseAdmin
    .from("questions")
    .select("id", { count: "exact", head: true })

  const { count: totalSimulados } = await supabaseAdmin
    .from("simulados")
    .select("id", { count: "exact", head: true })

  const { data: mediaData } = await supabaseAdmin
    .from("simulados")
    .select("percentual")

  const mediaAproveitamento = mediaData && mediaData.length > 0
    ? parseFloat((mediaData.reduce((acc, s) => acc + Number(s.percentual), 0) / mediaData.length).toFixed(1))
    : 0

  const { data: subjects } = await supabaseAdmin
    .from("subjects")
    .select("id, name")

  const subjectMap = Object.fromEntries((subjects ?? []).map(s => [s.id, s.name]))

  // Pagina: a tabela questions passa de 1000 linhas, senão o gráfico subestimaria.
  const questoesPorSubject = await fetchAllRows<{ subject_id: string | null }>(
    () => supabaseAdmin.from("questions").select("subject_id"),
  )

  const contagemPorSubject = new Map<string, number>()
  for (const q of questoesPorSubject) {
    if (!q.subject_id) continue
    contagemPorSubject.set(q.subject_id, (contagemPorSubject.get(q.subject_id) ?? 0) + 1)
  }

  const questoesPorDisciplina = Array.from(contagemPorSubject.entries())
    .map(([subject_id, total]) => ({
      name: subjectMap[subject_id] ?? "Desconhecida",
      questoes: total,
    }))
    .sort((a, b) => b.questoes - a.questoes)

  const hoje = new Date()
  const seteDiasAtras = new Date(hoje)
  seteDiasAtras.setDate(hoje.getDate() - 6)

  const { data: simuladosRecentes } = await supabaseAdmin
    .from("simulados")
    .select("created_at")
    .gte("created_at", seteDiasAtras.toISOString())
    .order("created_at", { ascending: true })

  const contagemPorDia = new Map<string, number>()
  for (let i = 0; i < 7; i++) {
    const d = new Date(seteDiasAtras)
    d.setDate(seteDiasAtras.getDate() + i)
    const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    contagemPorDia.set(key, 0)
  }
  for (const s of simuladosRecentes ?? []) {
    const key = new Date(s.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
    if (contagemPorDia.has(key)) {
      contagemPorDia.set(key, (contagemPorDia.get(key) ?? 0) + 1)
    }
  }

  const simuladosPorDia = Array.from(contagemPorDia.entries()).map(([date, total]) => ({
    date,
    total,
  }))

  const { data: usuariosRecentesRow } = await supabaseAdmin
    .from("users")
    .select("id, role, plano, created_at")
    .order("created_at", { ascending: false })
    .limit(5)

  const usuariosRecentes = await Promise.all(
    (usuariosRecentesRow ?? []).map(async (u) => {
      const { data } = await supabaseAdmin.auth.admin.getUserById(u.id)
      const email = data?.user?.email ?? ""
      const fullName = (data?.user?.user_metadata?.full_name as string | undefined) ?? ""
      const nome = fullName || (email ? email.split("@")[0] : "Sem nome")
      return {
        id: u.id,
        nome,
        email,
        role: u.role,
        plano: u.plano,
        criadoEm: u.created_at,
      }
    })
  )

  return NextResponse.json({
    totais: {
      usuarios: totalUsuarios ?? 0,
      questoes: totalQuestoes ?? 0,
      simulados: totalSimulados ?? 0,
      mediaAproveitamento,
    },
    questoesPorDisciplina,
    simuladosPorDia,
    usuariosRecentes,
  })
}
