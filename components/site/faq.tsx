"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/site/ui/accordion";
import { Reveal } from "@/components/site/reveal";
import { SectionHeading } from "@/components/site/section-heading";

const ITEMS = [
  {
    question: "Quanto custa?",
    answer:
      "O plano Grátis é R$ 0 pra sempre: diagnóstico completo, plano de estudos básico e 10 questões por dia. Quando quiser treinar sem limite, o Pro está em promoção de lançamento por R$ 19/mês (de R$ 29). Você troca de plano ou cancela a qualquer momento.",
  },
  {
    question: "As questões são no padrão real da prova?",
    answer:
      "Sim. O banco segue o formato da FGV, banca que aplica o Exame de Ordem: enunciado, quatro alternativas e simulados completos de 80 questões — incluindo questões de exames anteriores e inéditas construídas no mesmo padrão.",
  },
  {
    question: "Preciso de cartão de crédito pra começar?",
    answer:
      "Não. O plano Grátis não pede cartão em nenhum momento. Você cria a conta, faz o diagnóstico e já começa a treinar.",
  },
  {
    question: "Já reprovei na 1ª fase. Funciona pra mim?",
    answer:
      "Foi pensando nisso que o AprovaOAB existe. Em vez de revisar o edital inteiro de novo, o diagnóstico encontra exatamente onde você perde pontos e o plano concentra o treino ali. Quem já fez a prova costuma ter lacunas específicas — é isso que o treino ataca primeiro.",
  },
  {
    question: "Como funciona o cancelamento?",
    answer:
      "Direto na plataforma, em poucos cliques, sem multa e sem precisar falar com ninguém. Cancelando o Pro, você mantém o acesso pago até o fim do período e depois volta automaticamente pro plano Grátis.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-20 bg-background py-24 sm:py-28">
      <div className="container-page grid gap-12 lg:grid-cols-12 lg:gap-12">
        <Reveal className="lg:col-span-4">
          <SectionHeading
            eyebrow="05 · FAQ"
            title="Perguntas diretas, respostas diretas."
            lead="O que todo mundo quer saber antes de criar a conta."
          />
        </Reveal>
        <Reveal delay={0.08} className="lg:col-span-8">
          <Accordion type="single" collapsible className="w-full">
            {ITEMS.map((item, i) => (
              <AccordionItem key={item.question} value={`item-${i}`}>
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>
      </div>
    </section>
  );
}
