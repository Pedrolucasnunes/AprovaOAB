// lib/auth-client.ts
import { supabase } from "@/lib/supabase"

/**
 * Usuário atual a partir da sessão local (lê do storage, sem ida à rede).
 *
 * Use no cliente para ler `id` / nome / metadata sem o custo do `getUser()`,
 * que faz um round-trip ao servidor de Auth do Supabase para revalidar o JWT.
 * A validação de segurança continua sendo feita no servidor pelos guards de
 * `lib/auth-server.ts` (`requireUser` / `requireAdmin`) — esta função é só UX.
 */
export async function getClientUser() {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}
