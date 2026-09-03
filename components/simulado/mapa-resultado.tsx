"use client"

import { Sparkles } from "lucide-react"
import { META_APROVACAO } from "@/lib/metrics"
import {
  contarEstados,
  curvaDaProva,
  estadoDoItem,
  type EstadoItem,
  type ItemGabarito,
} from "@/lib/simulado-resultado"
import { cn } from "@/lib/utils"

interface MapaResultadoProps {
  gabarito: ItemGabarito[]
}

const CORES: Record<EstadoItem, string> = {
  acerto: "bg-primary",
  erro: "bg-destructive",
  branco: "border border-border bg-muted",
}

const ROTULOS: Record<EstadoItem, string> = {
  acerto: "acerto",
  erro: "erro",
  branco: "em branco",
}

/**
 * A prova inteira na ordem em que apareceu, uma marca por questão.
 *
 * PRESENTACIONAL de propósito, como a `BarraProgresso` do modo prova: 80 alvos
 * numa faixa dão ~14px no celular, muito abaixo dos 24px da WCAG 2.5.8. Quem
 * quer chegar numa questão específica usa os filtros do gabarito logo abaixo,
 * onde os alvos são linhas de verdade — o mapa serve pra enxergar a FORMA do
 * resultado (onde os erros se agrupam, onde os brancos começam), não pra
 * navegar.
 */
export function MapaResultado({ gabarito }: MapaResultadoProps) {
  const contagem = contarEstados(gabarito)
  const curva = curvaDaProva(gabarito)
  const ordenados = [...gabarito].sort((a, b) => a.ordem - b.ordem)

  const acimaDaLinha = contagem.total > 0
    && (contagem.acertos / contagem.total) * 100 >= META_APROVACAO

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-[0.7rem] tracking-widest text-muted-foreground uppercase">
          Mapa da prova · questões 1 a {contagem.total}
        </h2>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          {(["acerto", "erro", "branco"] as const).map((estado) => (
            <span key={estado} className="flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-[2px]", CORES[estado])} />
              {ROTULOS[estado]}
            </span>
          ))}
        </div>
      </div>

      <div
        role="img"
        aria-label={`Mapa da prova na ordem em que as questões apareceram: ${contagem.acertos} acertos, ${contagem.erros} erros e ${contagem.brancos} em branco, de ${contagem.total} questões.`}
        className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1 sm:grid-cols-[repeat(40,minmax(0,1fr))]"
      >
        {ordenados.map((item) => {
          const estado = estadoDoItem(item)
          return (
            <span
              key={item.questionId}
              title={`Questão ${item.ordem + 1} — ${ROTULOS[estado]}`}
              className={cn("h-6 rounded-[2px]", CORES[estado])}
            />
          )
        })}
      </div>

      {curva && (
        <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-chart-3" />
          <span>
            {curva.leitura === "ritmo" && (
              <>
                Você deixou <strong className="text-foreground">{curva.tercos[2].brancos} das{" "}
                {curva.tercos[2].total} últimas</strong> em branco, contra{" "}
                {curva.tercos[0].brancos} no começo. O tempo acabou antes do
                conteúdo — o que treinar aqui é ritmo, não matéria.
              </>
            )}
            {curva.leitura === "queda" && (
              <>
                Seu acerto caiu de{" "}
                <strong className="text-foreground">{curva.tercos[0].taxa}% no primeiro
                terço pra {curva.tercos[2].taxa}% no último</strong>. A queda é no fim
                da prova, não no conteúdo: vale treinar com o relógio ligado.
              </>
            )}
            {curva.leitura === "estavel" && (
              <>
                Seu desempenho se manteve estável do início ao fim da prova (
                {curva.tercos[0].taxa}% → {curva.tercos[2].taxa}%)
                {acimaDaLinha ? "." : " — o problema é conteúdo, não resistência."}
              </>
            )}
          </span>
        </p>
      )}
    </section>
  )
}
