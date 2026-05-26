import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

const schema = z.object({
  exam_date: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .nullable()
    .optional()
    .default(null),
  nivel: z.enum(["iniciante", "intermediario", "avancado"]).optional(),
  dificuldades: z.array(z.string().uuid()).min(1).max(4).optional(),
  tempo_diario: z.enum(["1h", "2-3h", "4h+"]).optional(),
})

export async function POST(req: NextRequest) {
  const { user, supabase, error } = await requireUser()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const { exam_date, nivel, dificuldades, tempo_diario } = parsed.data

  const hasProfileData = nivel && dificuldades && tempo_diario

  if (hasProfileData) {
    const { data: subjects } = await supabase
      .from("subjects")
      .select("id")
      .in("id", dificuldades)

    if (!subjects || subjects.length !== dificuldades.length) {
      return NextResponse.json({ error: "Matérias inválidas" }, { status: 400 })
    }

    const { error: usersError } = await supabaseAdmin
      .from("users")
      .update({
        onboarding_data: {
          nivel,
          dificuldades,
          tempo_diario,
          completed_at: new Date().toISOString(),
        },
      })
      .eq("id", user.id)

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }
  }

  const metadataUpdate: { exam_date: string | null; onboarding_completed?: true } = {
    exam_date: exam_date ?? null,
  }
  if (hasProfileData) {
    metadataUpdate.onboarding_completed = true
  }

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: metadataUpdate,
  })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
