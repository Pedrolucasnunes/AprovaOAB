import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { rateLimit, hashEmail } from "@/lib/rate-limit"
import { logWarning } from "@/lib/logger"

const schema = z.object({ email: z.string().email().max(254) })

/**
 * Reenvia o código de ativação para quem criou a conta e nunca confirmou o
 * e-mail.
 *
 * Por que esta rota existe: o reenvio já era possível em dois lugares
 * (`app/cadastro/page.tsx`, logo após o cadastro, e `app/login/page.tsx`,
 * depois de o login falhar com "not confirmed"), mas os dois exigem algo que
 * quem volta dias depois não tem — estar na mesma aba do cadastro, ou lembrar
 * a senha de uma conta que nunca chegou a usar. Quem erra a senha recebe
 * "E-mail ou senha incorretos" e não tem mais nenhum caminho.
 *
 * A RESPOSTA É SEMPRE A MESMA, existindo a conta ou não. Duas razões:
 *
 * 1. Enumeração de e-mails (OWASP A07) — é a mesma regra que já vale no
 *    `/api/auth/login` ("E-mail ou senha incorretos" genérico) e na tela de
 *    recuperar senha ("se o endereço estiver cadastrado...").
 * 2. O erro de 60s do GoTrue (`max_frequency`) NÃO pode ser repassado: ele só
 *    aparece para e-mail que existe e está pendente, então mostrá-lo seria a
 *    própria sonda de enumeração que o item 1 evita. O tempo de espera é
 *    informado pela UI de forma uniforme, para qualquer endereço digitado.
 *
 * Não é preciso consultar o banco antes: o endpoint `/auth/v1/resend` do
 * GoTrue já não faz nada para e-mail inexistente (verificado: HTTP 200 e `{}`)
 * e não manda confirmação para conta já confirmada. Consultar antes seria uma
 * ida ao banco a mais para chegar na mesma decisão.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 })
  }
  const { email } = parsed.data

  const ipLimit = await rateLimit(req, "auth-reativar-ip", 10, 900)
  if (!ipLimit.success) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde alguns minutos." },
      { status: 429 },
    )
  }
  const emailLimit = await rateLimit(req, "auth-reativar-email", 3, 300, hashEmail(email))
  if (!emailLimit.success) {
    return NextResponse.json(
      { error: "Muitas tentativas para este e-mail. Aguarde alguns minutos." },
      { status: 429 },
    )
  }

  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/resend`, {
      method: "POST",
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type: "signup", email }),
    })

    // 429 é o `max_frequency` do GoTrue e é esperado quando a pessoa clica duas
    // vezes seguidas — não é falha nossa e não muda a resposta (ver o item 2 do
    // cabeçalho). Os demais status viram log, nunca mensagem diferente.
    if (!res.ok && res.status !== 429) {
      logWarning("resend de ativação recusado pelo GoTrue", {
        area: "auth-reativar",
        status: res.status,
      })
    }
  } catch (err) {
    // Rede fora do ar não vira mensagem específica pelo mesmo motivo: a tela
    // diz "se a conta existir, enviamos", e insistir é o caminho certo.
    logWarning("falha de rede ao reenviar ativação", {
      area: "auth-reativar",
      err: err instanceof Error ? err.message : String(err),
    })
  }

  return NextResponse.json({ ok: true })
}
