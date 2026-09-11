import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Scroll-reveal em CSS puro. Sem `motion/react`, sem `"use client"`, sem JS.
 *
 * POR QUE SAIU DO JS, e não foi troca de técnica por gosto:
 *
 * 1. O CONTEÚDO NÃO DEPENDE MAIS DE JS PRA EXISTIR. A versão anterior servia 24
 *    blocos da landing em `opacity:0` no HTML e contava com a hidratação pra
 *    revelá-los. Com JS desabilitado, bloqueado ou quebrado, a página mostrava
 *    o herói e mais nada.
 *
 * 2. A CLASSE DE ERRO DESAPARECE. O bug de set/2026 (`c00c3a7`) não foi azar:
 *    era a forma do componente. Condicionar props de animação a
 *    `useReducedMotion()` — uma media query que o SERVIDOR NÃO LÊ — produz HTML
 *    com estado inicial pra todo mundo e depende do cliente pra desfazer. Em
 *    CSS a media query é avaliada onde ela existe, e não há estado a desfazer.
 *
 * DEGRADAÇÃO, que é o argumento mais forte a favor desta abordagem: onde
 * `animation-timeline: view()` não existir, a regra base continua valendo e a
 * animação roda na timeline do DOCUMENTO — tudo aparece animado de uma vez no
 * load, em vez de ao rolar. O modo de falha é "menos bonito", nunca
 * "invisível". É o oposto exato do bug que esta reescrita encerra.
 *
 * A guarda de regressão é `scripts/reveal-reduced-motion.mjs`: ela testa
 * COMPORTAMENTO (paridade entre os modos de movimento), não implementação, e
 * por isso sobreviveu à troca. Aponte-a pra cá.
 *
 * A API é a mesma de antes — `delay` e `y` viram custom properties, então
 * nenhum dos 21 usos precisou mudar.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 26,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <div
      className={cn("reveal", className)}
      style={
        {
          "--reveal-delay": `${delay}s`,
          "--reveal-y": `${y}px`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
