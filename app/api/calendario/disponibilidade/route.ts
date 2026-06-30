import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET() {
  const { user, supabase, error } = await requireUser()
  if (error) return error

  const { data, error: dbError } = await supabase
    .from("user_availability")
    .select("day_of_week, start_time, end_time")
    .eq("user_id", user.id)
    .order("day_of_week", { ascending: true })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  const simulado_preference =
    user.user_metadata?.simulado_preference === "weekday" ? "weekday" : "weekend"

  return NextResponse.json({ availability: data ?? [], simulado_preference })
}

export async function POST(req: NextRequest) {
  const { user, supabase, error } = await requireUser()
  if (error) return error

  let body: {
    availability: { day_of_week: number; start_time: string; end_time: string }[]
    simulado_preference?: "weekday" | "weekend"
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const { availability, simulado_preference } = body

  if (!Array.isArray(availability)) {
    return NextResponse.json({ error: "Campo 'availability' deve ser um array" }, { status: 400 })
  }

  // Preferência de quando alocar o simulado (opcional) — persistida no user_metadata,
  // mesmo padrão do exam_date. Spread do metadata atual pra não apagar outras chaves.
  if (simulado_preference === "weekday" || simulado_preference === "weekend") {
    const { error: metaError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: { ...(user.user_metadata ?? {}), simulado_preference },
    })
    if (metaError) {
      return NextResponse.json({ error: metaError.message }, { status: 500 })
    }
  }

  await supabase.from("user_availability").delete().eq("user_id", user.id)

  if (availability.length > 0) {
    const rows = availability.map((a) => ({
      user_id:     user.id,
      day_of_week: a.day_of_week,
      start_time:  a.start_time,
      end_time:    a.end_time,
    }))

    const { error: insertError } = await supabase
      .from("user_availability")
      .insert(rows)

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true, saved: availability.length })
}
