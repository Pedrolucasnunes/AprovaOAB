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
  // Só o último passo marca o onboarding como concluído — é o que impede o
  // modal de reabrir. Salvar parcial não pode encerrar o fluxo.
  completo: z.boolean().optional(),
})

// `users.onboarding_data` não é mais escrito: os campos que ele guardava
// (nivel, dificuldades, tempo_diario) não tinham leitor e saíram do wizard.
// A coluna fica no banco com o histórico dos 24 usuários que já preencheram —
// apagar dado coletado não traz benefício nenhum.

export async function GET() {
  const { user, error } = await requireUser()
  if (error) return error

  return NextResponse.json({
    exam_date: (user.user_metadata?.exam_date as string | null) ?? null,
    completo: user.user_metadata?.onboarding_completed === true,
  })
}

export async function POST(req: NextRequest) {
  const { user, error } = await requireUser()
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const { exam_date, completo } = parsed.data

  // `exam_date` só é tocado quando a chave vem no corpo. Sem isso, um save de
  // outro passo zeraria a data já escolhida.
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
