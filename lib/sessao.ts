// Dica de sessão — a marca que deixa a landing saber que quem chegou já tem conta.
//
// Parte pura, sem I/O, pelo mesmo motivo de `lib/turmas.ts`: o `proxy.ts` roda no
// edge e o header da landing roda no navegador. Os dois precisam só do nome do
// cookie, e nenhum dos dois pode arrastar cliente de banco pra dentro do bundle.

/**
 * Cookie que carrega "existe sessão" do middleware até o JS da landing.
 *
 * POR QUE UM COOKIE, e não uma checagem no cliente. A landing é prerenderizada e
 * servida do CDN (`x-nextjs-prerender: 1`, `x-vercel-cache: HIT`), então o HTML é
 * idêntico pra todo mundo e não tem como dizer quem está lendo. Enquanto isso o
 * `proxy.ts` JÁ resolve `getUser()` em `/` — até aqui só pra jogar a resposta
 * fora. Este cookie é essa resposta, aproveitada: zero consulta nova.
 *
 * A alternativa óbvia seria `supabase.auth.getSession()` no cliente, e ela é pior
 * por dois motivos medidos, não estimados:
 *
 *  1. `getSession()` NÃO é local quando o access token está vencido. Ele passa
 *     por `_recoverAndRefresh()`, que chama `_callRefreshToken()` — ida de rede —
 *     e o access token do Supabase dura 1h. Ou seja: quem some e volta dias
 *     depois, que é exatamente a pessoa que este cookie existe pra atender, cai
 *     SEMPRE nesse ramo. (O mesmo vale pro `getClientUser()` de
 *     `lib/auth-client.ts`, cujo comentário diz "sem ida à rede" — dentro do app
 *     logado não faz diferença, porque o refresh aconteceria de qualquer jeito.)
 *  2. Nenhum componente de `components/site/` importa `@/lib/supabase` hoje.
 *     A checagem no cliente arrastaria o cliente de auth inteiro pro bundle da
 *     página de marketing, que é a única onde o LCP tem consequência comercial.
 *
 * NÃO É httpOnly, e isso é o ponto inteiro — o JS da landing PRECISA ler. É o
 * oposto do `TURMA_COOKIE`, que é httpOnly justamente porque página nenhuma tem
 * motivo pra lê-lo. Quem "consertar" isto pra httpOnly desliga a funcionalidade
 * sem quebrar nada visível.
 *
 * Forjar `aoab_sess=1` não concede coisa alguma: o valor troca o RÓTULO de um
 * botão. O clique cai em `/dashboard`, onde o middleware valida o JWT de verdade
 * e desvia pro login se não houver sessão. É rótulo, não autorização — por isso
 * um booleano burro basta e nenhum dado do usuário entra aqui.
 */
export const SESSAO_COOKIE = "aoab_sess"

/**
 * 30 dias, renovados a cada requisição autenticada (validade deslizante).
 *
 * O prazo não precisa bater com o da sessão do Supabase porque a dica se conserta
 * sozinha: o middleware reescreve ou apaga o cookie em toda rota do matcher, e o
 * logout (`signOut()` seguido de `window.location.href = "/login"`, em
 * `components/dashboard/app-sidebar.tsx`) é navegação completa — passa por ele.
 *
 * O pior caso de uma dica errada é o botão dizer "Entrar" pra quem está logado,
 * que é exatamente o comportamento de hoje. Não há como regredir, só empatar.
 */
export const SESSAO_COOKIE_MAX_AGE = 60 * 60 * 24 * 30

/**
 * Existe dica de sessão neste navegador? Síncrono, sem rede, sem `navigator.locks`.
 *
 * Devolve `false` no servidor DE PROPÓSITO. A landing é prerenderizada, então o
 * HTML tem que sair no estado deslogado — o de hoje — e só mudar depois da
 * hidratação. Chutar `true` criaria mismatch de hidratação e faria a página
 * piscar "Meu dashboard" pra visitante anônimo, que é o erro mais caro dos dois:
 * 100% do tráfego de SEO é anônimo.
 */
export function temDicaDeSessao(): boolean {
  if (typeof document === "undefined") return false
  return document.cookie.split(";").some((c) => c.trim() === `${SESSAO_COOKIE}=1`)
}
