/**
 * Foto de perfil vinda do login social.
 *
 * Quem entra pelo Google já traz a foto: o Supabase copia as claims do OIDC
 * para `user_metadata` no primeiro login e reescreve a cada novo login, então
 * o endereço acompanha quem troca a foto na conta Google. Verificado na base
 * (ago/2026): das 74 contas, as 30 que têm `provider = google` têm o campo
 * preenchido, todas em `lh3.googleusercontent.com`, e nenhuma das 44 contas de
 * e-mail e senha tem — para elas as iniciais não são fallback de erro, são o
 * caminho normal.
 *
 * `avatar_url` e `picture` carregam o MESMO endereço (conferido nas 30). Ler
 * os dois é defesa contra provedor futuro que preencha só um: o `picture` é o
 * nome da claim no OIDC, o `avatar_url` é o apelido que o Supabase dá a ela.
 */
export function fotoDoPerfil(
  metadata: Record<string, unknown> | undefined,
  tamanhoPx?: number,
): string | null {
  const bruto = metadata?.avatar_url ?? metadata?.picture
  if (typeof bruto !== "string" || !bruto.startsWith("https://")) return null
  return tamanhoPx ? comTamanho(bruto, tamanhoPx) : bruto
}

/**
 * O Google serve a foto no tamanho pedido pelo sufixo `=s96-c` do endereço, e
 * 96 é o que ele manda por padrão — abaixo dos 160 CSS px que um avatar de 80px
 * ocupa numa tela retina, onde a imagem sairia borrada.
 *
 * Só reescreve quando o padrão bate exatamente; endereço de qualquer outro
 * formato passa intacto. E mesmo um endereço quebrado aqui não sangra na tela:
 * o `AvatarImage` do Radix cai sozinho no `AvatarFallback` quando a imagem não
 * carrega, que é a mesma inicial que a conta já mostrava.
 */
function comTamanho(url: string, px: number): string {
  return url.replace(/=s\d+-c$/, `=s${px}-c`)
}

/**
 * Iniciais do avatar de quem não tem foto — que são as 44 contas de e-mail e
 * senha, não um punhado de casos de erro.
 *
 * Existia em quatro lugares. Três concordavam (primeira + última palavra) e o
 * perfil usava as DUAS PRIMEIRAS, então o card dizia "CD" e a barra logo abaixo
 * dizia "CT" para a mesma pessoa — invisível enquanto os dois cantos da tela
 * não mostravam avatar ao mesmo tempo.
 *
 * O `filter(Boolean)` não é adorno: as duas cópias que partiam em `" "` cru
 * perdiam uma inicial em nome com espaço duplicado ou espaço no começo — o que
 * acontece sempre que alguém cola o nome de outro lugar. Falha silenciosa, com
 * cara de escolha de design.
 *
 * @param alternativa usada quando não há nome (o admin cai no e-mail).
 */
export function iniciaisDoNome(
  nome: string | null | undefined,
  alternativa?: string | null,
): string {
  const fonte = (nome || alternativa || "").trim()
  const partes = fonte.split(/\s+/).filter(Boolean)
  if (partes.length === 0) return "??"
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}
