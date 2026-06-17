"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Check } from "lucide-react";

import { Button } from "@/components/site/ui/button";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";

const HIGHLIGHTS = [
  "Questões reais no padrão FGV, separadas por matéria",
  "Gabarito em todas — sem precisar criar conta",
  "Comentário completo e plano de estudos no AprovaOAB",
];

export function FreeQuestions() {
  return (
    <section
      id="questoes-gratis"
      className="scroll-mt-20 bg-background py-24 sm:py-28"
    >
      <div className="container-page grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
        <Reveal className="lg:col-span-6">
          <SectionHeading
            eyebrow="Questões grátis"
            title="Comece a treinar agora, sem cadastro."
            lead="Um banco aberto de questões da 1ª fase da OAB, organizado por matéria e com gabarito. Resolva antes mesmo de criar a conta."
          />

          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((text) => (
              <li key={text} className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <span className="text-sm leading-snug text-muted-foreground">
                  {text}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-9">
            <Button asChild variant="outline" size="lg" className="group">
              <Link href="/questoes">
                Ver questões grátis
                <ArrowRight
                  className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.08} className="lg:col-span-6">
          <div className="rounded-2xl border border-border bg-card p-7 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.18)] sm:p-8">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <BookOpen className="size-5 text-primary" aria-hidden />
            </span>
            <p className="mt-5 font-display text-2xl leading-tight tracking-tight text-foreground">
              Banco de questões por matéria
            </p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Direito Constitucional, Penal, Civil, Ética, Trabalho e todas as
              outras disciplinas cobradas no Exame de Ordem — cada uma com o
              próprio conjunto de questões e gabarito.
            </p>
            <Link
              href="/questoes"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors duration-200 hover:text-primary-deep"
            >
              Explorar todas as matérias
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
