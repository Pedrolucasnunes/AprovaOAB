import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SeoShell } from "@/components/seo/seo-shell"

// 404 raiz: atende todo caminho que nao casa com rota nenhuma, e os notFound()
// dos segmentos que nao tem fronteira propria. Antes deste arquivo, esses casos
// caiam na tela padrao do Next -- em ingles, sem header, sem footer, sem saida.
//
// QUAL 404 APARECE EM CADA ROTA (medido em 01/set/2026 com navegador de verdade,
// lendo o h1 apos hidratacao; ver o porque do metodo logo abaixo):
//
//   /questoes/[materia]/[slug]  UUID inexistente  -> app/questoes/not-found.tsx
//   /questoes/[materia]         materia inexistente -> ESTA
//   /provas/[exame]             exame inexistente   -> ESTA
//   /editais/[slug]             slug inexistente    -> ESTA
//   qualquer outro caminho                          -> ESTA
//
// A diferenca e `dynamicParams`. Onde ele e `false` (/provas/[exame],
// /editais/[slug], /questoes/[materia]) o param fora do generateStaticParams e
// recusado NO ROTEADOR, antes de o segmento renderizar, entao a fronteira de
// not-found dele nunca entra e sobra pra esta pagina. Onde e `true`
// (/questoes/[materia]/[slug]) a pagina renderiza, o notFound() da linha 104
// dispara de dentro do segmento, e a 404 de /questoes aparece -- que e o
// comportamento desejado ali, porque ela oferece volta pro indice da materia.
//
// NAO CONFIRA ISSO COM curl. O Next manda no payload RSC as DUAS paginas de
// not-found candidatas, dentro de <script>, e so o cliente decide qual monta.
// Grep no corpo da resposta acha as duas e responde o que voce quiser ouvir:
// foi exatamente assim que uma versao anterior deste comentario afirmou que as
// tres 404 de secao estavam mortas, o que e falso. Use navegador e leia o h1.
//
// Reaproveita o SeoShell: header e footer reais, entao a navegacao inteira e o
// caminho de recuperacao. O header ja troca sozinho entre "Comecar gratis" e
// "Meu dashboard" conforme a sessao (header.tsx:61) -- nao ha "Entrar" orfao.
export default function NotFound() {
  return (
    <SeoShell>
      <div className="py-12 text-center">
        <p className="font-mono text-sm tracking-widest text-muted-foreground uppercase">
          Erro 404
        </p>

        {/* Mesmo tratamento do h1 do hero (components/site/hero.tsx): Fraunces
            variável SEM classe de peso. O eixo de optical sizing é que dá o
            contraste no tamanho display — fixar bold/black achata o desenho. */}
        <h1 className="mt-4 font-display text-[2.625rem] leading-[1.04] tracking-tight text-balance text-night-foreground sm:text-6xl">
          Esse link <em className="italic text-primary">não está no edital</em>.
        </h1>

        <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
          A página que você procurou não existe ou mudou de endereço. Seu plano de
          estudos continua de pé — é só voltar pro treino.
        </p>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Voltar pro início
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5">
          <Link
            href="/questoes"
            className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-night-foreground"
          >
            Ver questões grátis
          </Link>
        </div>
      </div>
    </SeoShell>
  )
}
