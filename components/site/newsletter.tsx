import { ArrowRight, CalendarDays, Clock, Coffee, FileText, Lightbulb } from "lucide-react";

import { NewsletterPreview } from "@/components/site/newsletter-preview";
import { Eyebrow } from "@/components/site/section-heading";
import { ymdBrasil } from "@/lib/datas";
import { CURRENT_EDICAO } from "@/lib/newsletter";

const PILARES = [
  {
    icon: FileText,
    titulo: "Uma questão comentada",
    resto: "de prova real, com a pegadinha da banca explicada",
  },
  {
    icon: CalendarDays,
    titulo: "O que mudou na OAB",
    resto: "em prazos, gabarito, edital e calendário do próximo exame",
  },
  {
    icon: Lightbulb,
    titulo: "Uma curiosidade",
    resto: "pra você ler com o café na mão",
  },
];

/**
 * Quantos dias faltam até a próxima terça, no fuso de Brasília. Pura, sem I/O.
 *
 * **Em dias, e não em "faltam 4d 11h", de propósito.** Duas razões: o envio é
 * MANUAL (o cron de segunda, `0 12 * * 1`, só monta o rascunho no Resend e
 * avisa por e-mail), então cravar a hora seria prometer um horário que o
 * sistema não cumpre; e esta rota é ISR de 1h, então um contador em horas
 * estaria errado em até 60 minutos na tela.
 *
 * A âncora ao meio-dia UTC é o mesmo truque de `diasEntreYmd` em
 * `lib/editais.ts`: comparar meia-noite de dias civis dá 23h ou 25h em fuso com
 * transição, e o arredondamento erra um dia inteiro.
 */
function diasAteTerca(hoje = new Date()): number {
  const diaDaSemana = new Date(`${ymdBrasil(hoje)}T12:00:00Z`).getUTCDay();
  return (2 - diaDaSemana + 7) % 7; // 2 = terça
}

function fraseDaProximaEdicao(dias: number): string {
  if (dias === 0) return "Próxima edição: hoje de manhã";
  if (dias === 1) return "Próxima edição: amanhã de manhã";
  return `Próxima edição: terça · faltam ${dias} dias`;
}

/**
 * SERVER COMPONENT DE PROPÓSITO. `lib/newsletter.ts` tem ~890 linhas com as 14
 * edições inteiras e o construtor de HTML do e-mail; nada disso pode ir pro
 * navegador de quem abre a landing. Aqui o arquivo é lido no servidor e só o
 * que aparece na tela atravessa.
 *
 * `CURRENT_EDICAO` é o mesmo ponteiro que o cron de segunda usa pra montar o
 * rascunho no Resend — quem publicar a #15 move uma linha só e a landing
 * acompanha sozinha, sem ninguém lembrar dela.
 */
export function Newsletter() {
  const ed = CURRENT_EDICAO;
  const dias = diasAteTerca();

  return (
    <section id="newsletter" className="relative overflow-hidden bg-night py-24 sm:py-28">
      <div
        aria-hidden
        className="bg-grid-dark absolute inset-0 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,black_25%,transparent_80%)]"
      />
      <div
        aria-hidden
        className="absolute -right-24 top-1/2 h-80 w-80 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
      />

      <div className="container-page relative">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-14">
          {/* Coluna editorial */}
          <div className="min-w-0">
            <Eyebrow>
              <Coffee className="size-3.5" aria-hidden />
              Newsletter
            </Eyebrow>

            <h2 className="mt-6 font-display text-3xl leading-[1.1] tracking-tight text-night-foreground text-balance sm:text-4xl lg:text-[2.75rem]">
              <em className="italic text-primary">Café com OAB</em>: sua dose
              semanal de preparação.
            </h2>

            <p className="mt-5 max-w-md text-base leading-relaxed text-night-muted">
              Toda terça de manhã, um e-mail curto pra manter o ritmo entre uma
              sessão de estudo e outra. Uma questão comentada, o que mudou na
              OAB e uma curiosidade. Tudo direto, sem enrolação e de graça.
            </p>

            <p className="mt-7 inline-flex items-center gap-2 rounded-full border border-night-border bg-night-card px-3.5 py-2 font-mono text-xs text-night-muted">
              <Clock className="size-3.5 shrink-0 text-primary" aria-hidden />
              {fraseDaProximaEdicao(dias)}
            </p>

            {/* `<form method="get">` nativo, sem JavaScript nenhum: o navegador
                monta `/cadastro?email=...` sozinho e a seção inteira continua
                Server Component.

                E vai pro CADASTRO, não pra uma rota de inscrição, porque ela
                não existe — e não existe por decisão registrada no CLAUDE.md:
                sem `user_id` não há token de descadastro assinado, e o envio
                pula quem não tem conta. Um campo que fingisse inscrever
                colheria e-mails que nunca receberiam nada. */}
            <form
              action="/cadastro"
              method="get"
              className="mt-6 flex flex-col gap-3 sm:flex-row"
            >
              <label htmlFor="newsletter-email" className="sr-only">
                Seu e-mail
              </label>
              {/* FOCO POR `outline`, NÃO POR `ring`. Medido: com
                  `ring-2 ring-offset-2` nem outline nem box-shadow apareciam —
                  `ring-offset-*` é API do Tailwind v3, e este projeto é v4.
                  Teclado sem anel visível é falha de acessibilidade, não
                  detalhe estético. `outline` ainda acompanha o `rounded-xl` e
                  não é cortado por `overflow-hidden`, ao contrário do ring.

                  As duas linhas de `autofill:` existem porque o Chrome pinta o
                  campo autopreenchido de azul-claro com `!important`: sem elas,
                  o campo escuro vira uma faixa clara com texto ilegível assim
                  que o navegador preenche o e-mail. */}
              <input
                id="newsletter-email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="min-w-0 flex-1 rounded-xl border border-night-border bg-night-card px-4 py-3 text-[15px] text-night-foreground placeholder:text-night-muted/70 autofill:shadow-[inset_0_0_0_1000px_var(--color-night-card)] autofill:[-webkit-text-fill-color:var(--color-night-foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              />
              <button
                type="submit"
                className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-[15px] font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-deep hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Quero receber
                <ArrowRight className="size-4" aria-hidden />
              </button>
            </form>

            <p className="mt-3.5 font-mono text-xs text-night-muted">
              Grátis pra sempre · sem cartão de crédito · cancele quando quiser
            </p>

            <ul className="mt-9 divide-y divide-night-border border-t border-night-border">
              {PILARES.map(({ icon: Icon, titulo, resto }) => (
                <li key={titulo} className="flex items-start gap-3.5 py-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-night-border bg-white/5">
                    <Icon className="size-4 text-primary" aria-hidden />
                  </span>
                  <p className="text-[15px] leading-relaxed text-night-muted">
                    <strong className="font-semibold text-night-foreground">
                      {titulo}
                    </strong>{" "}
                    {resto}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          {/* O e-mail */}
          <div className="min-w-0">
            <NewsletterPreview ed={ed} />
          </div>
        </div>
      </div>
    </section>
  );
}
