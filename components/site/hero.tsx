"use client";

import dynamic from "next/dynamic";
import { motion, type Variants } from "motion/react";
import { Brain, FileText, Target } from "lucide-react";

import { CtaButton } from "@/components/site/cta-button";
import { Eyebrow } from "@/components/site/section-heading";

// Code-split da demo pesada (concentra as APIs caras do motion: springs,
// transforms, AnimatePresence). Mantém SSR (ssr é true por padrão no next/dynamic),
// então continua visível na primeira pintura — só separa o JS num chunk próprio
// pra o texto/CTA do hero hidratarem antes.
const DeviceCluster = dynamic(() =>
  import("@/components/site/device-cluster").then((m) => m.DeviceCluster)
);

const EASE: [number, number, number, number] = [0.21, 0.61, 0.35, 1];

const container: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.65, ease: EASE } },
};

const FACTS = [
  {
    icon: FileText,
    text: "Simulados de 80 questões no padrão FGV, banca do Exame de Ordem",
  },
  {
    icon: Target,
    text: "Plano de estudos montado pelos seus erros, não por um cronograma genérico",
  },
  {
    icon: Brain,
    text: "Cerca de 70% do treino concentrado nos seus pontos fracos",
  },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-night">
      {/* Fundo: grade + brilhos */}
      <div
        aria-hidden
        className="bg-grid-dark absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black_30%,transparent_80%)]"
      />
      <div aria-hidden className="absolute inset-0">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-secondary-bright/10 blur-3xl" />
      </div>

      <div className="container-page relative pb-24 pt-28 sm:pt-32 lg:pb-32 lg:pt-40">
        <div className="grid items-center gap-16 lg:grid-cols-12 lg:gap-10">
          {/* Coluna editorial */}
          <motion.div
            className="lg:col-span-5"
            variants={container}
            // Above-the-fold: renderiza já visível (sem fade-in escalonado) pra
            // não esconder o título/CTA até o JS hidratar. initial={false} propaga
            // pros filhos `item`, que passam a pintar no estado final imediatamente.
            initial={false}
            animate="visible"
          >
            <motion.div variants={item}>
              <Eyebrow>Preparação pra 1ª fase da OAB</Eyebrow>
            </motion.div>

            <motion.h1
              variants={item}
              className="mt-6 font-display text-[2.65rem] leading-[1.04] tracking-tight text-night-foreground text-balance sm:text-6xl xl:text-[4.35rem]"
            >
              Estude{" "}
              <em className="italic text-primary">só o que você precisa</em>{" "}
              pra passar na OAB.
            </motion.h1>

            <motion.p
              variants={item}
              className="mt-6 max-w-md text-base leading-relaxed text-night-muted sm:text-lg"
            >
              Um diagnóstico curto mede seu nível em cada matéria. A partir dos
              seus erros, o AprovaOAB monta um plano personalizado — e
              concentra o treino onde você mais perde pontos.
            </motion.p>

            <motion.div variants={item} className="mt-9">
              <CtaButton size="lg" label="Começar grátis" />
              <p className="mt-3.5 font-mono text-xs text-night-muted">
                Grátis pra sempre · sem cartão de crédito · cancele quando
                quiser
              </p>
            </motion.div>

            <motion.ul
              variants={item}
              className="mt-10 space-y-3 border-t border-night-border pt-7"
            >
              {FACTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-night-border bg-white/5">
                    <Icon className="size-3.5 text-primary" aria-hidden />
                  </span>
                  <span className="text-sm leading-snug text-night-muted">
                    {text}
                  </span>
                </li>
              ))}
            </motion.ul>
          </motion.div>

          {/* Cluster de dispositivos */}
          <div className="lg:col-span-7">
            <DeviceCluster />
          </div>
        </div>
      </div>
    </section>
  );
}
