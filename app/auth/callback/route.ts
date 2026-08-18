import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { marcarTurma } from "@/lib/turmas-server"
import { TURMA_COOKIE, contaRecemCriada } from "@/lib/turmas"

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get("code")
  const type = searchParams.get("type")

  // Link de ativação vencido. O GoTrue devolve `error_code=otp_expired` e, sem
  // `code`, este handler caía no redirect final para /dashboard — de onde o
  // proxy manda pro login. O resultado era a tela de login limpa, sem uma
  // palavra sobre o que aconteceu, que é o sintoma que ninguém consegue
  // relatar direito. Agora vai para a tela que sabe resolver.
  const erroDoLink = searchParams.get("error_code") ?? searchParams.get("error")
  if (!code && erroDoLink) {
    const expirado = /expired/i.test(erroDoLink)
    return NextResponse.redirect(`${origin}/login${expirado ? "?ativacao=expirada" : ""}`)
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )
    await supabase.auth.exchangeCodeForSession(code)

    if (type === "recovery") {
      return NextResponse.redirect(`${origin}/recuperar-senha/nova-senha`)
    }

    const { data: { user } } = await supabase.auth.getUser()

    // Turma institucional — o caminho do Google. Só em conta RECÉM-CRIADA:
    // este callback roda a cada login, e marcar sem essa checagem poria na
    // turma um aluno antigo que apenas clicou num link compartilhado.
    if (user && contaRecemCriada(user.created_at)) {
      await marcarTurma(user.id, cookieStore.get(TURMA_COOKIE)?.value)
    }

    const needsOnboarding = !user?.user_metadata?.onboarding_completed
    return NextResponse.redirect(
      `${origin}/dashboard${needsOnboarding ? "?onboarding=true" : ""}`
    )
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
