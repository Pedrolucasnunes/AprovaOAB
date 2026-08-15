// Turmas institucionais — parte pura (sem I/O, sem `supabaseAdmin`).
//
// Está separada de `lib/turmas-server.ts` pelo mesmo motivo de
// `lib/events-client.ts`: o `proxy.ts` roda no edge e precisa só do nome do
// cookie e da validação do slug. Importar o cliente de service role ali seria
// arrastar a chave pro bundle do middleware sem nenhum uso.

/**
 * Cookie que carrega a turma do clique no link até a criação da conta.
 *
 * Cookie e não localStorage por uma razão estrutural: os DOIS pontos onde o
 * cadastro se completa rodam no servidor — `/api/auth/signup` (e-mail) e
 * `/auth/callback` (Google). localStorage é invisível pro segundo, e o Google
 * responde por 30 das 72 contas da base. Cookie chega nos dois de graça.
 *
 * httpOnly: o valor não concede nada (não é sessão, não libera conteúdo, não
 * muda a experiência do aluno), então forjá-lo compra no máximo uma linha
 * errada num relatório de piloto. httpOnly mesmo assim, porque JS de página
 * nenhuma tem motivo pra ler ou escrever isso.
 */
export const TURMA_COOKIE = "aoab_turma"

/**
 * 90 dias. O aluno pode clicar no link na aula de quinta e só criar a conta no
 * fim de semana seguinte — ou depois das provas. O prazo curto de verdade quem
 * dá é `turmas.aberta_ate`, verificado no banco na hora de gravar; este aqui é
 * só a sobrevida do cookie no navegador.
 */
export const TURMA_COOKIE_MAX_AGE = 60 * 60 * 24 * 90

/** Mesma regra do CHECK `turmas_slug_formato` na migration. */
const SLUG = /^[a-z0-9][a-z0-9-]{1,39}$/

/**
 * Normaliza e valida um slug vindo da URL. `null` quando não serve.
 *
 * A validação aqui é só de forma — se o slug EXISTE e está aberto é decidido no
 * banco, no momento de gravar. Um `?turma=inventado` deixa um cookie inócuo que
 * nunca vira linha nenhuma.
 */
export function slugValido(raw: string | null | undefined): string | null {
  if (!raw) return null
  const s = raw.trim().toLowerCase()
  return SLUG.test(s) ? s : null
}

/** Folga entre criar a conta pelo Google e voltar do OAuth. Segundos, na prática. */
const JANELA_CONTA_NOVA_MS = 5 * 60_000

/**
 * A conta acabou de ser criada?
 *
 * Existe por causa do Google: `/auth/callback` roda em TODO login, não só no
 * primeiro. Sem esta checagem, um aluno que já tem conta e clicou num link
 * institucional compartilhado entraria na turma no login seguinte — que é
 * exatamente o vetor de contaminação que o piloto não pode ter. O caminho de
 * e-mail não precisa disso: lá a marcação acontece dentro do próprio `signUp`.
 */
export function contaRecemCriada(createdAt: string | null | undefined, agora = Date.now()): boolean {
  if (!createdAt) return false
  const t = new Date(createdAt).getTime()
  return Number.isFinite(t) && agora - t < JANELA_CONTA_NOVA_MS
}
