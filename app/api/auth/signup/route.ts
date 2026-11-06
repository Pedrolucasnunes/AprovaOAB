import { NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { z } from "zod"
import { rateLimit } from "@/lib/rate-limit"
import { marcarTurma } from "@/lib/turmas-server"
import { TURMA_COOKIE } from "@/lib/turmas"
import { mensagemDeSenha } from "@/lib/auth-erros"
import { logWarning } from "@/lib/logger"

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

    // Nada de texto cru do Supabase: ele vem em inglês, e a tela mostra o que
    // esta rota devolver. Os casos que a pessoa consegue resolver ganham frase
    // própria; o resto vai pro log e sai genérico.
    const senha = mensagemDeSenha(error)
    if (senha) return NextResponse.json({ error: senha }, { status: 400 })

    if (error.code === "signup_disabled") {
      return NextResponse.json(
        { error: "O cadastro está pausado no momento. Tente de novo mais tarde." },
        { status: 503 },
      )
    }
    if (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
      return NextResponse.json(
        { error: "Muitas tentativas agora. Aguarde alguns minutos e tente de novo." },
        { status: 429 },
      )
    }
    if (error.code === "email_address_invalid") {
      return NextResponse.json(
        { error: "Esse endereço de e-mail não é aceito. Confira se está certo." },
        { status: 400 },
      )
    }

    logWarning("Cadastro recusado pelo Supabase", { area: "auth", code: error.code, erro: error.message })
    return NextResponse.json(
      { error: "Não foi possível criar a conta agora. Tente de novo em alguns instantes." },
      { status: 400 },
    )
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

  // Turma institucional (piloto UNP): o cookie foi posto pelo link da
  // coordenação e chega aqui na própria requisição.
  //
  // Este é o momento certo, e não a confirmação do OTP: aquela roda no
  // navegador (`app/cadastro/page.tsx`, `verifyOtp`) e é seguida de `signOut`,
  // então não há servidor nem cookie do lado de lá. Aqui a linha em `users` já
  // existe — o gatilho do banco é síncrono ao insert em `auth.users`
  // (verificado nos 71 cadastros da base: mediana de −4 ms entre os dois
  // `created_at`, todos dentro de 1 s), então o UPDATE encontra a linha.
  //
  // O cookie NÃO é apagado depois de usado: em laboratório da faculdade vários
  // alunos usam o mesmo navegador, e limpar aqui marcaria só o primeiro.
  if (data.user) {
    await marcarTurma(data.user.id, cookieStore.get(TURMA_COOKIE)?.value)
  }

  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
