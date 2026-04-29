import { FadeIn } from "@/components/ui/fade-in"

const schools = [
  "Dir. Constitucional", "Dir. Civil", "Dir. Penal", "Processo Civil",
  "Processo Penal", "Dir. Empresarial", "Ética OAB", "Dir. Tributário",
  "Dir. Administrativo", "Dir. do Trabalho",
]

const stats = [
  { value: "Beta",   label: "fase de lançamento" },
  { value: "100%",   label: "questões no padrão FGV" },
  { value: "Grátis", label: "para começar" },
  { value: "10+",    label: "matérias cobertas" },
]

export function SocialProof() {
  return (
    <section className="border-y border-border bg-muted/30 py-10">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">

        <p className="mb-6 text-center font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Matérias cobertas no Exame da OAB
        </p>

        {/* Marquee */}
        <div className="overflow-hidden">
          <div className="marquee-track opacity-70">
            {[...schools, ...schools].map((school, i) => (
              <span
                key={i}
                className="mx-6 shrink-0 font-display text-2xl text-muted-foreground"
              >
                {school}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <FadeIn delay={200}>
          <div className="mt-10 grid grid-cols-2 gap-6 border-t border-border pt-10 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p
                  className="text-4xl font-black text-primary"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  {stat.value}
                </p>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </FadeIn>

      </div>
    </section>
  )
}
