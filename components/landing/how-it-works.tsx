import { FadeIn } from "@/components/ui/fade-in"

const steps = [
  {
    step: "1",
    title: "Diagnóstico rápido",
    description:
      "Você responde 5 questões iniciais. Identificamos seu nível em cada matéria da OAB.",
  },
  {
    step: "2",
    title: "Plano 100% personalizado",
    description:
      "Em 30 segundos você recebe um cronograma semanal com prioridades, revisões espaçadas e metas claras.",
  },
  {
    step: "3",
    title: "Simulados no padrão FGV",
    description:
      "Simulados completos de 80 questões no formato real da prova. Treine no padrão e chegue pronto.",
  },
]

export function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-muted/20 py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">

        {/* ── Heading — CENTERED ── */}
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <span className="badge-pill">Como funciona</span>
            <h2
              className="mt-4 text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Do zero à aprovação em{" "}
              <em className="not-italic text-primary">3 passos</em>.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Sem jargão, sem firula. Você entra, responde e seu plano é montado.
            </p>
          </div>
        </FadeIn>

        {/* ── Cards ── */}
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {steps.map((step, index) => (
            <FadeIn key={step.step} delay={index * 120} duration={700}>
              <div className="h-full rounded-2xl border border-border bg-card p-7 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">

                {/* Step number box */}
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                  <span
                    className="text-xl font-semibold text-primary"
                    style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                  >
                    {step.step}
                  </span>
                </div>

                <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>

      </div>
    </section>
  )
}
