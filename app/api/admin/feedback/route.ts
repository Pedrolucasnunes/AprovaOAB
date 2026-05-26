import { requireAdmin } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { NextResponse } from "next/server"

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const { data, error: dbError } = await supabaseAdmin
    .from("feedback")
    .select("id, user_id, type, message, page, created_at")
    .order("created_at", { ascending: false })
    .limit(200)

  if (dbError) {
    console.error("[admin/feedback] Erro ao buscar feedbacks:", dbError.message)
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  // Resolve user_id pra email + nome. Cacheia por ID pra não chamar getUserById
  // várias vezes pro mesmo usuário (um reporter pode ter mandado N feedbacks).
  const uniqueIds = Array.from(new Set((data ?? []).map((f) => f.user_id).filter(Boolean)))
  const userInfoMap: Record<string, { email: string; nome: string }> = {}
  await Promise.all(
    uniqueIds.map(async (id) => {
      const { data: authData } = await supabaseAdmin.auth.admin.getUserById(id)
      if (authData?.user) {
        const email = authData.user.email ?? ""
        const fullName = (authData.user.user_metadata?.full_name as string | undefined) ?? ""
        userInfoMap[id] = {
          email,
          nome: fullName || (email ? email.split("@")[0] : ""),
        }
      }
    })
  )

  const feedbacks = (data ?? []).map((f) => ({
    ...f,
    user_nome: userInfoMap[f.user_id]?.nome ?? "Usuário removido",
    user_email: userInfoMap[f.user_id]?.email ?? "",
  }))

  const totais = {
    total: data?.length ?? 0,
    bug: data?.filter((f) => f.type === "bug").length ?? 0,
    sugestao: data?.filter((f) => f.type === "sugestao").length ?? 0,
    elogio: data?.filter((f) => f.type === "elogio").length ?? 0,
  }

  return NextResponse.json({ feedbacks, totais })
}
