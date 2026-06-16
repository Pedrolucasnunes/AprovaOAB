"use client";

import * as React from "react";
import Link from "next/link";
import { motion, useInView, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  BarChart3,
  Brain,
  CalendarDays,
  Check,
  FileText,
  ShieldCheck,
} from "lucide-react";

import { AnimatedNumber } from "@/components/site/animated-number";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { cn } from "@/lib/utils";

const EASE: [number, number, number, number] = [0.21, 0.61, 0.35, 1];

function CellIcon({
  icon: Icon,
  dark = false,
}: {
  icon: typeof Brain;
  dark?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg",
        dark ? "border border-night-border bg-white/5" : "bg-primary/10"
      )}
    >
      <Icon
        className={cn("size-4", dark ? "text-primary" : "text-primary-deep")}
        aria-hidden
      />
    </span>
  );
}

function SplitBar() {
  const reduce = useReducedMotion();
  const ref = React.useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <div ref={ref}>
      <div className="flex h-3 overflow-hidden rounded-full bg-border">
        <motion.div
          className="h-full rounded-full bg-primary"
          initial={reduce ? false : { width: 0 }}
          animate={inView ? { width: "70%" } : undefined}
          transition={reduce ? { duration: 0 } : { duration: 1, ease: EASE }}
        />
      </div>
      <div className="mt-2.5 flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.12em]">
        <span className="text-primary-deep">
          Pontos fracos ·{" "}
          <AnimatedNumber value={70} active={inView} prefix="~" suffix="%" />
        </span>
        <span className="text-muted-foreground">Manutenção · ~30%</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 font-mono text-[10px] text-destructive">
          Penal · 41%
        </span>
        <span className="rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 font-mono text-[10px] text-warning">
          Civil · 57%
        </span>
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[10px] text-primary-deep">
          Ética · 84%
        </span>
      </div>
    </div>
  );
}

function MiniAlternative() {
  return (
    <div className="flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5">
      <span className="flex h-4 w-4 items-center justify-center rounded bg-primary text-[9px] font-semibold text-white">
        D
      </span>
      <span aria-hidden className="h-1 w-2/3 rounded-full bg-night-border" />
      <Check className="ml-auto size-3 text-primary" aria-hidden />
    </div>
  );
}

function MiniBars() {
  const reduce = useReducedMotion();
  const values = [62, 74, 81];
  return (
    <div className="flex h-12 items-end gap-1.5">
      {values.map((v, i) => (
        <motion.div
          key={i}
          className="w-6 rounded-t-md bg-primary/70"
          initial={reduce ? false : { height: 0 }}
          whileInView={{ height: `${v}%` }}
          viewport={{ once: true }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: 0.7, delay: 0.1 + i * 0.1, ease: EASE }
          }
        />
      ))}
      <span className="ml-2 self-center font-mono text-[10px] text-muted-foreground">
        semana a semana
      </span>
    </div>
  );
}

export function Benefits() {
  return (
    <section id="beneficios" className="scroll-mt-20 bg-background py-24 sm:py-28">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            eyebrow="03 · Benefícios"
            title="O que muda na sua preparação"
            lead="Menos volume cego, mais direção: cada recurso existe pra encurtar o caminho entre onde você está e a aprovação."
          />
        </Reveal>

        <div className="mt-14 grid gap-4 md:grid-cols-6">
          {/* Treino inteligente — célula grande */}
          <Reveal className="md:col-span-4 md:row-span-2">
            <div className="flex h-full flex-col rounded-xl border border-border bg-card p-7 transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-md">
              <CellIcon icon={Brain} />
              <h3 className="mt-5 text-xl font-semibold text-foreground">
                Treino inteligente: ~70% nos seus pontos fracos
              </h3>
              <p className="mt-2.5 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
                O algoritmo lê seus erros e redistribui o plano: mais volume
                onde você perde pontos, menos onde você já está bem. Você para
                de pagar pedágio em conteúdo que já domina.
              </p>
              <div className="mt-auto pt-8">
                <SplitBar />
              </div>
            </div>
          </Reveal>

          {/* Padrão FGV — célula escura */}
          <Reveal delay={0.06} className="md:col-span-2">
            <div className="flex h-full flex-col rounded-xl border border-night-border bg-night p-6">
              <CellIcon icon={FileText} dark />
              <h3 className="mt-4 text-base font-semibold text-night-foreground">
                Padrão FGV de verdade
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-night-muted">
                Enunciado, quatro alternativas e simulados completos de 80
                questões — o mesmo formato do dia da prova.
              </p>
              <div className="mt-auto pt-5">
                <MiniAlternative />
              </div>
            </div>
          </Reveal>

          {/* Desempenho */}
          <Reveal delay={0.1} className="md:col-span-2">
            <div className="flex h-full flex-col rounded-xl border border-border bg-card p-6 transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-md">
              <CellIcon icon={BarChart3} />
              <h3 className="mt-4 text-base font-semibold text-foreground">
                Desempenho que você enxerga
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Aproveitamento por matéria e evolução a cada sessão — você sabe
                o que falta, sem surpresa.
              </p>
              <div className="mt-auto pt-5">
                <MiniBars />
              </div>
            </div>
          </Reveal>

          {/* Agenda */}
          <Reveal delay={0.05} className="md:col-span-3">
            <div className="flex h-full flex-col rounded-xl border border-border bg-card p-6 transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-md">
              <div className="flex items-start gap-4">
                <CellIcon icon={CalendarDays} />
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Agenda que cabe na sua rotina
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Sessões curtas distribuídas nos seus dias. Constância vence
                    maratona de véspera — e a agenda cuida disso por você.
                  </p>
                </div>
              </div>
            </div>
          </Reveal>

          {/* Comece sem risco */}
          <Reveal delay={0.1} className="md:col-span-3">
            <div className="flex h-full flex-col rounded-xl border border-primary/30 bg-primary/5 p-6 transition-[border-color,box-shadow] duration-200 hover:border-primary/50 hover:shadow-md">
              <div className="flex items-start gap-4">
                <CellIcon icon={ShieldCheck} />
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    Comece hoje, sem risco
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Diagnóstico completo e 10 questões por dia no plano grátis.
                    Sem cartão de crédito, sem fidelidade.
                  </p>
                  <Link
                    href="/cadastro"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary-deep transition-colors duration-200 hover:text-primary"
                  >
                    Criar conta grátis
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
