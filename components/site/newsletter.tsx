"use client";

import { Coffee, Newspaper, Sparkles, Target } from "lucide-react";

import { CtaButton } from "@/components/site/cta-button";
import { Eyebrow } from "@/components/site/section-heading";
import { Reveal } from "@/components/site/reveal";

const PILLARS = [
  {
    icon: Target,
    title: "Uma questão comentada",
    text: "Uma questão real no padrão FGV, com o gabarito explicado e a pegadinha que derruba a maioria.",
  },
  {
    icon: Newspaper,
    title: "A notícia da semana",
    text: "O que mudou no mundo jurídico e na OAB, em poucos minutos de leitura — sem juridiquês.",
  },
  {
    icon: Sparkles,
    title: "Uma curiosidade",
    text: "Um detalhe do Direito pra fixar conteúdo sem parecer estudo — e render conversa.",
  },
];

export function Newsletter() {
  return (
    <section id="newsletter" className="relative overflow-hidden bg-night py-24 sm:py-28">
      <div
        aria-hidden
        className="bg-grid-dark absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,black_25%,transparent_80%)]"
      />
      <div
        aria-hidden
        className="absolute -right-24 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="container-page relative">
        <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Coluna editorial */}
          <Reveal className="lg:col-span-6">
            <Eyebrow>
              <Coffee className="size-3.5" aria-hidden />
              Newsletter
            </Eyebrow>
            <h2 className="mt-6 font-display text-3xl leading-[1.1] tracking-tight text-night-foreground text-balance sm:text-4xl lg:text-[2.75rem]">
              <em className="italic text-primary">Café com OAB</em>: sua dose
              semanal de preparação.
            </h2>
            <p className="mt-5 max-w-md text-base leading-relaxed text-night-muted sm:text-lg">
              Toda terça de manhã, um e-mail curto pra manter o ritmo entre uma
              sessão de estudo e outra. Direto, sem enrolação e de graça.
            </p>

            <div className="mt-9">
              <CtaButton size="lg" label="Criar conta grátis" />
              <p className="mt-3.5 font-mono text-xs text-night-muted">
                A newsletter chega junto com a sua conta · cancele quando quiser
              </p>
            </div>
          </Reveal>

          {/* Coluna dos pilares */}
          <Reveal delay={0.08} className="lg:col-span-6">
            <ul className="space-y-4">
              {PILLARS.map(({ icon: Icon, title, text }) => (
                <li
                  key={title}
                  className="flex gap-4 rounded-2xl border border-night-border bg-night-card p-5 transition-colors duration-200 hover:border-primary/40"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-night-border bg-white/5">
                    <Icon className="size-5 text-primary" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-night-foreground">
                      {title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-night-muted">
                      {text}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
