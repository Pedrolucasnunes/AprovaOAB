import { requireAdmin } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { NextRequest, NextResponse } from "next/server"

const VALID_ROLES = ["user", "admin", "blocked"] as const
type Role = typeof VALID_ROLES[number]

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const { role } = await req.json()

  if (!VALID_ROLES.includes(role as Role)) {
    return NextResponse.json({ error: "Role inválido" }, { status: 400 })
  }

  const { data: before } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", id)
    .single()

  const { error: dbError } = await supabaseAdmin
    .from("users")
    .update({ role })
    .eq("id", id)

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 })

  await supabaseAdmin.from("admin_audit_log").insert({
    admin_id: user.id,
    target_user_id: id,
    action: "role_change",
    before: { role: before?.role ?? null },
    after: { role },
  })

  return NextResponse.json({ success: true })
}
