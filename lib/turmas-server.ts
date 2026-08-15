// Turmas institucionais — gravação (server-only, ignora RLS).
import { ymdBrasil } from "@/lib/datas"
import { logError } from "@/lib/logger"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { slugValido } from "@/lib/turmas"

/**
 * Marca o usuário como pertencente a uma turma. **Nunca lança.**
 *
 * Roda no caminho de cadastro, que não pode falhar por causa disto: um erro
 * aqui custa uma linha faltando num relatório interno; uma exceção custaria a
 * conta do aluno. Mesma postura do `track()` de `lib/events.ts`.
 *
 * WRITE-ONCE, garantido no WHERE (`.is("turma_id", null)`) e não em `if` no
 * código — é a mesma trava do `email_optout_at`, e pelo mesmo motivo: a decisão
 * "já tem turma?" precisa ser atômica com a escrita. Sem isso, um aluno que
 * clicasse depois no link de outra instituição trocaria de turma e sumiria do
 * relatório da primeira.
 */
export async function marcarTurma(userId: string, slugBruto: string | null | undefined): Promise<void> {
  const slug = slugValido(slugBruto)
  if (!slug) return

  try {
    const { data: turma, error } = await supabaseAdmin
      .from("turmas")
      .select("id, aberta_ate")
      .eq("slug", slug)
      .maybeSingle()

    if (error) throw error
    if (!turma) return // slug inventado ou turma removida: cookie inócuo

    // `aberta_ate` é `date`, então o PostgREST devolve "YYYY-MM-DD" e a
    // comparação com `ymdBrasil` é textual e exata. Comparar Date contra Date
    // reabriria toda a armadilha de fuso descrita em lib/datas.ts — e o erro
    // seria de poucas horas, na virada do dia, que é justamente quando ninguém
    // testa.
    if (turma.aberta_ate && turma.aberta_ate < ymdBrasil(new Date())) return

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({ turma_id: turma.id })
      .eq("id", userId)
      .is("turma_id", null)

    if (updateError) throw updateError
  } catch (err) {
    logError(err, { area: "turmas-marcar", userId, slug })
  }
}
