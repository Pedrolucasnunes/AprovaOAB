"use client";

import { useSyncExternalStore, type MouseEvent } from "react";
import { ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";

// Antes disso o topo ainda está a um gesto de distância, e a seta só ocuparia
// o canto da tela de quem está lendo o herói.
const TELAS_ATE_APARECER = 1.5;

// Mesmo uso de `useSyncExternalStore` do header: o snapshot do SERVIDOR é
// `false`, então o HTML prerenderizado sai com a seta escondida, sem mismatch.
const assinarRolagem = (avisar: () => void) => {
  window.addEventListener("scroll", avisar, { passive: true });
  return () => window.removeEventListener("scroll", avisar);
};
const passouDoLimite = () =>
  window.scrollY > window.innerHeight * TELAS_ATE_APARECER;
const noServidor = () => false;

// A Lenis anima o clique na âncora, mas NÃO cancela a navegação nativa, e as
// duas acontecem: medido, a página ia a 0 por um quadro, voltava a 9.988 e só
// então subia suave. O `preventDefault` tira esse salto sem tirar a Lenis, que
// escuta em `window` e recebe o clique depois do React.
//
// Cancelar a navegação perde o que ela fazia de graça, mover o ponto de partida
// do Tab. Sem o `focus`, quem usa teclado vê o topo e o próximo Tab volta pro
// rodapé. O logo fica no header fixo, então `preventScroll` não briga com a
// animação, e o navegador só mostra o anel de foco pra quem veio do teclado.
function aoClicar(evento: MouseEvent<HTMLAnchorElement>) {
  if (!document.documentElement.classList.contains("lenis")) return;
  evento.preventDefault();
  document.querySelector<HTMLElement>("header a")?.focus({ preventScroll: true });
}

/**
 * Seta fixa de volta ao topo. A landing tem 13 telas no desktop e 18 no celular;
 * sem ela, quem chega ao rodapé refaz esse caminho na mão.
 *
 * NO CANTO ESQUERDO porque o direito está tomado: o WhatsApp embaixo e, logo
 * acima dele, o aviso de cookies (`bottom-24 right-6`). Espelha o WhatsApp: mesmo
 * recuo lateral e o centro na mesma altura (52px do chão), um pouco menor porque
 * suporte pesa mais que navegação. `z-40` a deixa sob os dois painéis de cookies.
 *
 * NÃO É VERDE, mesmo o verde sendo a cor da marca: ao lado do WhatsApp pareceria
 * parte dele, e no resto da página, um CTA. É o vidro escuro do header scrollado,
 * que se lê tanto nas seções claras quanto nas escuras.
 *
 * `<a href="#top">`, e não `<button>`, porque assim a Lenis entra sem ninguém
 * precisar da instância dela: o `anchors: true` de rolagem-suave.tsx trata o
 * clique. Sem a Lenis (movimento reduzido, ou ela ainda carregando) o link salta
 * sozinho, sem animação, que é o certo nos dois casos.
 *
 * O arco é a parte da página que ficou pra trás. A animação mora em globals.css;
 * onde ela não roda, o arco não é desenhado e sobra o contorno.
 */
export function VoltarAoInicio() {
  const visivel = useSyncExternalStore(
    assinarRolagem,
    passouDoLimite,
    noServidor
  );

  return (
    <a
      href="#top"
      onClick={aoClicar}
      aria-label="Voltar ao início"
      title="Voltar ao início"
      className={cn(
        "group fixed bottom-7 left-6 z-40 flex size-12 items-center justify-center rounded-full bg-night/85 text-night-foreground shadow-lg backdrop-blur-md transition-[opacity,translate,scale,visibility,background-color] duration-300 ease-out hover:bg-night focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-deep active:scale-95 motion-reduce:translate-y-0",
        visivel ? "visible opacity-100" : "invisible translate-y-3 opacity-0"
      )}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        strokeWidth="2"
        aria-hidden="true"
        className="absolute inset-0 -rotate-90"
      >
        <circle cx="24" cy="24" r="23" className="stroke-white/15" />
        <circle
          cx="24"
          cy="24"
          r="23"
          pathLength={1}
          strokeLinecap="round"
          className="voltar-inicio__arco stroke-primary"
        />
      </svg>
      <ArrowUp
        className="size-5 transition-transform duration-200 group-hover:-translate-y-0.5"
        aria-hidden
      />
    </a>
  );
}
