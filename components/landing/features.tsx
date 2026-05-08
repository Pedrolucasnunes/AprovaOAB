import { PieChart, CalendarDays, BarChart2, FileText, RefreshCw } from "lucide-react"
import { FadeIn } from "@/components/ui/fade-in"

const features = [
  {
    icon: PieChart,
    title: "Diagnóstico adaptativo",
    description: "IA ajusta as questões conforme você acerta ou erra.",
  },
  {
    icon: CalendarDays,
    title: "Cronograma inteligente",
    description: "Plano semanal ajustado ao seu tempo real de estudo.",
  },
  {
    icon: BarChart2,
    title: "Simulados reais",
    description: "Questões no padrão FGV, com gabarito comentado.",
  },
  {
    icon: FileText,
    title: "Resumos gerados por IA",
    description: "Mapas mentais do que você errou — prontos em segundos.",
  },
  {
    icon: RefreshCw,
    title: "Revisão espaçada",
    description: "Você revisa na hora certa. Nada cai no esquecimento.",
  },
]

export function Features() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">

        <div className="grid gap-10 lg:grid-cols-3 lg:items-start">

          {/* Heading — sticky on desktop */}
          <div className="lg:sticky lg:top-24">
            <FadeIn>
              <span className="badge-pill mb-4 inline-flex">Recursos</span>
              <h2
                className="mt-4 text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Tudo que você precisa.{" "}
                <em className="not-italic text-primary">Nada que atrapalhe.</em>
              </h2>
              <p className="mt-4 text-muted-foreground">
                Ferramentas pensadas pra quem tem pouco tempo e muita responsabilidade.
              </p>
            </FadeIn>
          </div>

          {/* Grid de features */}
          <div className="grid gap-5 sm:grid-cols-2 lg:col-span-2">
            {features.map((feature, index) => (
              <FadeIn key={feature.title} delay={index * 80} duration={600}>
                <div className="h-full rounded-2xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold leading-snug text-foreground">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
