"use client"

import { Button } from "@/components/ui/button"

/**
 * O botão do login social, com o "G" oficial.
 *
 * Existe separado porque o SVG de 4 caminhos estava copiado igual no login e
 * no cadastro — e o `fill` de cada caminho é cor de marca do Google, o tipo de
 * literal que ninguém confere quando está duplicado.
 *
 * O rótulo é prop: "Continuar com Google" entrando, "Cadastrar com Google"
 * criando conta. A ação também, porque o cadastro instrumenta o clique.
 *
 * SOBRE O PREENCHIMENTO. A variante `outline` sozinha deixava o botão chapado
 * nos dois temas: no escuro ela pinta `bg-input/30`, que sobre o fundo da
 * página quase não aparece; no claro pinta branco sobre branco, sobrando só o
 * fio da borda. Aqui a superfície é declarada — `bg-card` fica um degrau acima
 * do fundo nos dois temas, a borda um degrau acima dela, e a sombra fecha o
 * relevo.
 *
 * Os degraus são diferentes por tema porque o sentido do relevo é: no claro a
 * superfície elevada é mais ESCURA que a página (#F8FAFC sobre branco) e o
 * hover escurece mais; no escuro ela é mais CLARA que a página (`bg-muted`,
 * #1F2937 contra #0F172A) e o hover clareia. `bg-card` no escuro foi medido em
 * 1,01:1 contra o fundo — mesma cor, na prática — e por isso não serve aqui.
 *
 * Os valores saem de TOKEN e não de `slate-*` por dois motivos: `slate-900` é
 * #0F172A, exatamente a cor de fundo do tema escuro — o botão sumiria —, e
 * valor fixo pintaria um botão escuro no tema claro, que esta coluna também
 * usa. `hover:bg-muted` também substitui o `hover:bg-accent` herdado da
 * variante, que é VERDE (`--accent` = #10B981) e virava um botão verde do
 * Google no tema claro.
 */
export function BotaoGoogle({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      className="w-full gap-2 border-border bg-card shadow-sm transition-colors hover:border-primary/40 hover:bg-muted hover:text-foreground dark:bg-muted dark:hover:bg-white/[0.12]"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
      {label}
    </Button>
  )
}
