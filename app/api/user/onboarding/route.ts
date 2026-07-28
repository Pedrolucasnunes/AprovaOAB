import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"

// Todos os campos são opcionais: o wizard grava a cada passo, não só no final.
// Antes o payload era tudo-ou-nada (`nivel && dificuldades && tempo_diario`), então
// quem abandonava no meio ficava com `onboarding_data` nulo — e isso travava o
// diagnóstico, que exigia `dificuldades`. 33 dos 57 usuários caíram nesse buraco.
const schema = z.object({
  exam_date: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .nullable()
    .optional(),
  nivel: z.enum(["iniciante", "intermediario", "avancado"]).optional(),
  dificuldades: z.array(z.string().uuid()).min(1).max(4).optional(),
  tempo_diario: z.enum(["1h", "2-3h", "4h+"]).optional(),
  // Só o último passo marca o onboarding como concluído — é o que impede o
  // modal de reabrir. Salvar parcial não pode encerrar o fluxo.
  completo: z.boolean().optional(),
})

interface OnboardingData {
  nivel?: string
  dificuldades?: string[]
  tempo_diario?: string
  completed_at?: string
}

export async function GET() {
  const { user, supabase, error } = await requireUser()
  if (error) return error

  const { data: userRow } = await supabase
    .from("users")
    .select("onboarding_data")
    .eq("id", user.id)
    .single()

  return NextResponse.json({
    onboarding_data: (userRow?.onboarding_data ?? null) as OnboardingData | null,
    exam_date: (user.user_metadata?.exam_date as string | null) ?? null,
    completo: user.user_metadata?.onboarding_completed === true,
  })
}

export async function POST(req: NextRequest) {
  const { user, supabase, error } = await requireUser()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const { exam_date, nivel, dificuldades, tempo_diario, completo } = parsed.data

  if (dificuldades) {
    const { data: subjects } = await supabase
      .from("subjects")
      .select("id")
      .in("id", dificuldades)

    if (!subjects || subjects.length !== dificuldades.length) {
      return NextResponse.json({ error: "Matérias inválidas" }, { status: 400 })
    }
  }

  // Merge sobre o que já existe — um passo nunca apaga o anterior.
  if (nivel || dificuldades || tempo_diario || completo) {
    const { data: userRow } = await supabase
      .from("users")
      .select("onboarding_data")
      .eq("id", user.id)
      .single()

    const atual = (userRow?.onboarding_data ?? {}) as OnboardingData
    const merged: OnboardingData = { ...atual }
    if (nivel) merged.nivel = nivel
    if (dificuldades) merged.dificuldades = dificuldades
    if (tempo_diario) merged.tempo_diario = tempo_diario
    if (completo) merged.completed_at = new Date().toISOString()

    const { error: usersError } = await supabaseAdmin
      .from("users")
      .update({ onboarding_data: merged })
      .eq("id", user.id)

    if (usersError) {
      return NextResponse.json({ error: usersError.message }, { status: 500 })
    }
  }

  // `exam_date` só é tocado quando a chave vem no corpo. Sem isso, cada save
  // parcial de outro passo zeraria a data já escolhida.
  const metadataUpdate: { exam_date?: string | null; onboarding_completed?: true } = {}
  if (body && Object.prototype.hasOwnProperty.call(body, "exam_date")) {
    metadataUpdate.exam_date = exam_date ?? null
  }
  if (completo) {
    metadataUpdate.onboarding_completed = true
  }

  if (Object.keys(metadataUpdate).length > 0) {
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      user_metadata: metadataUpdate,
    })

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
