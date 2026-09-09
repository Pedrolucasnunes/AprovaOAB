import type { ReactNode } from "react"

import { PainelCronograma } from "@/components/auth/painel-cronograma"

/**
 * A casca das telas de auth: calendário à esquerda, formulário à direita.
 *
 * Envolve TODOS os estados das duas telas — `/login` tem formulário e código
 * OTP; `/cadastro` tem formulário, verificação e sucesso. Se a casca ficasse
 * só no primeiro passo, a pessoa perderia a metade esquerda no meio do fluxo,
 * que é exatamente onde ela mais precisa lembrar por que está preenchendo
 * aquilo.
 *
 * O painel é escuro FIXO e o formulário segue o tema do usuário. A landing é
 * pinada no claro (`.force-light` em globals.css) e o app segue o sistema: sem
 * isso, a jornada landing → login → dashboard dava dois saltos de tema em três
 * cliques. Assim o escuro aparece uma vez só, no lugar onde ele é a ponte.
 *
 * No celular a coluna esquerda vira uma faixa curta no topo (marca + a frase
 * da contagem) — o painel some do caminho e o formulário fica acima da dobra.
 */
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr] bg-background lg:grid-cols-2 lg:grid-rows-1">
      <PainelCronograma />

      <main className="flex items-center justify-center px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto w-full max-w-sm">{children}</div>
      </main>
    </div>
  )
}
