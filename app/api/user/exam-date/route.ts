import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

const schema = z.object({
  exam_date: z
    .string()
    .regex(/^\d{4}-\d{2}(-\d{2})?$/, "Formato inválido")
    .nullable(),
})

export async function PATCH(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const currentMetadata = user.user_metadata ?? {}
  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...currentMetadata, exam_date: parsed.data.exam_date },
  })

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
