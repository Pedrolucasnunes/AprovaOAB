import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { NewsletterEdicao } from "@/lib/newsletter";

/**
 * Remove só as tags `<a>`, preservando o texto que estava dentro delas.
 *
 * O corpo das edições traz HTML (`<strong>`, `<em>`, `<a>`) e é conteúdo nosso,
 * versionado no git — daí o `dangerouslySetInnerHTML` ser aceitável aqui. O que
 * NÃO é aceitável é o link continuar clicável: seriam quatro destinos
 * competindo com o CTA da própria seção, um deles pro `/dashboard`.
 */
function semLinks(html: string): string {
  return html.replace(/<a\b[^>]*>/gi, "").replace(/<\/a>/gi, "");
}

/**
 * Minutos de leitura, contados do texto real da edição a 200 palavras/min.
 *
 * Derivado, e não escrito à mão, pelo motivo de sempre: "4 min" digitado uma
 * vez vira mentira na primeira edição mais longa, e ninguém percebe.
 */
export function minutosDeLeitura(ed: NewsletterEdicao): number {
  const pedacos = [
    ...ed.intro,
    ed.termometro ?? "",
    ed.questao.enunciado,
    ...ed.questao.alternativas.map((a) => a.texto),
    ed.questao.comentario,
    ed.pegadinha,
    ed.noticia?.texto ?? "",
    ed.curiosidade?.texto ?? "",
    ed.dica,
  ];
  const palavras = pedacos
    .join(" ")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
  return Math.max(1, Math.round(palavras / 200));
}

/**
 * O e-mail como ele chega na caixa de entrada — cabeçalho de cliente de
 * e-mail, o banner de verdade, e o começo do corpo cortado por um esmaecido.
 *
 * Server Component: `lib/newsletter.ts` tem ~890 linhas com as 14 edições e o
 * construtor de HTML do e-mail, e nada disso pode ir pro navegador de quem abre
 * a landing. Só o que é renderizado atravessa.
 */
