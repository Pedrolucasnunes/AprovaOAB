"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

const EASE: [number, number, number, number] = [0.21, 0.61, 0.35, 1];

/**
 * `whileInView` e `initial` são SEMPRE definidos, e é o que mantém o conteúdo
 * visível pra quem usa movimento reduzido.
 *
 * O servidor não lê media query: `useReducedMotion()` devolve falso no SSR e o
 * HTML sai com `style="opacity:0;transform:translateY(26px)"` em todo mundo. Na
 * versão anterior, o cliente com `reduce` recebia `initial={false}` (não anime)
 * e `whileInView={undefined}` (nenhum alvo) — não sobrava nada que desfizesse o
 * estilo inline, e os 24 blocos da landing ficavam invisíveis pra sempre.
 * Medido em produção antes do conserto: 0 de 24 revelados sob
 * `--force-prefers-reduced-motion`, contra 18 de 24 no modo normal.
 *
 * A preferência é respeitada pela DURAÇÃO, não pela ausência de animação: sob
 * `reduce` o bloco entra na viewport e salta pro estado final em 0s.
 *
 * Isto é o conserto mínimo — o conteúdo ainda depende de JS pra aparecer. A
 * reescrita em CSS (`@keyframes` + `animation-timeline: view()` +
 * `animation-fill-mode: both`) prevista no plano de LCP resolve as duas coisas
 * de uma vez, e descarta este arquivo.
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
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-70px" }}
      transition={reduce ? { duration: 0 } : { duration: 0.65, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
