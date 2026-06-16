"use client";

import { ArrowDown, Check, X } from "lucide-react";

import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";
import { cn } from "@/lib/utils";

const OLD_WAY = [
  "Assistir aula de tudo, na ordem do edital, sem saber onde você está fraco",
  "Resolver questões soltas e repetir os mesmos erros sem perceber",
  "Chegar na reta final sem nenhuma medida real de quanto falta",
];

const NEW_WAY = [
  "O diagnóstico mostra seu nível real, matéria por matéria",
  "O plano concentra cerca de 70% do treino nos seus pontos fracos",
  "Você acompanha o aproveitamento subir e sabe o que ainda falta",
];

function Panel({
  label,
  items,
  tone,
  className,
}: {
  label: string;
  items: string[];
  tone: "old" | "new";
  className?: string;
}) {
  const Icon = tone === "old" ? X : Check;
  return (
    <div
      className={cn(
        "rounded-xl border p-6 sm:p-7",
        tone === "old"
          ? "border-border bg-card"
          : "border-primary/30 bg-primary/5 shadow-lg shadow-primary/5",
        className
      )}
    >
      <p
        className={cn(
          "font-mono text-[11px] font-medium uppercase tracking-[0.16em]",
          tone === "old" ? "text-muted-foreground" : "text-primary-deep"
        )}
      >
        {label}
      </p>
      <ul className="mt-5 space-y-4">
        {items.map((text) => (
          <li key={text} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                tone === "old"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/15 text-primary-deep"
              )}
            >
              <Icon className="size-3.5" aria-hidden />
            </span>
            <span
              className={cn(
                "text-[15px] leading-relaxed",
                tone === "old" ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProblemSolution() {
  return (
    <section className="bg-background py-24 sm:py-28">
      <div className="container-page grid gap-14 lg:grid-cols-12 lg:gap-12">
        <Reveal className="lg:col-span-5">
          <SectionHeading
            eyebrow="01 · O problema"
            title={
              <>
                Estudar muito não é{" "}
                <em className="italic text-primary-deep">estudar certo</em>.
              </>
            }
            lead="O edital da 1ª fase cobre quase vinte matérias — e a maioria dos candidatos revisa tudo com o mesmo peso, gastando semanas no que já domina."
          />
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Quem tem pouco tempo não precisa de mais conteúdo. Precisa saber
            exatamente onde perde pontos e treinar ali, no formato em que a
            banca cobra.
          </p>
        </Reveal>

        <div className="lg:col-span-7">
          <Reveal className="mr-6 sm:mr-16">
            <Panel label="Estudar no escuro" items={OLD_WAY} tone="old" />
          </Reveal>
          <Reveal delay={0.08} className="relative z-10 -my-2.5 ml-20 sm:ml-32">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-background shadow-sm">
              <ArrowDown className="size-4 text-primary-deep" aria-hidden />
            </span>
          </Reveal>
          <Reveal delay={0.14} className="ml-6 sm:ml-16">
            <Panel
              label="Estudar com diagnóstico"
              items={NEW_WAY}
              tone="new"
            />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
