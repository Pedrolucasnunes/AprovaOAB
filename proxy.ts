import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

export async function proxy(req: NextRequest) {
  const res = NextResponse.next()
  const { pathname } = req.nextUrl

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // getUser() valida o JWT no servidor — mais seguro que getSession()
  const { data: { user } } = await supabase.auth.getUser()

  const rotasPublicas = ["/", "/login", "/cadastro", "/recuperar-senha", "/politica-de-privacidade", "/termos-de-uso"]
  const isRotaPublica = rotasPublicas.some(rota => pathname === rota || pathname.startsWith(rota + "/"))

  const isRotaProtegida = pathname.startsWith("/dashboard") || pathname.startsWith("/admin")

  // Sem sessão em rota protegida → login
  if (!user && isRotaProtegida) {
    const loginUrl = new URL("/login", req.url)
    loginUrl.searchParams.set("redirect", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Já autenticado tentando acessar login/cadastro → dashboard
  if (user && (pathname === "/login" || pathname === "/cadastro")) {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  if (user) {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: userData } = await adminClient
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single()

    const role = userData?.role

    // Conta bloqueada tentando acessar o dashboard → página de bloqueio
    if (role === "blocked" && pathname.startsWith("/dashboard")) {
      return NextResponse.redirect(new URL("/conta-bloqueada", req.url))
    }

    // Acesso ao admin: exige role admin
    if (pathname.startsWith("/admin")) {
      if (role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", req.url))
      }
    }
  }

  return res
}

// As rotas públicas de SEO (/questoes, /provas, /editais) e os arquivos que os
// robôs leem ficam FORA do matcher.
//
// Elas são 100% prerenderizadas (X-Nextjs-Prerender: 1) e não têm nada de
// protegido: o middleware rodava `supabase.auth.getUser()` — uma ida à rede —
// antes de servir HTML que já estava pronto em cache. Era latência pura em cada
// visita de bot, e nenhuma das regras abaixo (dashboard, admin, login) se aplica
// a esses caminhos.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|questoes|provas|editais|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
