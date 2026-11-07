// Recusas de senha do Supabase Auth, no texto que a tela mostra.
//
// O GoTrue responde em inglês ("Password is known to be weak and easy to
// guess..."), e cada tela fazia uma coisa: o cadastro repassava o texto cru, o
// perfil também, e a nova senha trocava QUALQUER recusa por "o link pode ter
// expirado", o que manda a pessoa pedir outro link para uma senha que vai ser
// recusada de novo. Com "senhas vazadas" ligado no painel, a recusa por
// vazamento é o caso comum, não o raro: "Senha123" passa nas regras do site e
// está em todo vazamento.
//
// Puro e sem import de servidor: roda nas telas e nas rotas.

type ErroDoAuth = { code?: string; reasons?: string[] } | null | undefined

/** Mensagem para uma recusa de senha, ou `null` se o erro for de outro tipo. */
export function mensagemDeSenha(erro: ErroDoAuth): string | null {
  switch (erro?.code) {
    case "weak_password":
      return erro.reasons?.includes("pwned")
        ? "Essa senha já apareceu em vazamentos de dados na internet. Escolha outra."
        : "A senha precisa ter pelo menos 8 caracteres, com letras e números."
    case "same_password":
      return "A nova senha precisa ser diferente da atual."
    case "reauthentication_needed":
      return "Por segurança, saia e entre de novo na sua conta antes de trocar a senha."
    default:
      return null
  }
}

/**
 * A verificação humana (Turnstile) não passou: o pedido chegou sem comprovante,
 * com um vencido ou com um já usado. O Supabase confere isso ANTES de olhar
 * e-mail e senha, então dizer que foi a verificação não revela se a conta existe.
 * Sem esta mensagem, o login mostraria "E-mail ou senha incorretos" para quem
 * digitou tudo certo.
 */
export const MENSAGEM_VERIFICACAO =
  "Não conseguimos concluir a verificação de segurança. Recarregue a página e tente de novo."

export function falhouVerificacao(erro: ErroDoAuth): boolean {
  return erro?.code === "captcha_failed"
}
