import { NextRequest, NextResponse } from "next/server"
import { TURMA_COOKIE, TURMA_COOKIE_MAX_AGE, slugValido } from "@/lib/turmas"

/**
 * Para onde o link institucional leva.
 *
 * Era a landing (`/`), e em sala de aula isso custava caro: 40 alunos tendo que
 * achar o botão de cadastro sozinhos, cada um num tempo, com o professor
 * esperando. O link existe para uma coisa só — criar conta — e a landing é uma
 * página de convencimento para quem ainda não decidiu. Quem chegou por aqui já
 * foi convencido pela coordenação.
 *
 * Quem já tem conta não trava: `/cadastro` tem "Já tem uma conta? Entrar" no
 * rodapé do formulário, e quem já está logado é mandado pro dashboard pelo
 * próprio `proxy.ts`.
 */
const DESTINO = "/cadastro"

/**
 * Link institucional: `https://www.aprovaoab.app.br/turma/unp`.
 *
 * Grava a turma num cookie e manda o aluno pro cadastro. **Ele não vê nada
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
  const res = NextResponse.redirect(new URL(DESTINO, req.url))

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
