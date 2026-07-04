import { requireAdmin } from "@/lib/auth-server"
import { parseDbDate } from "@/lib/datas"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { fetchAllRows } from "@/lib/supabase-paginate"
import { NextRequest, NextResponse } from "next/server"

const LIMIT = 20

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"))
  const q = (searchParams.get("q") ?? "").trim().toLowerCase()
  const sort = searchParams.get("sort") === "acesso" ? "acesso" : "recentes"

  // Tabela pequena: busca tudo e resolve filtro/ordenação/paginação em código.
  const { data: rows, error: dbError } = await supabaseAdmin
    .from("users")
    .select("id, role, plano, created_at")

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  // Uma chamada ao Auth traz email, nome e last_sign_in_at de todos
  // (antes eram N chamadas getUserById, e sem o último acesso).
  const authById = new Map<string, { email: string; nome: string; ultimoAcesso: string | null }>()
  for (let authPage = 1; ; authPage++) {
    const { data, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      page: authPage,
      perPage: 1000,
    })
    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })
    for (const u of data.users) {
      authById.set(u.id, {
        email: u.email ?? "",
        nome: (u.user_metadata?.full_name as string | undefined) ?? "",
        ultimoAcesso: u.last_sign_in_at ?? null,
      })
    }
    if (data.users.length < 1000) break
  }

  // "Último acesso" = última atividade REAL, não só login: o last_sign_in_at
  // do Auth só muda em login novo, e a sessão do Supabase se renova sozinha
  // por refresh token — usuário pode passar semanas usando o sistema sem
  // "logar" de novo. Funde login + última questão + último simulado.
  const [attemptsAll, simuladosAll] = await Promise.all([
    fetchAllRows<{ user_id: string; created_at: string }>(() =>
      supabaseAdmin.from("question_attempts").select("user_id, created_at")),
    fetchAllRows<{ user_id: string; created_at: string }>(() =>
      supabaseAdmin.from("simulados").select("user_id, created_at")),
  ])
  const ultimaAtividade = new Map<string, number>()
  for (const r of [...attemptsAll, ...simuladosAll]) {
    const t = parseDbDate(r.created_at).getTime()
    if (t > (ultimaAtividade.get(r.user_id) ?? 0)) ultimaAtividade.set(r.user_id, t)
  }

  const todos = (rows ?? []).map((u) => {
    const login = authById.get(u.id)?.ultimoAcesso
    const t = Math.max(
      login ? parseDbDate(login).getTime() : 0,
      ultimaAtividade.get(u.id) ?? 0,
    )
    return {
      id: u.id,
      role: u.role,
      plano: u.plano,
      criadoEm: u.created_at,
      email: authById.get(u.id)?.email ?? "",
      nome: authById.get(u.id)?.nome ?? "",
      ultimoAcesso: t > 0 ? new Date(t).toISOString() : null,
    }
  })

  const filtrados = q
    ? todos.filter((u) => u.email.toLowerCase().includes(q) || u.nome.toLowerCase().includes(q))
    : todos

  filtrados.sort((a, b) => {
    if (sort === "acesso") {
      // Quem nunca acessou (NULL) vai pro fim; empate cai no critério de cadastro.
      const ta = a.ultimoAcesso ? parseDbDate(a.ultimoAcesso).getTime() : -Infinity
      const tb = b.ultimoAcesso ? parseDbDate(b.ultimoAcesso).getTime() : -Infinity
      if (tb !== ta) return tb - ta
    }
    return parseDbDate(b.criadoEm).getTime() - parseDbDate(a.criadoEm).getTime()
  })

  const total = filtrados.length
  const pagina = filtrados.slice((page - 1) * LIMIT, page * LIMIT)

  // Counts de simulados/questões só para os usuários exibidos na página.
  const users = await Promise.all(
    pagina.map(async (u) => {
      const [{ count: totalSimulados }, { count: totalQuestoes }] = await Promise.all([
        supabaseAdmin.from("simulados").select("id", { count: "exact", head: true }).eq("user_id", u.id).gt("acertos", 0),
        supabaseAdmin.from("question_attempts").select("id", { count: "exact", head: true }).eq("user_id", u.id),
      ])
      return { ...u, simulados: totalSimulados ?? 0, questoes: totalQuestoes ?? 0 }
    })
  )

  return NextResponse.json({
    users,
    contagens: {
      total: (rows ?? []).length,
      admins: (rows ?? []).filter((u) => u.role === "admin").length,
      bloqueados: (rows ?? []).filter((u) => u.role === "blocked").length,
    },
    pagination: { total, page, limit: LIMIT, totalPages: Math.max(1, Math.ceil(total / LIMIT)) },
  })
}
