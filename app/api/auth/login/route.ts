import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { z } from "zod"
import { rateLimit, hashEmail } from "@/lib/rate-limit"
import { supabaseAdmin } from "@/lib/supabase-admin"

const schema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 })
  }
  const { email, password } = parsed.data

  const ipLimit = await rateLimit(req, "auth-login-ip", 10, 900)
  if (!ipLimit.success) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429 },
    )
  }
  // Por e-mail e GLOBAL, sem o IP na chave: limitado por (IP, e-mail), cada IP
  // novo trazia mais tentativas contra a mesma conta. O preço aceito é que quem
  // martela o e-mail de outra pessoa trava o login dela por 15 minutos.
  const emailLimit = await rateLimit(req, "auth-login-email-global", 10, 900, hashEmail(email), {
    global: true,
  })
  if (!emailLimit.success) {
    return NextResponse.json(
      { error: "Muitas tentativas para este e-mail. Aguarde alguns minutos." },
      { status: 429 },
    )
  }

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

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    if (error.message.toLowerCase().includes("not confirmed")) {
      return NextResponse.json({ requiresVerification: true, email })
    }

    // Mensagem genérica de propósito: evita enumeração de emails (OWASP A07).
    return NextResponse.json(
      { error: "E-mail ou senha incorretos." },
      { status: 401 },
    )
  }

  if (!data.user?.email_confirmed_at) {
    await supabase.auth.signOut()
    return NextResponse.json({ requiresVerification: true, email })
  }

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", data.user.id)
    .single()

  if (userRow?.role === "blocked") {
    await supabase.auth.signOut()
    return NextResponse.json(
      { error: "Conta bloqueada. Entre em contato com o suporte." },
      { status: 403 },
    )
  }

  const isAdmin = userRow?.role === "admin"
  const needsOnboarding = !data.user.user_metadata?.onboarding_completed

  return NextResponse.json({ ok: true, isAdmin, needsOnboarding })
}
