import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { z } from "zod"
import { rateLimit } from "@/lib/rate-limit"

const schema = z.object({
  email: z.string().email().max(254),
  password: z
    .string()
    .min(8, "A senha deve ter no mínimo 8 caracteres.")
    .max(200)
    .regex(/[A-Z]/, "A senha deve conter uma letra maiúscula.")
    .regex(/[0-9]/, "A senha deve conter um número."),
  name: z.string().trim().min(1, "Informe seu nome.").max(120),
})

export async function POST(req: NextRequest) {
  const ipLimit = await rateLimit(req, "auth-signup-ip", 5, 900)
  if (!ipLimit.success) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429 },
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Dados inválidos."
    return NextResponse.json({ error: first }, { status: 400 })
  }
  const { email, password, name } = parsed.data

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          )
        },
      },
    },
  )

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: name } },
  })

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return NextResponse.json(
        { error: "Este e-mail já está cadastrado. Faça login." },
        { status: 409 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Proteção contra enumeração de e-mails: quando a conta já existe e está
  // confirmada, o Supabase NÃO retorna erro nem envia e-mail — apenas devolve
  // o user com identities vazio. Sem isso, o usuário ia parar na tela de OTP
  // esperando um código que nunca chega.
  if (data.user && data.user.identities?.length === 0) {
    return NextResponse.json(
      { error: "Este e-mail já está cadastrado. Faça login." },
      { status: 409 },
    )
  }

  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
