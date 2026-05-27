import { Header } from "@/components/landing/header"
import { Hero } from "@/components/landing/hero"
import { SocialProof } from "@/components/landing/social-proof"
import { ProblemSolution } from "@/components/landing/problem-solution"
import { HowItWorks } from "@/components/landing/how-it-works"
import { Features } from "@/components/landing/features"
import { Comparison } from "@/components/landing/comparison"
import { MidCTA } from "@/components/landing/mid-cta"
import { Testimonials } from "@/components/landing/testimonials"
import { Pricing } from "@/components/landing/pricing"
import { FAQ } from "@/components/landing/faq"
import { CTA } from "@/components/landing/cta"
import { Footer } from "@/components/landing/footer"
import { WhatsAppFab } from "@/components/landing/whatsapp-fab"
import { isTrialEnabled } from "@/lib/trial"

export default function HomePage() {
  const trialOn = isTrialEnabled()

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Hero />
        <SocialProof />
        <ProblemSolution />
        <HowItWorks />
        <Features />
        <Comparison />
        <MidCTA />
        <Testimonials />
        <Pricing trialOn={trialOn} />
        <FAQ trialOn={trialOn} />
        <CTA />
      </main>
      <Footer />
      <WhatsAppFab />
    </div>
  )
}
