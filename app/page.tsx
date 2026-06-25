import type { Metadata } from "next"

import { OG_BASE } from "@/lib/seo/og"
import { Header } from "@/components/site/header"
import { Hero } from "@/components/site/hero"
import { ProblemSolution } from "@/components/site/problem-solution"
import { HowItWorks } from "@/components/site/how-it-works"
import { Benefits } from "@/components/site/benefits"
import { FreeQuestions } from "@/components/site/free-questions"
import { Newsletter } from "@/components/site/newsletter"
import { Pricing } from "@/components/site/pricing"
import { Faq } from "@/components/site/faq"
import { FinalCta } from "@/components/site/final-cta"
import { Footer } from "@/components/site/footer"
import { WhatsAppFab } from "@/components/landing/whatsapp-fab"

export const metadata: Metadata = {
  title: "AprovaOAB — Estude só o que você precisa pra passar na 1ª fase",
  description:
    "Diagnóstico por matéria, plano de estudos montado pelos seus erros e simulados completos no padrão FGV. Comece grátis, sem cartão de crédito.",
  alternates: { canonical: "/" },
  openGraph: {
    ...OG_BASE,
    title: "AprovaOAB — Estude só o que você precisa pra passar na OAB",
    description:
      "Diagnóstico por matéria, plano montado pelos seus erros e simulados no padrão FGV. Comece grátis, sem cartão de crédito.",
    url: "/",
  },
}

// Landing com mix claro/escuro fixo (igual ao preview): cada seção define o
// próprio fundo (claras em bg-background/bg-card, escuras em bg-night). O wrapper
// `force-light` pina os tokens claros pra landing não herdar o `.dark` do tema do
// sistema — o app logado segue com o seletor de tema normalmente.
export default function HomePage() {
  return (
    <div id="top" className="force-light bg-background">
      <Header />
      <main>
        <Hero />
        <ProblemSolution />
        <HowItWorks />
        <Benefits />
        <FreeQuestions />
        <Newsletter />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <WhatsAppFab />
    </div>
  )
}
