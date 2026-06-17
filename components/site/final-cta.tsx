"use client";

import { CtaButton } from "@/components/site/cta-button";
import { Eyebrow } from "@/components/site/section-heading";
import { Reveal } from "@/components/site/reveal";

export function FinalCta() {
  return (
    <section className="relative overflow-hidden bg-night">
      <div
        aria-hidden
        className="bg-grid-dark absolute inset-0 [mask-image:radial-gradient(ellipse_60%_70%_at_50%_50%,black_25%,transparent_80%)]"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-1/2 h-80 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="container-page relative py-24 sm:py-32">
        <Reveal className="mx-auto max-w-2xl text-center">
          <Eyebrow>Comece agora</Eyebrow>
          <h2 className="mt-6 font-display text-4xl leading-[1.08] tracking-tight text-night-foreground text-balance sm:text-5xl">
            Sua aprovação começa com um{" "}
            <em className="italic text-primary">diagnóstico</em>.
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-base leading-relaxed text-night-muted sm:text-lg">
            Crie a conta grátis, descubra onde você perde pontos e estude com
            direção desde a primeira sessão.
          </p>
          <div className="mt-9">
            <CtaButton size="lg" label="Começar grátis" />
            <p className="mt-3.5 font-mono text-xs text-night-muted">
              Sem cartão de crédito · cancele quando quiser
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
