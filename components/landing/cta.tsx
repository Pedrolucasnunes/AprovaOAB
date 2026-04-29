import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"
import { FadeIn } from "@/components/ui/fade-in"

export function CTA() {
  return (
    <section id="cta" className="relative overflow-hidden py-24 lg:py-32">

      {/* Radial green glow — full section background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(16,185,129,0.18), transparent 70%)',
        }}
      />

      <div className="relative mx-auto max-w-4xl px-4 text-center lg:px-8">

        <FadeIn duration={800}>
          <h2
            className="text-5xl font-black leading-[1.05] tracking-tight text-foreground md:text-6xl"
            style={{ fontFamily: "'Fraunces', Georgia, serif" }}
          >
            Sua aprovação{" "}
            <em className="not-italic text-primary">começa agora</em>.
          </h2>
        </FadeIn>

        <FadeIn delay={150} duration={700}>
          <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
            10 minutos de diagnóstico. Gratuito. Você sai sabendo exatamente o que estudar.
          </p>
        </FadeIn>

        <FadeIn delay={300} duration={700}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
              className="w-full py-6 text-base sm:w-fit sm:px-8"
            >
              <Link href="#planos">Ver planos</Link>
            </Button>
          </div>
          <p className="mt-6 font-mono text-xs text-muted-foreground">
            Sem cartão · Plano gratuito disponível · Cancele quando quiser
          </p>
        </FadeIn>

      </div>
    </section>
  )
}
