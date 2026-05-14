import { FadeIn } from "@/components/ui/fade-in"

const rows = [
  { label: "Treino direcionado pelos seus erros", pro: "✓",       traditional: "✕" },
  { label: "Simulado completo no padrão FGV",     pro: "✓",       traditional: "Parcial" },
  { label: "Banco de questões atualizado",         pro: "Sempre",  traditional: "Anual" },
  { label: "Preço mensal",                         pro: "R$ 19",   traditional: "R$ 200+" },
]

export function Comparison() {
  return (
    <section id="diferenciais" className="bg-muted/20 py-24">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">

        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <span className="badge-pill mb-4 inline-flex">Por que aprovaOAB</span>
            <h2
              className="mt-4 text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl"
              style={{ fontFamily: "'Fraunces', Georgia, serif" }}
            >
              Diferente de cursinho.{" "}
              <em className="not-italic text-primary">Feito pra 2026.</em>
            </h2>
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <div className="mt-12 overflow-x-auto rounded-2xl border border-border bg-card">
            <div className="min-w-[520px]">
              {/* Header */}
              <div className="grid grid-cols-3 border-b border-border">
                <div className="p-5 text-sm font-semibold text-muted-foreground">Recurso</div>
                <div className="border-x border-border p-5 text-center text-sm font-semibold text-primary">
                  aprovaOAB
                </div>
                <div className="p-5 text-center text-sm font-semibold text-muted-foreground">
                  Cursinhos tradicionais
                </div>
              </div>

              {/* Rows */}
              {rows.map((row, i) => (
                <div
                  key={row.label}
                  className={`grid grid-cols-3 ${i < rows.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="p-5 text-sm text-foreground">{row.label}</div>
                  <div className="border-x border-border p-5 text-center text-sm font-semibold text-primary">
                    {row.pro}
                  </div>
                  <div className="p-5 text-center text-sm text-muted-foreground">
                    {row.traditional}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}
