"use client"

import { useState } from "react"
import { Plus, Minus } from "lucide-react"
import { FadeIn } from "@/components/ui/fade-in"

// TODO: antes de ativar o plano Aprovação no Stripe, definir critério objetivo de
// "cumprimento do cronograma" para a garantia de reembolso. Sem isso, qualquer
// disputa de refund vira contra a empresa.
function buildFaqs(trialOn: boolean) {
  return [
    {
      q: "Preciso de cartão pra começar?",
      a: trialOn
        ? "Pro diagnóstico e o plano gratuito, não. Pra começar os 7 dias grátis do Pro pedimos o cartão — mas você só é cobrado no 8º dia, e pode cancelar em 1 clique antes disso."
        : "Não. O diagnóstico e o plano inicial são 100% gratuitos. Cartão só na hora de assinar o Pro.",
      defaultOpen: true,
    },
    ...(trialOn
      ? [{
          q: "Como funcionam os 7 dias grátis do Pro?",
          a: "Você assina o Pro, ganha 7 dias com tudo liberado e só é cobrado no 8º dia se não cancelar. O cancelamento é em 1 clique no painel. O teste grátis é válido uma vez por conta.",
          defaultOpen: false,
        }]
      : []),
    {
      q: "O AprovaOAB substitui um cursinho?",
      a: "Não substitui — complementa. A diferença é que aqui você estuda só o que precisa, baseado nas suas próprias lacunas, com questões no padrão FGV. Em vez de assistir 200h de aula gravada, você resolve, erra, e revisa exatamente onde tem dificuldade.",
      defaultOpen: false,
    },
    {
      q: "Funciona pra quem trabalha o dia todo?",
      a: "Foi feito pra isso. O cronograma se adapta ao seu tempo real — pode ser 40 minutos por dia.",
      defaultOpen: false,
    },
    {
      q: "E se eu não passar?",
      a: "O plano Aprovação está em desenvolvimento e terá uma garantia de aprovação com critérios objetivos. Os detalhes serão publicados no momento do lançamento desse plano.",
      defaultOpen: false,
    },
    {
      q: "Posso cancelar quando quiser?",
      a: "Sim. Cancelamento em 1 clique no painel. Sem multa, sem fidelidade, sem burocracia.",
      defaultOpen: false,
    },
  ]
}

function FaqItem({ q, a, defaultOpen }: { q: string; a: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false)

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:border-primary/40 hover:shadow-md hover:shadow-primary/5">
      <button
        className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-primary/5"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span className="font-semibold text-foreground">{q}</span>
        {open
          ? <Minus className="h-4 w-4 shrink-0 text-primary transition-transform duration-200" />
          : <Plus className="h-4 w-4 shrink-0 text-primary transition-transform duration-200" />
        }
      </button>
      {open && (
        <div className="border-t border-border px-5 pb-4 pt-3">
          <p className="text-sm leading-relaxed text-muted-foreground">{a}</p>
        </div>
      )}
    </div>
  )
}

interface FAQProps {
  trialOn: boolean
}

export function FAQ({ trialOn }: FAQProps) {
  const faqs = buildFaqs(trialOn)

  return (
    <section className="bg-muted/20 py-20 lg:py-28">
      <div className="mx-auto max-w-3xl px-4 lg:px-8">

        <FadeIn>
          <div className="mb-12 text-center">
            <span className="badge-pill mb-4 inline-flex">Dúvidas</span>
            <h2
              className="mt-4 text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Perguntas frequentes
            </h2>
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <div className="flex flex-col gap-3">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} defaultOpen={faq.defaultOpen} />
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
