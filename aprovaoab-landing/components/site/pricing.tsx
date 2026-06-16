"use client";

import { Check } from "lucide-react";

import { CtaButton } from "@/components/site/cta-button";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { cn } from "@/lib/utils";

type Plan = {
  name: string;
  badge?: { label: string; tone: "primary" | "warning" };
  price: string;
  oldPrice?: string;
  period: string;
  note?: string;
  description: string;
  features: string[];
  cta: string;
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Grátis",
    price: "R$ 0",
    period: "/pra sempre",
    description: "Pra descobrir seu nível e criar o hábito de treinar.",
    features: [
      "Diagnóstico completo por matéria",
      "Plano de estudos básico",
      "10 questões por dia",
    ],
    cta: "Começar grátis",
  },
  {
    name: "Pro",
    badge: { label: "Mais escolhido", tone: "primary" },
    price: "R$ 19",
    oldPrice: "R$ 29",
    period: "/mês",
    note: "Preço promocional de lançamento",
    description: "Pra treinar sem limite até o dia da prova.",
    features: [
      "Tudo do Grátis",
      "Questões ilimitadas",
      "Simulados completos no padrão FGV",
      "Plano dinâmico — se ajusta aos seus erros",
      "Revisão dos erros",
    ],
    cta: "Assinar o Pro",
    featured: true,
  },
  {
    name: "Aprovação",
    badge: { label: "Em breve", tone: "warning" },
    price: "R$ 49",
    period: "/mês",
    description: "Pra quem quer o treino mais personalizado possível.",
    features: [
      "Tudo do Pro",
      "Questões personalizadas pelos seus erros",
      "Suporte prioritário",
    ],
    cta: "Entrar na lista de espera",
  },
];

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={cn(
        "relative flex h-full flex-col rounded-2xl border bg-night-card p-7 transition-[border-color,box-shadow,transform] duration-200",
        plan.featured
          ? "border-primary/60 shadow-[0_30px_80px_-30px_rgba(16,185,129,0.4)] hover:shadow-[0_34px_90px_-30px_rgba(16,185,129,0.55)] lg:-my-4 lg:p-8"
          : "border-night-border hover:-translate-y-0.5 hover:border-primary/40"
      )}
    >
      {plan.badge ? (
        <span
          className={cn(
            "absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 font-mono text-[10px] font-medium uppercase tracking-[0.14em]",
            plan.badge.tone === "primary"
              ? "bg-primary text-primary-foreground"
              : "border border-warning/40 bg-night text-warning"
          )}
        >
          {plan.badge.label}
        </span>
      ) : null}

      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-night-muted">
        {plan.name}
      </p>

      <div className="mt-4 flex items-baseline gap-2">
        {plan.oldPrice ? (
          <span className="text-base text-night-muted line-through">
            {plan.oldPrice}
          </span>
        ) : null}
        <span className="font-display text-[2.6rem] leading-none text-night-foreground">
          {plan.price}
        </span>
        <span className="text-sm text-night-muted">{plan.period}</span>
      </div>
      {plan.note ? (
        <p className="mt-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-warning">
          {plan.note}
        </p>
      ) : null}

      <p className="mt-3 text-sm leading-relaxed text-night-muted">
        {plan.description}
      </p>

      <ul className="mt-6 space-y-2.5">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span className="text-sm leading-snug text-night-muted">
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-8 pt-2">
        <CtaButton
          variant={plan.featured ? "default" : "outlineDark"}
          className="w-full"
          label={plan.cta}
        />
      </div>
    </div>
  );
}

export function Pricing() {
  return (
    <section id="planos" className="scroll-mt-20 bg-night py-24 sm:py-28">
      <div className="container-page">
        <Reveal>
          <SectionHeading
            dark
            center
            eyebrow="04 · Planos"
            title="Comece grátis. Evolua quando fizer sentido."
            lead="O plano grátis existe de verdade — e o Pro você cancela quando quiser, direto na plataforma."
          />
        </Reveal>

        <div className="mt-16 grid items-stretch gap-6 lg:grid-cols-3 lg:gap-8">
          {PLANS.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.07} className="h-full">
              <PlanCard plan={plan} />
            </Reveal>
          ))}
        </div>

        <p className="mt-12 text-center font-mono text-xs text-night-muted">
          Preços em reais · sem fidelidade · cancele quando quiser
        </p>
      </div>
    </section>
  );
}
