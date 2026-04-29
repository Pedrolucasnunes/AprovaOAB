import { FadeIn } from "@/components/ui/fade-in"

const testimonials = [
  {
    initials: "EA",
    name: "Produto em fase inicial",
    role: "Early Access · Buscando primeiros usuários",
    text: "Estamos nos primeiros passos. Seja um dos primeiros a usar o aprovaOAB e ajude a moldar o produto com seu feedback.",
    highlight: true,
  },
  {
    initials: "FG",
    name: "Baseado em provas reais",
    role: "Padrão FGV · Exame da OAB",
    text: "Todas as questões seguem o padrão da banca FGV — a mesma que elabora o Exame da Ordem. Nada inventado, nada genérico.",
    highlight: false,
  },
  {
    initials: "GP",
    name: "Comece sem compromisso",
    role: "Plano gratuito disponível",
    text: "O plano gratuito dá acesso ao diagnóstico completo e ao plano de estudos personalizado. Sem cartão para começar.",
    highlight: false,
  },
]

export function Testimonials() {
  return (
    <section id="depoimentos" className="bg-muted/20 py-20 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">

        {/* Heading */}
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <span className="badge-pill mb-4 inline-flex">Early Access</span>
            <h2
              className="mt-4 text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Seja dos primeiros.{" "}
              <em className="not-italic text-primary">Seu feedback importa.</em>
            </h2>
          </div>
        </FadeIn>

        {/* Grid */}
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, index) => (
            <FadeIn key={t.name} delay={index * 80} duration={600}>
              <div
                className={`flex h-full flex-col rounded-2xl border p-6 ${
                  t.highlight
                    ? "border-primary bg-primary text-primary-foreground shadow-2xl shadow-primary/20"
                    : "border-border bg-card"
                }`}
              >
                {/* Stars */}
                <div className={`mb-3 flex gap-0.5 text-sm ${t.highlight ? "" : "text-[#b8860b]"}`}>
                  ★★★★★
                </div>

                {/* Quote */}
                <p
                  className={`flex-1 text-sm leading-relaxed ${
                    t.highlight ? "text-primary-foreground/90" : "text-muted-foreground"
                  }`}
                >
                  "{t.text}"
                </p>

                {/* Author */}
                <div className="mt-5 flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-semibold text-sm ${
                      t.highlight
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p
                      className={`text-sm font-semibold ${
                        t.highlight ? "text-primary-foreground" : "text-foreground"
                      }`}
                    >
                      {t.name}
                    </p>
                    <p
                      className={`font-mono text-xs ${
                        t.highlight ? "text-primary-foreground/60" : "text-muted-foreground"
                      }`}
                    >
                      {t.role}
                    </p>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}
