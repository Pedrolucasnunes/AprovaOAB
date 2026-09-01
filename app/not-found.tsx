import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { SeoShell } from "@/components/seo/seo-shell"

// 404 raiz. Esta é, na prática, a ÚNICA 404 do produto: existem três
// not-found.tsx de seção (/questoes, /provas, /editais) e nenhuma delas
// renderiza. Medido em produção em 01/set/2026, ANTES deste arquivo existir —
// /provas/99-exame-oab, /editais/nao-existe e uma questão com UUID inventado
// devolviam as três a tela padrão do Next, em inglês e sem saída
// ("This page could not be found"), e não a 404 da própria seção. Elas estão
// mortas desde que foram escritas (ba19a0b, 36c9c92, ff3d764).
//
// Parte disso é `dynamicParams = false` em /provas/[exame], /editais/[slug] e
// /questoes/[materia]: o param fora do generateStaticParams é recusado no
// roteador, antes de o segmento renderizar, então a fronteira de not-found dele
// nunca entra. Mas isso NÃO explica /questoes/[materia]/[slug], que tem
// `dynamicParams = true` e chama notFound() de dentro da página — e mesmo assim
// caía no padrão. Testei dar layout.tsx próprio ao segmento, que é a explicação
// que se costuma dar pra isso, e não mudou nada. O mecanismo exato ficou em
// aberto; o fato está medido.
//
// Consequência: este arquivo atende todos os caminhos acima. Antes de "arrumar"
// as três de seção, confirme com curl que elas realmente aparecem — a suposição
// de que apareciam é o que fez ninguém notar por três deploys.
//
// Reaproveita o SeoShell: header e footer reais, então a navegação inteira é o
// caminho de recuperação. O header já troca sozinho entre "Começar grátis" e
// "Meu dashboard" conforme a sessão (header.tsx:61) — não há "Entrar" órfão.
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
