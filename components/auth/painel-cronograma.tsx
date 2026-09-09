import { ArrowLeft } from "lucide-react"
import Link from "next/link"

import { Logo } from "@/components/site/logo"
import {
  formatarDataCivil,
  fraseDaContagem,
  getEditalBySlug,
  nomeDaProva,
  proximaPrimeiraFase,
} from "@/lib/editais"

/**
 * O lado esquerdo das telas de auth: o calendário oficial da próxima 1ª fase.
 *
 * POR QUE ISTO E NÃO UM MOCKUP DE PROGRESSO. A tentação nesta metade da tela é
 * mostrar "continue de onde parou" com uma barra preenchida — mas quem está
 * aqui NÃO está logado, e o app não sabe quem é. Barra de progresso nesta
 * página é progresso de ninguém. A regra é a mesma que `taxaGeralAcerto`
 * (volta `null` abaixo de 10 respostas), `MIN_DEPOIMENTOS` e a própria
 * `proximaPrimeiraFase`: dado que não existe não vira número na tela.
 *
 * O que existe de verdade e serve: a data da prova. É o motivador mais forte
 * deste mercado, é pública, é datada, e já está versionada em `lib/editais.ts`.
 *
 * SERVER COMPONENT de propósito. A contagem tem que sair do relógio do
 * SERVIDOR: calculada no cliente, ela divergiria na hidratação e, pior,
 * passaria a afirmar o calendário oficial da OAB a partir da data que o
 * visitante tem configurada na máquina dele.
 *
 * Só as datas que já são ISO no `Edital` entram aqui (`dataPrimeiraFase`,
 * `dataSegundaFase`). O `cronograma[]` completo NÃO: `EditalEtapa.data` é
 * string de exibição e às vezes intervalo ("28/09 a 05/10/2026"), então não dá
 * pra saber quais etapas já passaram sem guardar a mesma data em duas
 * representações — que derivaria no primeiro exame novo. O cronograma inteiro
 * fica a um clique, em `/editais/[slug]`, que é a página que existe pra isso.
 */
