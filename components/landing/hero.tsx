"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { FadeIn } from "@/components/ui/fade-in"
import { useEffect, useRef } from "react"

const bars = [
  { name: "Direito Constitucional", pct: 82, color: "bg-primary" },
  { name: "Direito Civil",          pct: 71, color: "bg-primary" },
  { name: "Direito Penal",          pct: 58, color: "bg-[#b8860b]" },
  { name: "Processo Civil",         pct: 44, color: "bg-[#b8860b]" },
  { name: "Ética OAB",              pct: 29, color: "bg-destructive" },
]

export function Hero() {
  const barsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = barsRef.current
    if (!el) return
    const fills = el.querySelectorAll<HTMLElement>("[data-fill]")
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          fills.forEach((f) => {
            f.style.width = f.dataset.fill + "%"
          })
          io.disconnect()
        }
      })
    }, { threshold: 0.3 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32">
      {/* Glow verde radial — atrás de tudo */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-0"
        style={{
          height: '600px',
          background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(16,185,129,0.22), transparent 70%)',
        }}
      />

      {/* Grid quadriculado — sobre o glow */}
      <div className="grid-bg absolute inset-0 z-0 opacity-70" />

      {/* Conteúdo fica acima com z-10 */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-2">

          {/* ── Conteúdo ── */}
          <div>
            <FadeIn delay={0} duration={700}>
              <div className="badge-pill mb-6 gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[#065F46]" />
                Questões no padrão FGV · Plano feito pelos seus erros
              </div>
            </FadeIn>

            <FadeIn delay={100} duration={700}>
              <h1
                className="text-4xl font-black leading-[1.06] tracking-tight text-foreground sm:text-5xl lg:text-[3.4rem]"
                style={{ fontFamily: "'Fraunces', Georgia, serif" }}
              >
                Aprove na{" "}
                <em className="not-italic text-primary">1ª fase da OAB</em>
                {" "}estudando só o que você precisa.
              </h1>
            </FadeIn>

            <FadeIn delay={200} duration={700}>
              <p className="mt-6 max-w-[480px] text-lg leading-relaxed text-muted-foreground">
                Diagnóstico em 10 minutos, plano de estudos personalizado e simulados
                no padrão FGV. Descubra{" "}
                <strong className="text-foreground">onde estão suas lacunas</strong> e saiba{" "}
                <strong className="text-foreground">exatamente o que priorizar</strong> para passar.
              </p>
            </FadeIn>

            <FadeIn delay={300} duration={700}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  asChild
                  className="w-full gap-2 py-6 text-base font-semibold sm:w-fit sm:px-8"
                >
                  <Link href="/cadastro">
                    Começar diagnóstico gratuito
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="w-full py-6 text-base font-medium sm:w-fit sm:px-8"
                >
                  <Link href="#como-funciona">Ver como funciona</Link>
                </Button>
              </div>
              <p className="mt-3 font-mono text-xs tracking-wide text-muted-foreground">
                ✓ Sem cartão &nbsp;·&nbsp; ✓ Plano gratuito disponível &nbsp;·&nbsp; ✓ Cancele quando quiser
              </p>
            </FadeIn>
          </div>

          {/* ── Mockup diagnóstico ── */}
          <FadeIn delay={250} duration={800}>
            <div className="hidden lg:block">
              <div
                ref={barsRef}
                className="animate-card-float rounded-2xl border border-border bg-card p-7"
              >
                {/* Card header */}
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                      Diagnóstico · 10 min
                    </p>
                    <h3
                      className="mt-1 text-xl font-bold text-foreground"
                      style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                    >
                      Seu diagnóstico OAB
                    </h3>
                  </div>
                  <span className="rounded-full border border-[#b8860b]/30 bg-[#fff4cc]/60 px-3 py-1 font-mono text-[11px] font-semibold text-[#b8860b] dark:border-[#b8860b]/20 dark:bg-[#b8860b]/10">
                    Atualizado agora
                  </span>
                </div>

                {/* Big score */}
                <div className="mb-6 flex items-end gap-3">
                  <span
                    className="text-7xl font-black leading-none text-primary"
                    style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                  >
                    65%
                  </span>
                  <div className="pb-2">
                    <p className="text-sm text-muted-foreground">de aproveitamento</p>
                    <p className="font-mono text-xs text-muted-foreground">+12% vs. semana passada</p>
                  </div>
                </div>

                {/* Disciplinas */}
                <div className="flex flex-col gap-3">
                  {bars.map((b) => (
                    <div key={b.name}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="text-foreground">{b.name}</span>
                        <span className="font-mono text-muted-foreground">{b.pct}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted/50">
                        <div
                          className={`h-full rounded-full ${b.color} transition-all duration-[1400ms] ease-out`}
                          style={{ width: "0%" }}
                          data-fill={b.pct}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Card footer */}
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Plano de estudos pronto em 30s
                  </div>
                  <Button size="sm" asChild className="text-xs font-semibold">
                    <Link href="/cadastro">Ver plano →</Link>
                  </Button>
                </div>
              </div>

              {/* Floating stat card */}
              <div className="animate-card-float-slow absolute -bottom-6 -left-6 hidden rounded-xl border border-border bg-card p-4 shadow-lg md:block">
                <p className="font-mono text-xs text-muted-foreground">Produto em</p>
                <p
                  className="text-3xl font-black text-primary"
                  style={{ fontFamily: "'Fraunces', Georgia, serif" }}
                >
                  Beta
                </p>
                <p className="font-mono text-xs text-muted-foreground">fase inicial de lançamento</p>
              </div>
            </div>
          </FadeIn>
        </div>

      </div>
    </section>
  )
}
