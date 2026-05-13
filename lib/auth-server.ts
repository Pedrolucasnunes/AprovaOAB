import { createServerClient } from "@supabase/ssr"
import type { User } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { supabaseAdmin } from "./supabase-admin"

type AdminAuthResult =
  | { user: User; error: null }
  | { user: null; error: NextResponse }

type UserAuthResult =
  | { user: User; supabase: ReturnType<typeof createServerClient>; error: null }
  | { user: null; supabase: null; error: NextResponse }

async function buildServerClient() {
  const cookieStore = await cookies()
  return createServerClient(
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
}

/** Verifica sessão ativa + bloqueia contas com role="blocked". */
export async function requireUser(): Promise<UserAuthResult> {
  const supabase = await buildServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { user: null, supabase: null, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }
  }

  const { data: userData } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (userData?.role === "blocked") {
    return { user: null, supabase: null, error: NextResponse.json({ error: "Conta bloqueada. Entre em contato com o suporte." }, { status: 403 }) }
  }

  return { user, supabase, error: null }
}

/** Verifica sessão ativa + exige role="admin". */
export async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase = await buildServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { user: null, error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }) }
  }

  const { data } = await supabaseAdmin
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single()

  if (data?.role !== "admin") {
    return { user: null, error: NextResponse.json({ error: "Acesso negado" }, { status: 403 }) }
  }

  return { user, error: null }
}
