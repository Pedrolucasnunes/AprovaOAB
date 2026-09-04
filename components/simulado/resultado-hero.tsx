"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { META_APROVACAO } from "@/lib/metrics"
import {
  compararComAnterior,
  concentracaoDeErros,
  proximoPasso,
  type ContagemResultado,
  type CurvaProva,
  type MateriaResultado,
} from "@/lib/simulado-resultado"
import { cn } from "@/lib/utils"

interface ResultadoHeroProps {
  contagem: ContagemResultado
  /** Já agregado pela página — a mesma lista que alimenta "onde errou mais". */
  materias: MateriaResultado[]
  curva: CurvaProva | null
  numeroQuestoes: number
  notaDeCorte: number
  percentual: number
  anterior: {
    percentual: number
    acertos: number
    numeroQuestoes: number
    respondidas: number
  } | null
}

/**
 * O topo do resultado: quanto foi, quanto falta pro corte, e o que fazer.
 *
 * NÃO é um cartão. As quatro seções desta tela tinham a mesma borda, o mesmo
 * raio e o mesmo fundo, então nada dizia onde começar. O topo agora é a página;
 * o que vem depois é consulta, e consulta mora em cartão.
 *
 * O medidor circular saiu. A OAB é LIMIAR, não proporção — passa com 40 e
 * pronto —, e um anel responde "que fração do total", que é a pergunta errada:
 * com 1% ele ficava 99% vazio, gastando o maior elemento da tela pra não dizer
 * nada. A barra abaixo é a prova inteira em 80 unidades, dividida no que de
 * fato aconteceu com elas, com o corte marcado onde ele cai. Distância se lê em
 * linha.
 */
export function ResultadoHero({
  contagem,
  materias,
  curva,
  numeroQuestoes,
  notaDeCorte,
  percentual,
  anterior,
}: ResultadoHeroProps) {
  const passou = contagem.acertos >= notaDeCorte
  const faltam = notaDeCorte - contagem.acertos
  const sobra = contagem.acertos - notaDeCorte
  const concentracao = concentracaoDeErros(materias)
  const passo = proximoPasso(contagem, materias, curva)

  const comparacao = anterior
    ? compararComAnterior(
        {
          acertos: contagem.acertos,
          percentual,
          numeroQuestoes,
          respondidas: contagem.respondidas,
        },
        anterior,
      )
    : null

  const fatia = (n: number) => `${(n / numeroQuestoes) * 100}%`

  const acao =
    passo.tipo === "materia"
      ? {
          texto: `Treinar ${passo.materia.nome}`,
          detalhe: `${passo.materia.erros} ${passo.materia.erros === 1 ? "erro" : "erros"} nesta prova`,
          href: `/dashboard/treino?materia=${passo.materia.subjectId}&origem=simulado_resultado`,
        }
      : passo.tipo === "ritmo"
        ? {
            texto: "Fazer outro simulado completo",
            // Aponta pro simulado, não pra um "treino cronometrado": as 5 horas
            // e as 80 questões só existem aqui, e prometer uma tela que não
            // existe seria pior que não sugerir nada.
            detalhe: "as 5 horas cronometradas só existem aqui",
            href: "/dashboard/simulados",
          }
        : {
            texto: "Fazer outro simulado completo",
            detalhe: "mantenha o ritmo",
            href: "/dashboard/simulados",
          }

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {passou
            ? sobra === 0
              ? "Você ficou exatamente na nota de corte."
              : `Você passaria, com ${sobra} ${sobra === 1 ? "acerto" : "acertos"} de folga.`
            : `Faltam ${faltam} ${faltam === 1 ? "acerto" : "acertos"} para a nota de corte.`}
        </p>

        <p className="flex items-baseline gap-3">
          <span
            className={cn(
              "font-display text-6xl leading-none font-semibold tabular-nums sm:text-7xl",
              passou ? "text-primary" : "text-foreground",
            )}
          >
            {contagem.acertos}
          </span>
          <span className="text-lg text-muted-foreground">de {numeroQuestoes} acertos</span>
        </p>
      </div>

      {/* ── A prova inteira em uma barra ───────────────────────────
          Substitui o anel E os quatro cartões de número: mostra a composição
          das 80 e onde o corte cai, no mesmo objeto. */}
      <div>
        <div
          role="img"
          aria-label={`${contagem.acertos} acertos, ${contagem.erros} erros e ${contagem.brancos} em branco, de ${numeroQuestoes} questões. A nota de corte é ${notaDeCorte}.`}
          className="relative flex h-3 overflow-hidden rounded-full bg-muted"
        >
          <div style={{ width: fatia(contagem.acertos) }} className="bg-primary" />
          <div style={{ width: fatia(contagem.erros) }} className="bg-destructive/70" />

          {/* O corte é uma referência, não um estado: âmbar, não verde nem
              vermelho. Fica por cima das fatias porque é uma linha na régua. */}
          <span
            aria-hidden
            style={{ left: fatia(notaDeCorte) }}
            className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-chart-3"
          />
        </div>

        <div className="mt-2 flex items-start justify-between gap-4 text-sm">
          <p className="text-muted-foreground">
            <span className="text-primary">
              {contagem.acertos} {contagem.acertos === 1 ? "certa" : "certas"}
            </span>
            {contagem.erros > 0 && (
              <>
                ,{" "}
                <span className="text-destructive">
                  {contagem.erros} {contagem.erros === 1 ? "errada" : "erradas"}
                </span>
              </>
            )}
            {contagem.brancos > 0 && <>, {contagem.brancos} em branco</>}
          </p>
          <p className="shrink-0 text-chart-3">corte: {notaDeCorte}</p>
        </div>
      </div>

      <div className="max-w-prose space-y-2 text-sm leading-relaxed text-muted-foreground">
        {contagem.brancos > 0 && (
          <p>
            As {contagem.brancos} em branco contam como erro na nota, mas não dizem
            nada sobre o que você sabe — por isso elas aparecem separadas aqui.
          </p>
        )}
        {concentracao && (
          <p>
            {concentracao.erros} dos seus {concentracao.totalErros} erros estão em só{" "}
            {concentracao.areas} áreas, então há um caminho curto para ganhar pontos.
          </p>
        )}
        {comparacao && comparacao.delta !== 0 && (
          <p>
            São {comparacao.delta > 0 ? "mais" : "menos"}{" "}
            <span className={comparacao.delta > 0 ? "text-primary" : "text-destructive"}>
              {Math.abs(comparacao.delta)}{" "}
              {comparacao.unidade === "acertos"
                ? Math.abs(comparacao.delta) === 1
                  ? "acerto"
                  : "acertos"
                : "pontos percentuais"}
            </span>{" "}
            que no seu simulado anterior.
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button asChild size="lg">
          <Link href={acao.href}>{acao.texto}</Link>
        </Button>
        <p className="text-sm text-muted-foreground">{acao.detalhe}</p>
      </div>

      <p className="sr-only">
        A nota de corte da OAB é {META_APROVACAO}% das questões.
      </p>
    </section>
  )
}
