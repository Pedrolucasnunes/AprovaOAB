"use client";

import { useEffect } from "react";

import "lenis/dist/lenis.css";

/**
 * Inércia na rolagem da landing (Lenis). Não renderiza nada.
 *
 * POR QUE EXISTE: as animações da seção do painel são dirigidas pela POSIÇÃO da
 * rolagem (`animation-timeline`). CSS não consegue fazê-las "ficar para trás"
 * de um flick: 2000px de rolagem em 300ms atravessavam o arco inteiro de uma
 * vez. A Lenis não mexe em nenhuma animação — ela suaviza a própria posição da
 * rolagem, e as animações acompanham de graça.
 *
 * TRÊS DECISÕES, todas pra que isto seja só um acréscimo:
 *
 * 1. `import()` dinâmico DEPOIS da hidratação. A biblioteca (~5 KB gzip) fica
 *    fora do caminho crítico do LCP, que é o texto do herói renderizado no
 *    servidor. Sem JS a página é a mesma de antes, com rolagem nativa.
 * 2. Movimento reduzido: não liga e nem baixa a biblioteca.
 * 3. Toque fica nativo (`syncTouch` é falso por padrão e continua assim):
 *    inércia simulada em cima da inércia do sistema é a receita clássica de
 *    enjoo.
 *
 * `anchors: true` deixa os links do menu suaves; a Lenis lê o
 * `scroll-margin-top` do destino, então o `scroll-mt-20` das seções continua
 * valendo e o offset não precisa ser repetido aqui.
 *
 * Montado só em `app/page.tsx`: o app logado mantém a rolagem nativa.
 */
export function RolagemSuave() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelado = false;
    let lenis: { destroy: () => void } | undefined;

    import("lenis").then(({ default: Lenis }) => {
      if (cancelado) return;
      lenis = new Lenis({
        autoRaf: true,
        anchors: true,
        // Abaixo do padrão (0.1): um pouco mais de peso, que é o que faz um
        // flick deslizar pelo arco do painel em vez de saltá-lo.
        lerp: 0.085,
      });
    });

    return () => {
      cancelado = true;
      lenis?.destroy();
    };
  }, []);

  return null;
}
