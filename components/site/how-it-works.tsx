"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "motion/react";
import { ArrowRight, Check } from "lucide-react";

import { AnimatedNumber } from "@/components/site/animated-number";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.21, 0.61, 0.35, 1];

/* Vinhetas — mini-interfaces que ecoam o produto */

function DiagnosisVignette() {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const bars = [
    { name: "Ética", value: 80, fill: "bg-primary" },
    { name: "Civil", value: 55, fill: "bg-warning" },
    { name: "Penal", value: 35, fill: "bg-destructive" },
  ];
  return (
    <div ref={ref}>
      <div className="space-y-2.5">
        {bars.map((bar, i) => (
          <div key={bar.name}>
            <div className="flex items-baseline justify-between">
              <span className="text-[10px] text-muted-foreground">
                {bar.name}
              </span>
              <span className="font-mono text-[9px] tabular-nums text-muted-foreground">
                <AnimatedNumber
                  value={bar.value}
                  active={inView}
                  duration={0.8}
                  suffix="%"
                />
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
              <motion.div
                className={cn("h-full rounded-full", bar.fill)}
                initial={reduce ? false : { width: 0 }}
                whileInView={{ width: `${bar.value}%` }}
                viewport={{ once: true }}
                transition={
                  reduce
                    ? { duration: 0 }
                    : { duration: 0.9, delay: 0.15 + i * 0.12, ease: EASE }
                }
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        Seu mapa por matéria
      </p>
    </div>
  );
}

function PlanVignette() {
  const rows = [
    { day: "SEG", text: "Direito Penal — 20 questões" },
    { day: "TER", text: "Civil: contratos — 15 questões" },
    { day: "QUA", text: "Revisão dos erros da semana" },
  ];
  return (
    <div>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.day} className="flex items-center gap-2.5">
            <span className="w-9 shrink-0 rounded-md bg-primary/10 px-1.5 py-1 text-center font-mono text-[9px] font-medium text-primary-deep">
              {row.day}
            </span>
            <span className="text-[11px] leading-snug text-foreground">
              {row.text}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        Plano da semana — exemplo
      </p>
    </div>
  );
}

function SimuladoVignette() {
  return (
    <div>
      <p className="font-mono text-[9px] text-muted-foreground">
        Questão 14 de 80
      </p>
      <div className="mt-2 space-y-1.5">
        {["A", "B", "C", "D"].map((letter) => {
          const correct = letter === "B";
          return (
            <div
              key={letter}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2 py-1.5",
                correct
                  ? "border-primary/40 bg-primary/10"
                  : "border-border bg-background"
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-semibold",
                  correct
                    ? "bg-primary text-white"
                    : "border border-border bg-muted text-muted-foreground"
                )}
              >
                {letter}
              </span>
              <span
                aria-hidden
                className="h-1 rounded-full bg-border"
                style={{ width: correct ? "62%" : "74%" }}
              />
              {correct ? (
                <Check
                  className="ml-auto size-3 shrink-0 text-primary-deep"
                  aria-hidden
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        Padrão FGV
      </p>
    </div>
  );
}

const STEPS = [
  {
    title: "Faça o diagnóstico",
    body: "Um teste curto, com questões objetivas de cada matéria da 1ª fase. Você descobre seu nível real, matéria por matéria — sem achismo.",
    visual: <DiagnosisVignette />,
  },
  {
    title: "Receba um plano montado pelos seus erros",
    body: "O treino inteligente concentra cerca de 70% da carga nos temas em que você mais erra — e reequilibra o plano conforme você evolui.",
    visual: <PlanVignette />,
  },
  {
    title: "Treine no padrão da prova",
    body: "Questões e simulados completos de 80 questões no formato da FGV, com agenda de estudos e desempenho por matéria pra você saber quando está pronto.",
    visual: <SimuladoVignette />,
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="scroll-mt-20 bg-card py-24 sm:py-28">
      <div className="container-page grid gap-14 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <SectionHeading
              eyebrow="02 · Como funciona"
              title="Três passos. Nenhum desperdício."
              lead="Do diagnóstico ao simulado: um caminho direto, montado em cima dos seus erros — não de um cronograma genérico."
            />
            <Link
              href="/cadastro"
              className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-deep transition-colors duration-200 hover:text-primary"
            >
              Começar pelo diagnóstico
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className="relative space-y-10 before:absolute before:bottom-6 before:left-4 before:top-2 before:w-px before:bg-border lg:space-y-12">
            {STEPS.map((step, i) => (
              <Reveal
                key={step.title}
                delay={i * 0.05}
                className="relative grid gap-5 pl-14 sm:grid-cols-[1fr_230px] sm:gap-8"
              >
                <span className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-primary bg-card font-mono text-[11px] font-medium text-primary-deep">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground sm:text-xl">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background p-4 shadow-sm">
                  {step.visual}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
