import { Benefits } from "@/components/site/benefits";
import { Faq } from "@/components/site/faq";
import { FinalCta } from "@/components/site/final-cta";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { Hero } from "@/components/site/hero";
import { HowItWorks } from "@/components/site/how-it-works";
import { Pricing } from "@/components/site/pricing";
import { ProblemSolution } from "@/components/site/problem-solution";

export default function Home() {
  return (
    <div id="top">
      <Header />
      <main>
        <Hero />
        <ProblemSolution />
        <HowItWorks />
        <Benefits />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}
