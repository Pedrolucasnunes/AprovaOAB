import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Check, ArrowRight, Zap } from "lucide-react"
import { FadeIn } from "@/components/ui/fade-in"
import { CheckoutButton } from "@/components/checkout-button"
import { TRIAL_DAYS } from "@/lib/trial"

function buildPlans(trialOn: boolean) {
  return [
    {
      id: "gratis",
      label: "Grátis",
      price: "R$ 0",
      period: "pra sempre",
      priceTotal: null,
      description: "Descubra seu nível e entenda exatamente onde melhorar.",
      highlight: false,
      badge: null,
      features: [
        "Diagnóstico inicial completo",
        "Plano básico de estudos",
        "Até 10 questões por dia",
      ],
      missing: [
        "Questões ilimitadas",
        "Simulados completos",
        "Questões personalizadas com base nos seus erros",
      ],
      cta: "Começar grátis",
      href: "/cadastro",
    },
    {
      id: "pro",
      label: "Pro",
      price: "R$ 19",
      originalPrice: "R$ 29",
      period: "/mês",
      priceTotal: trialOn
        ? `${TRIAL_DAYS} dias grátis · depois R$ 19/mês`
        : "acesso antecipado · cancele quando quiser",
      description: "Para quem quer estudar com foco no que realmente cai.",
      highlight: true,
      badge: "Mais escolhido",
      features: [
        "Tudo do plano Grátis",
        "Questões ilimitadas",
        "Simulados completos estilo FGV",
        "Plano de estudos dinâmico",
        "Revisão automática",
      ],
      missing: [],
      cta: trialOn ? "Começar 7 dias grátis" : "Assinar plano Pro",
      href: "/cadastro",
    },
    {
      id: "aprovacao",
      label: "Aprovação",
      price: "R$ 49",
      period: "/mês",
      priceTotal: null,
      description: "Para quem quer recursos extras e suporte prioritário.",
      highlight: false,
      badge: "Em breve",
      features: [
        "Tudo do plano Pro",
        "Questões personalizadas com base nos seus erros",
        "Suporte prioritário por email",
      ],
      missing: [],
      cta: "Entrar na lista de espera",
      href: "/cadastro",
    },
  ]
}

interface PricingProps {
  trialOn: boolean
}

export function Pricing({ trialOn }: PricingProps) {
  const plans = buildPlans(trialOn)

  return (
    <section id="planos" className="py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">

        {/* Heading */}
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <span className="badge-pill mb-4 inline-flex">Planos</span>
            <h2
              className="text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Menos que um{" "}
              <em className="not-italic text-primary">café por dia</em>.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Comece grátis. Assine só quando tiver certeza.
            </p>
          </div>
        </FadeIn>

        {/* Cards */}
        <div className="mt-14 grid gap-6 lg:grid-cols-3 lg:items-start">
          {plans.map((plan, index) => (
            <FadeIn key={plan.id} delay={index * 120} duration={700}>
              <div
                className={`relative flex h-full flex-col rounded-2xl border p-8 ${
                  plan.highlight
                    ? "border-primary bg-primary text-primary-foreground shadow-2xl shadow-primary/20 ring-1 ring-primary"
                    : "card-hover border-border bg-card hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5"
                }`}
              >
                {/* Badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-wider whitespace-nowrap ${
                        plan.highlight
                          ? "bg-[#b8860b] text-white"
                          : "border border-[#b8860b]/30 bg-[#fff4cc] text-[#b8860b] dark:border-[#b8860b]/20 dark:bg-[#b8860b]/10"
                      }`}
                    >
                      <Zap className="h-3 w-3" />
                      {plan.badge}
                    </span>
                  </div>
                )}

                {/* Label */}
                <p
                  className={`font-mono text-xs font-medium uppercase tracking-[0.12em] ${
                    plan.highlight ? "text-primary-foreground/60" : "text-[#b8860b]"
                  }`}
                >
                  {plan.label}
                </p>

                {/* Preço original riscado */}
                {"originalPrice" in plan && plan.originalPrice && (
                  <p className={`mt-3 font-mono text-sm font-medium line-through ${
                    plan.highlight ? "text-primary-foreground/50" : "text-muted-foreground/60"
                  }`}>
                    {plan.originalPrice}/mês
                  </p>
                )}

                {/* Preço */}
                <div className={`flex items-end gap-1 ${"originalPrice" in plan && plan.originalPrice ? "mt-1" : "mt-3"}`}>
                  <span
                    className="text-4xl font-black tracking-tight"
                    style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                  >
                    {plan.price}
                  </span>
                  <span
                    className={`mb-1 text-sm font-medium ${
                      plan.highlight ? "text-primary-foreground/70" : "text-muted-foreground"
                    }`}
                  >
                    {plan.period}
                  </span>
                </div>

                {plan.priceTotal && (
                  <p
                    className={`mt-1 font-mono text-xs ${
                      plan.highlight ? "text-primary-foreground/60" : "text-muted-foreground"
                    }`}
                  >
                    {plan.priceTotal}
                  </p>
                )}

                <p
                  className={`mt-3 text-sm leading-relaxed ${
                    plan.highlight ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}
                >
                  {plan.description}
                </p>

                <div
                  className={`my-6 h-px ${
                    plan.highlight ? "bg-primary-foreground/20" : "bg-border"
                  }`}
                />

                {/* Features ativas */}
                <ul className="flex flex-col gap-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <div
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                          plan.highlight ? "bg-primary-foreground/20" : "bg-primary/10"
                        }`}
                      >
                        <Check
                          className={`h-2.5 w-2.5 ${
                            plan.highlight ? "text-primary-foreground" : "text-primary"
                          }`}
                        />
                      </div>
                      <span
                        className={`text-sm leading-snug ${
                          plan.highlight ? "text-primary-foreground/90" : "text-foreground"
                        }`}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                  {/* Features ausentes */}
                  {plan.missing.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 opacity-40">
                      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-muted">
                        <span className="text-[10px]">✕</span>
                      </div>
                      <span className="text-sm leading-snug text-muted-foreground line-through">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <div className="mt-auto pt-8">
                  {plan.id === "pro" ? (
                    <CheckoutButton
                      plano="pro"
                      trial={trialOn}
                      className={plan.highlight ? "bg-white text-primary hover:bg-white/90" : ""}
                      variant={plan.highlight ? "default" : "outline"}
                    >
                      {plan.cta}
                    </CheckoutButton>
                  ) : plan.id === "aprovacao" ? (
                    <Button
                      size="lg"
                      variant="outline"
                      disabled
                      className="w-full gap-2 py-6 text-base font-semibold opacity-60"
                    >
                      {plan.cta}
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      asChild
                      variant="outline"
                      className="w-full gap-2 py-6 text-base font-semibold"
                    >
                      <Link href={plan.href}>
                        {plan.cta}
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={400}>
          <p className="mt-10 text-center font-mono text-xs text-muted-foreground">
            {trialOn
              ? "7 dias grátis no Pro · Cancele quando quiser · Pagamento seguro"
              : "Comece grátis · Cancele quando quiser · Pagamento seguro"}
          </p>
        </FadeIn>
      </div>
    </section>
  )
}