export function NewsletterPreview({ ed }: { ed: NewsletterEdicao }) {
  const minutos = minutosDeLeitura(ed);

  return (
    /* O CARTÃO INTEIRO É O LINK, e é isso que torna o hover honesto.

       Ele já parecia clicável — cabeçalho de remetente, assunto, capa — e não
       era: o cursor sobre o banner era `auto` (medido). Pôr só um brilho no
       hover de uma imagem inerte seria prometer um clique que não existe. Aqui
       o `after:absolute after:inset-0` do link do rodapé estica a área de
       clique sobre o cartão todo — um único `<a>`, sem link aninhado, que é
       inválido em HTML e uma armadilha pra leitor de tela.

       O hover cresce o CARTÃO INTEIRO. `scale` não reflui layout, então os
       vizinhos do grid não se mexem — e `motion-reduce:hover:scale-100` precisa
       do `hover:` junto: sem ele perde por especificidade pro `hover:scale`
       (duas classes contra uma) e a preferência do usuário é ignorada. */
    <div className="group relative overflow-hidden rounded-2xl border border-night-border bg-night-card shadow-[0_40px_90px_-40px_rgba(2,6,23,0.9)] transition-[scale] duration-300 ease-out hover:scale-[1.02] motion-reduce:hover:scale-100 motion-reduce:transition-none">
      {/* Cabeçalho: remetente e assunto. O número da edição saiu daqui: ele já
          aparece no rodapé com contexto ("Edição #14 · 8 min"), e o mesmo dado
          duas vezes no mesmo cartão é ruído — além de roubar largura do
          assunto, que é a única coisa que o leitor precisa ler. */}
      <div className="flex items-start gap-3 px-5 py-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-night-border bg-white/5">
          <Image
            src="/Sem fundo.png"
            alt=""
            width={20}
            height={20}
            className="h-5 w-5 object-contain"
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug text-night-foreground">
            {ed.subject}
          </p>
          <p className="mt-1 truncate font-mono text-[10px] text-night-muted">
            AprovaOAB · oi@aprovaoab.app.br
          </p>
        </div>
      </div>

      {/* O banner de verdade, na variante leve: o PNG que vai no e-mail tem
          1800×600 e 404 KB (cliente de e-mail não lê WebP com segurança). Esta
          é a mesma arte em WebP de 1120px e 21 KB, só pra web. */}
      <Image
        src="/cafe-com-oab-banner.webp"
        alt="Café com OAB — sua dose semanal rumo à aprovação"
        width={1120}
        height={373}
        loading="lazy"
        className="block w-full"
      />

      {/* Corpo do e-mail — claro, porque e-mail é claro. Os tokens do
          `.force-light` da landing já entregam branco/#111827 aqui.

          `max-h` + `overflow-hidden` são o que fazem o esmaecido significar
          alguma coisa: o corte precisa cair NO MEIO do conteúdo. Sem a altura
          travada o texto termina antes, e o gradiente vira um retângulo branco
          sobre nada — que foi exatamente o que apareceu na primeira captura. */}
      <div className="relative max-h-[26rem] overflow-hidden bg-background sm:max-h-[32rem]">
        <div className="px-6 py-6">
          {/* "Bom dia" fixo, e não `saudacaoBRT()`: isto é a maquete de um
              e-mail que sai de manhã. A saudação pela hora do servidor diria
              "Boa noite" às 20h, sobre uma mensagem que ninguém recebe à noite.
              E o nome é o mesmo padrão que o template manda pra quem não tem
              primeiro nome cadastrado. */}
          <p className="text-[17px] font-bold text-secondary">
            Bom dia, futuro(a) advogado(a)! ☕
          </p>

          <p
            className="mt-4 text-[13.5px] leading-relaxed text-foreground [&_strong]:font-semibold"
            dangerouslySetInnerHTML={{ __html: semLinks(ed.intro[0]) }}
          />

          {ed.noticia ? (
            <p className="mt-5 rounded-md bg-night px-4 py-2.5 font-mono text-[11px] font-semibold uppercase leading-snug tracking-[0.08em] text-white">
              {ed.noticia.titulo}
            </p>
          ) : null}

          <div className="mt-4 rounded-lg border border-border bg-card p-4">
            <p className="font-mono text-[10.5px] leading-relaxed text-emerald-700">
              {ed.questao.fonte}
            </p>
            <p className="mt-2.5 line-clamp-3 text-[12.5px] leading-relaxed text-foreground">
              {ed.questao.enunciado}
            </p>

            <ul className="mt-3.5 space-y-2">
              {ed.questao.alternativas.map((alt) => {
                const certa = alt.letra === ed.questao.gabarito;
                return (
                  <li
                    key={alt.letra}
                    className={
                      certa
                        ? "flex items-center gap-2.5 rounded-md border border-primary/50 bg-primary/10 px-2.5 py-2"
                        : "flex items-center gap-2.5 rounded-md border border-border bg-background px-2.5 py-2"
                    }
                  >
                    <span
                      className={
                        certa
                          ? "flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground"
                          : "flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-foreground"
                      }
                    >
                      {alt.letra}
                    </span>
                    {/* `min-w-0` obrigatório: `truncate` põe `white-space:
                        nowrap`, e sem isso o item de flex mede o texto inteiro
                        e empurra o cartão pra fora da coluna. */}
                    <span
                      className={
                        certa
                          ? "min-w-0 flex-1 truncate text-[12px] text-foreground"
                          : "min-w-0 flex-1 truncate text-[12px] text-muted-foreground"
                      }
                    >
                      {alt.texto}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

        </div>

        {/* O corte: diz "tem mais" sem precisar escrever isso */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background via-background/80 to-transparent"
        />
      </div>

      {/* Rodapé */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <p className="font-mono text-[11px] text-night-muted">
          Edição #{ed.numero} · {minutos} min de leitura
        </p>
        {/* O destino é o cadastro, e não um arquivo público da newsletter:
            `/newsletter/[numero]` não existe. Enquanto não existir, mandar o
            leitor pra uma rota inventada seria pior que não ter o link. */}
        <Link
          href="/cadastro"
          className="inline-flex min-h-6 items-center gap-1.5 py-1 text-[13px] font-semibold text-primary transition-colors duration-200 after:absolute after:inset-0 after:content-[''] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Ler a edição inteira
          <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
