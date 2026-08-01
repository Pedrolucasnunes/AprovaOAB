"use client";

import { useCallback, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";

import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import {
  DEPOIMENTOS,
  MIN_DEPOIMENTOS,
  type Depoimento,
} from "@/lib/depoimentos";

// Carrossel com rolagem automática, por scroll-snap nativo + rAF. Sem biblioteca.
//
// POR QUE NÃO O `.marquee-track` DO globals.css (que já existe, comentado
// "social proof"): ele anima `transform` dentro de um `overflow: hidden`, e um
// track transformado não é rolável — o dedo não arrasta nada. No desktop dá
// certo porque o hover pausa; no touch não existe hover, então o usuário
// ficaria sem NENHUM controle sobre um texto que se move enquanto ele lê.
// Mexer em `scrollLeft` mantém o arrasto nativo, e o toque vira o "pausar" que
// o mobile não tem via mouse.
//
// A lista é renderizada DUAS vezes: quando a rolagem passa da metade, a posição
// volta metade pra trás. Como as duas metades são idênticas, o salto é
// invisível e o loop não tem emenda. A segunda cópia é `aria-hidden` — leitor
// de tela lê dez depoimentos, não vinte.
//
// Abaixo de MIN_DEPOIMENTOS a seção some inteira. Mesma regra do MIN_ATTEMPTS
// em lib/seo/stats.ts.

const GAP_PX = 16; // precisa bater com o gap-4 da trilha
const VELOCIDADE_PX_S = 32; // devagar o bastante pra ler enquanto anda
const RETOMADA_MS = 1800; // respiro depois de um clique ou de tirar o dedo

function DepoimentoCard({
  depoimento,
  clone = false,
}: {
  depoimento: Depoimento;
  /** Card da segunda volta: existe só pro loop, e não pro leitor de tela. */
  clone?: boolean;
}) {
  // Sem foto: não existe foto de ninguém, e stock photo aqui seria justamente a
  // mentira que a seção existe pra não contar. A inicial em círculo é o mesmo
  // recurso que a landing já usa em benefits.tsx.
  const inicial = depoimento.nome.trim().charAt(0).toUpperCase();

  return (
    <figure
      aria-hidden={clone || undefined}
      className="flex shrink-0 basis-[86%] flex-col rounded-xl border border-border bg-background p-6 shadow-sm sm:basis-[46%] lg:basis-[31%]"
    >
      <Quote className="size-5 shrink-0 text-primary/40" aria-hidden />

      <blockquote className="mt-4 text-[15px] leading-relaxed text-foreground">
        {depoimento.texto}
      </blockquote>

      {/* mt-auto ancora a assinatura na base. Num flex row os cards já saem
          todos com a altura do mais alto, então isso alinha os nomes numa linha
          só — é o que faz a fileira parecer organizada em vez de solta. */}
      <figcaption className="mt-auto flex items-center gap-3 pt-6">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
        >
          {inicial}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">
            {depoimento.nome}
          </span>
          {depoimento.contexto ? (
            <span className="block text-xs leading-snug text-muted-foreground">
              {depoimento.contexto}
            </span>
          ) : null}
        </span>
      </figcaption>
    </figure>
  );
}

function Seta({
  direcao,
  onClick,
}: {
  direcao: "anterior" | "proximo";
  onClick: () => void;
}) {
  const Icone = direcao === "anterior" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={
        direcao === "anterior"
          ? "Ver depoimentos anteriores"
          : "Ver próximos depoimentos"
      }
      className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-border bg-background text-foreground outline-none transition-colors duration-200 hover:border-primary/50 hover:text-primary-deep focus-visible:ring-2 focus-visible:ring-ring/60"
    >
      <Icone className="size-5" aria-hidden />
    </button>
  );
}

