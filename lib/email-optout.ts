import { createHmac, timingSafeEqual } from "node:crypto"
import { APP_URL } from "./app-url"

/**
 * Link de descadastro de um clique, sem login e sem tabela de tokens.
 *
 * O token é `<userId>.<assinatura HMAC-SHA256>`. HMAC e não linha em banco por
 * três motivos concretos:
 *
 * 1. **Não expira.** Um e-mail fica na caixa de entrada por anos, e link de
 *    descadastro vencido é o mesmo que link quebrado — a pessoa recorre ao
 *    botão de spam, que é o que a coluna existe pra evitar.
 * 2. **Não consulta.** Validar é recalcular o HMAC; o clique não custa uma ida
 *    ao banco antes de saber se o token presta.
 * 3. **Não vaza mais do que o e-mail já entrega.** Quem tem o link é quem
 *    recebeu a mensagem; a assinatura só impede enumerar UUIDs de terceiros.
 *
 * Não reusa `lib/crypto.ts`: aquilo é AES-256-GCM pros tokens do Google
 * Calendar, que precisam ser DECIFRADOS de volta. Aqui não há segredo a
 * guardar — só autenticidade a provar.
 *
 * ⚠️ Server-only: `EMAIL_UNSUBSCRIBE_SECRET` nunca pode ir pro bundle do
 * cliente. Nada em `components/` deve importar este arquivo.
 */

/** Prefixo que separa o id da assinatura. UUID não contém ponto. */
const SEP = "."

function segredo(): string {
  const s = process.env.EMAIL_UNSUBSCRIBE_SECRET
  // Falha barulhenta e cedo, de propósito. O modo de falha silencioso seria
  // muito pior: e-mail em massa saindo com link de descadastro que não funciona
  // — exatamente o estado que esta feature veio consertar.
  if (!s || s.length < 32) {
    throw new Error(
      "EMAIL_UNSUBSCRIBE_SECRET ausente ou curta demais (mínimo 32 chars). " +
        "Nenhum e-mail de marketing pode sair sem link de descadastro válido.",
    )
  }
  return s
}

function assinar(userId: string): string {
  return createHmac("sha256", segredo()).update(userId).digest("base64url")
}

/** Token opaco que identifica o usuário e prova que veio de nós. */
export function tokenDescadastro(userId: string): string {
  return `${userId}${SEP}${assinar(userId)}`
}

/** URL absoluta de um clique. Vai no corpo do e-mail E no header List-Unsubscribe. */
export function urlDescadastro(userId: string): string {
  return `${APP_URL}/api/email/descadastrar?token=${encodeURIComponent(tokenDescadastro(userId))}`
}

/**
 * Devolve o userId quando o token é autêntico, `null` quando não.
 *
 * Nunca lança por token malformado — entrada de rota pública é hostil por
 * definição, e 400 é resposta, não exceção.
 */
export function verificarToken(token: string | null | undefined): string | null {
  if (!token) return null

  // `lastIndexOf` e não `split`: o UUID não tem ponto hoje, mas se o formato do
  // id mudar, quebrar na ÚLTIMA separação continua achando a assinatura.
  const corte = token.lastIndexOf(SEP)
  if (corte <= 0 || corte === token.length - 1) return null

  const userId = token.slice(0, corte)
  const recebida = token.slice(corte + 1)

  let esperada: string
  try {
    esperada = assinar(userId)
  } catch {
    // Segredo ausente: não dá pra afirmar que o token é válido nem que é falso.
    // Tratar como inválido é o lado seguro.
    return null
  }

  const a = Buffer.from(recebida)
  const b = Buffer.from(esperada)
  // timingSafeEqual exige mesmo tamanho — comparar antes evita o throw e já
  // descarta o caso trivial.
  if (a.length !== b.length) return null
  return timingSafeEqual(a, b) ? userId : null
}