export function PainelCronograma() {
  const prova = proximaPrimeiraFase()
  const edital = prova ? getEditalBySlug(prova.slug) : null

  return (
    <aside className="relative flex flex-col overflow-hidden border-b border-white/10 bg-night px-6 py-7 lg:border-b-0 lg:border-r lg:px-16 lg:py-16 xl:px-20">
      {/* Mesmo tratamento do hero da landing (components/site/hero.tsx): a tela
          de login é a ponte entre a landing e o app, então repete o fundo de lá
          em vez de inventar um terceiro. */}
      <div
        aria-hidden
        className="bg-grid-dark absolute inset-0 [mask-image:radial-gradient(ellipse_75%_65%_at_40%_45%,black_25%,transparent_85%)]"
      />
      <div aria-hidden className="absolute inset-0">
        <div className="absolute -left-32 -top-20 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -right-28 bottom-0 h-80 w-80 rounded-full bg-secondary-bright/10 blur-3xl" />
      </div>

      {/* A COLUNA TEM MEDIDA, e isso e o que segura o painel em tela larga.
          Sem o `max-w`, tudo aqui dentro acompanha a largura do monitor: em
          1920px o titulo assentava numa unica linha de 863px (deixando de ser
          bloco e virando legenda), o "Voltar" desgarrava a 682px da marca —
          encostado na costura, parecendo pertencer ao formulario — e a data da
          etapa se soltava do proprio rotulo por 617px de vazio. Uma medida fixa
          resolve os tres de uma vez, e faz o painel se comportar igual em
          qualquer tela em vez de piorar conforme ela cresce. */}
      <div className="relative flex w-full max-w-[34rem] flex-1 flex-col">
        {/* No desktop a marca e o "Voltar" empilham no canto, os dois na mesma
            guia de 48px do resto do painel. Lado a lado numa coluna de 960px
            eles ficavam a 363px um do outro, e o "Voltar" sobrava no meio do
            nada: a unica guia que ele encostava (a borda direita, 592px) tem o
            vizinho mais proximo 293px abaixo. Alinhamento que nao da pra ver
            nao conta. No celular a faixa e estreita e lado a lado ainda le
            como um grupo, entao a pilha comeca no `lg`. */}
        <div className="flex items-center justify-between gap-4 lg:absolute lg:left-0 lg:top-0 lg:flex-col lg:items-start lg:gap-3.5">
          <Logo />
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md text-sm text-night-muted transition-colors hover:text-night-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Voltar
          </Link>
        </div>

        {/* No desktop este bloco centraliza na COLUNA INTEIRA, não no que sobra
            abaixo da marca — por isso o header sai do fluxo logo acima. Com ele
            no fluxo, o bloco caía 52px abaixo do centro (32px do header, 20px de
            um `pt-10` que eu tinha posto), e o formulário do outro lado, que
            centraliza de verdade, ficava visivelmente mais alto. Meia tela
            comparada com a outra: o olho pega uma diferença dessas na hora. */}
        <div className="mt-7 lg:mt-0 lg:flex lg:flex-1 lg:flex-col lg:justify-center">
        {prova ? (
          <>
            <p className="font-display text-[1.4rem] leading-snug text-night-foreground text-balance sm:text-3xl lg:text-[2.5rem] lg:leading-[1.08]">
              {fraseDaContagem(prova.diasRestantes, nomeDaProva(prova))}
            </p>

            {edital && (
              <div className="hidden lg:block">
                <ol className="relative mt-11 space-y-5 border-l border-white/10 pl-6">
                  <Etapa
                    nome="1ª fase · Prova Objetiva"
                    iso={edital.dataPrimeiraFase}
                    proxima
                  />
                  <Etapa
                    nome="2ª fase · Prático-Profissional"
                    iso={edital.dataSegundaFase}
                  />
                </ol>

                <p className="mt-8 max-w-sm text-sm leading-relaxed text-night-muted">
                  {edital.publicado
                    ? `O edital do ${edital.ordinal} Exame já foi publicado pela FGV.`
                    : `O edital de abertura do ${edital.ordinal} Exame ainda não foi publicado. As datas acima vêm do calendário oficial da OAB.`}
                </p>

                <Link
                  href={`/editais/${edital.slug}`}
                  className="mt-3 inline-block rounded-sm text-sm text-night-foreground underline decoration-primary decoration-2 underline-offset-4 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                >
                  Ver o cronograma completo
                </Link>
              </div>
            )}
          </>
        ) : (
          /* Sem 1ª fase futura em `EDITAIS`, `proximaPrimeiraFase()` devolve
             `null` — e aqui isso vira texto, nunca um número chutado nem uma
             contagem negativa. Acontece no dia seguinte a cada exame, até
             alguém acrescentar a edição nova ao arquivo. */
          <>
            <p className="font-display text-[1.4rem] leading-snug text-night-foreground text-balance sm:text-3xl lg:text-[2.5rem] lg:leading-[1.08]">
              Estude só o que você precisa pra passar na OAB.
            </p>
            <p className="mt-6 hidden max-w-sm text-sm leading-relaxed text-night-muted lg:block">
              Um diagnóstico curto mede seu nível nas matérias mais pesadas da
              prova, e o treino vai pra onde você perde ponto. A data do próximo
              Exame de Ordem ainda não foi divulgada.
            </p>
            </>
          )}
        </div>
      </div>
    </aside>
  )
}

/**
 * Uma linha do cronograma. `proxima` é a que a contagem está contando: ponto
 * cheio contra ponto vazado. O marcador é sequencial porque o conteúdo é
 * mesmo uma cronologia — não é ornamento numerado em cima de uma lista.
 */
function Etapa({
  nome,
  iso,
  proxima = false,
}: {
  nome: string
  iso: string
  proxima?: boolean
}) {
  return (
    <li className="relative flex items-baseline justify-between gap-6">
      <span
        aria-hidden
        className={
          proxima
            ? "absolute -left-[1.79rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-night"
            : "absolute -left-[1.72rem] top-1.5 h-2 w-2 rounded-full border border-night-muted bg-night ring-4 ring-night"
        }
      />
      <span
        className={
          proxima
            ? "text-sm font-medium text-night-foreground"
            : "text-sm text-night-muted"
        }
      >
        {nome}
      </span>
      <time
        dateTime={iso}
        className={
          proxima
            ? "shrink-0 font-mono text-xs text-primary"
            : "shrink-0 font-mono text-xs text-night-muted"
        }
      >
        {formatarDataCivil(iso)}
      </time>
    </li>
  )
}
