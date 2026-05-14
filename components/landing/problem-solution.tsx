import { FadeIn } from "@/components/ui/fade-in"

export function ProblemSolution() {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-2 lg:items-center">

          {/* ── O Problema ── */}
          <FadeIn>
            <div>
              <span className="badge-pill">O problema</span>
              <h2
                className="mt-4 text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Você já sabe o que{" "}
                <em className="not-italic text-destructive">não</em>{" "}
                está funcionando.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
                Cursinhos genéricos, apostilas intermináveis, videoaulas de 2h que ninguém
                assiste até o fim. Você estuda muito — mas nos simulados, os mesmos erros se repetem.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  <>Não sabe <strong className="text-foreground">por onde começar</strong> nem o que priorizar</>,
                  <>Revisa o que já domina e <strong className="text-foreground">evita o que mais cai</strong></>,
                  <>Cansa antes da prova — e chega <strong className="text-foreground">sem confiança</strong></>,
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-muted-foreground">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </FadeIn>

          {/* ── A Solução — card com destaque ── */}
          <FadeIn delay={150}>
            <div
              className="relative overflow-hidden rounded-2xl border border-primary/25 bg-card p-8"
              style={{
                boxShadow: '0 10px 40px -12px rgba(0,0,0,0.4), 0 0 0 1px rgba(16,185,129,0.08)',
              }}
            >
              {/* Glow verde interno */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(16,185,129,0.07), transparent 70%)',
                }}
              />

              <div className="relative">
                <span className="badge-pill">A solução</span>
                <h3
                  className="mt-4 text-3xl font-black leading-tight tracking-tight text-foreground"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  Cronograma feito{" "}
                  <em className="not-italic text-primary">pelos seus erros</em>.
                </h3>
                <p className="mt-4 leading-relaxed text-muted-foreground">
                  Fazemos um diagnóstico rápido, identificamos exatamente seus pontos
                  fracos e montamos um cronograma que cobre{" "}
                  <strong className="text-foreground">só o que importa</strong> — com simulados
                  completos no padrão FGV e treino focado no que você mais erra.
                </p>
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {[
                    { value: "10min", label: "diagnóstico" },
                    { value: "30s",   label: "plano gerado" },
                    { value: "70%",   label: "foco no que erra" },
                  ].map((stat) => (
                    <div key={stat.label} className="rounded-xl bg-muted p-4 text-center">
                      <p
                        className="text-2xl font-black text-primary"
                        style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                      >
                        {stat.value}
                      </p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>

        </div>
      </div>
    </section>
  )
}