export function Depoimentos() {
  const trilhaRef = useRef<HTMLDivElement>(null);
  const pausadoRef = useRef(false);
  const retomadaRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pausar = useCallback(() => {
    if (retomadaRef.current) {
      clearTimeout(retomadaRef.current);
      retomadaRef.current = null;
    }
    pausadoRef.current = true;
  }, []);

  const retomar = useCallback((atrasoMs = 0) => {
    if (retomadaRef.current) clearTimeout(retomadaRef.current);
    if (atrasoMs === 0) {
      pausadoRef.current = false;
      return;
    }
    // Depois de um clique na seta ou de tirar o dedo: o scroll suave e a
    // inércia do touch ainda estão correndo, e voltar a empurrar no mesmo
    // instante brigaria com os dois.
    retomadaRef.current = setTimeout(() => {
      pausadoRef.current = false;
      retomadaRef.current = null;
    }, atrasoMs);
  }, []);

  useEffect(() => {
    const el = trilhaRef.current;
    if (!el) return;

    // Quem pediu menos movimento não recebe movimento nenhum: a trilha continua
    // rolável na mão e as setas continuam funcionando.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let raf = 0;
    let ultimo = performance.now();
    let esperado = el.scrollLeft;

    // O reset tem que ser o PERÍODO — a distância entre um card e o seu clone —
    // e não `scrollWidth / 2`. Os dois não coincidem: entre as duas voltas
    // existe um gap a mais do que dentro de cada volta, então metade da largura
    // cairia fora do card e o loop derivaria alguns pixels por volta. Medir o
    // offsetLeft do primeiro clone acerta sozinho, com qualquer gap e qualquer
    // quantidade de depoimentos.
    const periodo = () => {
      const cards = el.children;
      const primeiro = cards[0] as HTMLElement | undefined;
      const clone = cards[DEPOIMENTOS.length] as HTMLElement | undefined;
      if (!primeiro || !clone) return 0;
      return clone.offsetLeft - primeiro.offsetLeft;
    };

    const passo = (agora: number) => {
      // Teto no delta: com a aba em segundo plano o rAF congela, e sem isto a
      // primeira volta daria um salto proporcional ao tempo parado.
      const dt = Math.min(agora - ultimo, 100);
      ultimo = agora;

      const volta = periodo();

      if (pausadoRef.current || volta <= 0) {
        esperado = el.scrollLeft;
      } else {
        // Se as setas ou o dedo mexeram na posição, adota a real em vez de
        // insistir na que a animação vinha calculando.
        if (Math.abs(el.scrollLeft - esperado) > 2) esperado = el.scrollLeft;
        esperado += (VELOCIDADE_PX_S * dt) / 1000;
        if (esperado >= volta) esperado -= volta;
        el.scrollLeft = esperado;
      }
      raf = requestAnimationFrame(passo);
    };

    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(
    () => () => {
      if (retomadaRef.current) clearTimeout(retomadaRef.current);
    },
    []
  );

  const mover = useCallback(
    (direcao: -1 | 1) => {
      const el = trilhaRef.current;
      if (!el) return;
      pausar();
      const card = el.firstElementChild as HTMLElement | null;
      // Um card por clique, não uma "página".
      const passo = card ? card.offsetWidth + GAP_PX : el.clientWidth;
      const suave = !window.matchMedia("(prefers-reduced-motion: reduce)")
        .matches;
      el.scrollBy({ left: passo * direcao, behavior: suave ? "smooth" : "auto" });
      retomar(RETOMADA_MS);
    },
    [pausar, retomar]
  );

  if (DEPOIMENTOS.length < MIN_DEPOIMENTOS) {
    // Sem isto você cola dois depoimentos, não vê nada e procura o bug no CSS.
    if (process.env.NODE_ENV === "development" && DEPOIMENTOS.length > 0) {
      console.warn(
        `[depoimentos] ${DEPOIMENTOS.length} de ${MIN_DEPOIMENTOS} necessários — ` +
          `a seção não vai renderizar. Ver lib/depoimentos.ts.`
      );
    }
    return null;
  }

  return (
    <section id="depoimentos" className="scroll-mt-20 bg-card py-24 sm:py-28">
      <div className="container-page">
        <div className="flex items-end justify-between gap-8">
          <Reveal>
            <SectionHeading
              eyebrow="Depoimentos"
              title="Quem já está estudando assim"
              lead="Mensagens de candidatos que usam o AprovaOAB na preparação para a 1ª fase, com as palavras de quem escreveu."
            />
          </Reveal>

          {/* Só no desktop: no touch o gesto é o arrasto, e seta em tela pequena
              rouba espaço de um card. */}
          <Reveal delay={0.08} className="hidden shrink-0 lg:block">
            <div className="flex gap-2">
              <Seta direcao="anterior" onClick={() => mover(-1)} />
              <Seta direcao="proximo" onClick={() => mover(1)} />
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.12} className="mt-14">
          {/* Os quatro pares de gatilho cobrem as quatro formas de "estou lendo
              isto": mouse parado em cima, teclado com foco dentro, dedo na tela
              e clique na seta (dentro do `mover`). Sem o de foco, quem navega
              por Tab veria o card fugindo embaixo do cursor. */}
          <div
            ref={trilhaRef}
            tabIndex={0}
            role="group"
            aria-roledescription="carrossel"
            aria-label="Depoimentos de usuários"
            onMouseEnter={pausar}
            onMouseLeave={() => retomar()}
            onFocusCapture={pausar}
            onBlurCapture={() => retomar()}
            onTouchStart={pausar}
            onTouchEnd={() => retomar(RETOMADA_MS)}
            onTouchCancel={() => retomar(RETOMADA_MS)}
            className="flex gap-4 overflow-x-auto pb-2 outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-ring/60 [&::-webkit-scrollbar]:hidden"
          >
            {/* Segunda volta em seguida da primeira, como irmãos diretos e não
                dentro de um wrapper: o cálculo do período mede o offsetLeft do
                card de índice DEPOIMENTOS.length, então os 20 cards precisam
                dividir o mesmo gap. Os dez clones são aria-hidden. */}
            {[...DEPOIMENTOS, ...DEPOIMENTOS].map((depoimento, i) => (
              <DepoimentoCard
                key={`${i}-${depoimento.nome}`}
                depoimento={depoimento}
                clone={i >= DEPOIMENTOS.length}
              />
            ))}
          </div>
        </Reveal>

        <p className="mt-8 text-center font-mono text-xs text-muted-foreground">
          Depoimentos reais · publicados com autorização de cada pessoa
        </p>
      </div>
    </section>
  );
}
