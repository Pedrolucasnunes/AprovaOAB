import { NextRequest, NextResponse } from "next/server"
import { TURMA_COOKIE, TURMA_COOKIE_MAX_AGE, slugValido } from "@/lib/turmas"

/**
 * Link institucional: `https://www.aprovaoab.app.br/turma/unp`.
 *
 * Grava a turma num cookie e manda o aluno pra landing. **Ele não vê nada
 * diferente** — nem aqui, nem no cadastro, nem depois. A marca serve só pra
 * conseguir agregar o resultado da turma no fim do piloto.
 *
 * Rota de servidor e não página porque Server Component não escreve cookie no
 * App Router — só route handler, server action ou middleware.
 *
 * Por que `/turma/[slug]` e não `/unp` na raiz: um `app/[slug]/route.ts` no
 * nível de cima capturaria TODO caminho inexistente do site, e viraria armadilha
 * silenciosa na primeira rota nova que alguém criar. Quem preferir a forma
 * curta pode usar `?turma=unp` em qualquer URL — o `proxy.ts` também captura.
 *
 * Sem consulta ao banco de propósito: é caminho público de clique, e slug
 * inválido ou turma fechada já não viram nada na hora de gravar
 * (`marcarTurma`). Um cookie órfão não custa nada; uma ida ao banco no
 * redirect, sim.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const destino = new URL("/", req.url)
  const res = NextResponse.redirect(destino)

  const valido = slugValido(slug)
  if (valido) {
    res.cookies.set(TURMA_COOKIE, valido, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: TURMA_COOKIE_MAX_AGE,
      path: "/",
    })
  }

  return res
}
