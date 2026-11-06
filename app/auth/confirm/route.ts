import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

/**
 * O link de troca de senha, no NOSSO domínio.
 *
 * O modelo padrão do Supabase leva a `<projeto>.supabase.co`, num e-mail que
 * sai de `aprovaoab.app.br`. Link para um domínio diferente do remetente é
 * sinal clássico de golpe, e o Gmail mandou esse e-mail para o spam com o
 * alerta vermelho. O modelo versionado em `supabase/templates/` aponta para cá
 * com o `token_hash`, e a troca do token pela sessão acontece aqui, no
 * servidor, como no `/auth/callback`.
 *
 * Só aceita `type=recovery`. Os outros e-mails do Auth não passam por aqui, e
 * aceitar qualquer tipo abriria a rota para fluxos que ninguém revisou.
 *
 * Igual ao link antigo num ponto: o GET gasta o token. Filtro de e-mail
 * corporativo que abre os links antes da pessoa (ver o descadastro no
 * CLAUDE.md) consome este link do mesmo jeito que consumia o do supabase.co.
 */
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type")

  if (!tokenHash || type !== "recovery") {
    return NextResponse.redirect(`${origin}/recuperar-senha?link=invalido`)
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
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash })
  if (error) {
    return NextResponse.redirect(`${origin}/recuperar-senha?link=expirado`)
  }

  return NextResponse.redirect(`${origin}/recuperar-senha/nova-senha`)
}
