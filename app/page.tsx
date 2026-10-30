import type { Metadata } from "next"

import { OG_BASE } from "@/lib/seo/og"
import { Header } from "@/components/site/header"
import { Hero } from "@/components/site/hero"
import { ProblemSolution } from "@/components/site/problem-solution"
import { HowItWorks } from "@/components/site/how-it-works"
import { PainelTour } from "@/components/site/painel-tour"
import { Benefits } from "@/components/site/benefits"
import { Depoimentos } from "@/components/site/depoimentos"
import { FreeQuestions } from "@/components/site/free-questions"
import { Newsletter } from "@/components/site/newsletter"
import { Pricing } from "@/components/site/pricing"
import { Faq } from "@/components/site/faq"
import { FinalCta } from "@/components/site/final-cta"
import { Footer } from "@/components/site/footer"
import { WhatsAppFab } from "@/components/landing/whatsapp-fab"
import { RolagemSuave } from "@/components/site/rolagem-suave"
import { VoltarAoInicio } from "@/components/site/voltar-ao-inicio"

export const metadata: Metadata = {
  title: "AprovaOAB: estude só o que você precisa pra passar na 1ª fase",
  description:
    "Diagnóstico por matéria, plano de estudos montado pelos seus erros e simulados completos no padrão FGV. Comece grátis, sem cartão de crédito.",
  alternates: { canonical: "/" },
  openGraph: {
    ...OG_BASE,
    title: "AprovaOAB: estude só o que você precisa pra passar na OAB",
    description:
      "Diagnóstico por matéria, plano montado pelos seus erros e simulados no padrão FGV. Comece grátis, sem cartão de crédito.",
    url: "/",
  },
}

// A pílula "Próxima edição: terça · faltam N dias" da seção da newsletter é
// calculada no SERVIDOR, e é por isso que esta rota deixou de ser 100% estática:
// sem `revalidate` o número seria assado no build e congelaria no dia do deploy.
// Uma hora é folga de sobra pra uma contagem em dias, e o prerender continua
// (`x-nextjs-prerender: 1`) — é o mesmo padrão de `/questoes` (86400).
// `force-dynamic` está fora de questão aqui: a landing é a porta do SEO.
export const revalidate = 3600

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
        {/* Seção fixada: o scroll conduz a câmera sobre a maquete do painel.
            Toda a mecânica é CSS — ver painel-tour.tsx e globals.css. */}
        <PainelTour />
        <Benefits />
        {/* Não renderiza nada enquanto lib/depoimentos.ts tiver menos que
            MIN_DEPOIMENTOS — colar os depoimentos lá faz a seção aparecer
            sozinha, sem tocar neste arquivo. */}
        <Depoimentos />
        <FreeQuestions />
        <Newsletter />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      {/* A página acaba aqui: o que estiver sob os dois botões fixos não dá pra
          rolar pra fora. Sem esta folga eles cobriam 16px da última linha do
          rodapé (no celular, o "sem vínculo com a OAB ou com a FGV") em toda
          largura até 1280px. Fica aqui, e não no Footer, porque o Footer é
          compartilhado com as páginas de SEO, que não têm esses botões. */}
      <div aria-hidden className="h-8 bg-night" />
      <WhatsAppFab />
      <VoltarAoInicio />
      {/* Inércia só na landing; o app logado segue com rolagem nativa. */}
      <RolagemSuave />
    </div>
  )
}
