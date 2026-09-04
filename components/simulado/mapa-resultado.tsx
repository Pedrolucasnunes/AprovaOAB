"use client"

import { META_APROVACAO } from "@/lib/metrics"
import {
  contarEstados,
  estadoDoItem,
  type CurvaProva,
  type EstadoItem,
  type ItemGabarito,
} from "@/lib/simulado-resultado"
import { cn } from "@/lib/utils"

interface MapaResultadoProps {
  gabarito: ItemGabarito[]
  /** Calculada uma vez pela página e reaproveitada pelo hero. */
  curva: CurvaProva | null
}

const CORES: Record<EstadoItem, string> = {
  acerto: "bg-primary",
  erro: "bg-destructive/70",
  branco: "border border-border bg-muted",
}

const ROTULOS: Record<EstadoItem, string> = {
  acerto: "acerto",
  erro: "erro",
  branco: "em branco",
}

/**
 * O cartão-resposta: a prova inteira na ordem em que ela aconteceu.
 *
 * É o objeto característico deste domínio — quem presta OAB reconhece a folha
 * de 80 antes de ler qualquer rótulo —, e por isso ele é o maior elemento da
 * tela em vez de uma tira espremida embaixo de um medidor. Ele responde uma
 * pergunta que nenhum número responde: ONDE as coisas aconteceram.
 *
 * PRESENTACIONAL de propósito, como a `BarraProgresso` do modo prova: 80 alvos
 * numa faixa dão ~14px no celular, muito abaixo dos 24px da WCAG 2.5.8. Quem
 * quer chegar numa questão usa os filtros do gabarito, onde os alvos são linhas.
 */
export function MapaResultado({ gabarito, curva }: MapaResultadoProps) {
  const contagem = contarEstados(gabarito)
  const ordenados = [...gabarito].sort((a, b) => a.ordem - b.ordem)

  const acimaDaLinha =
    contagem.total > 0 && (contagem.acertos / contagem.total) * 100 >= META_APROVACAO

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="text-lg font-semibold text-foreground">Cartão-resposta</h2>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
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
        aria-label={`Cartão-resposta na ordem em que as questões apareceram: ${contagem.acertos} acertos, ${contagem.erros} erros e ${contagem.brancos} em branco, de ${contagem.total} questões.`}
        className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1.5 sm:grid-cols-[repeat(40,minmax(0,1fr))]"
      >
        {ordenados.map((item) => {
          const estado = estadoDoItem(item)
          return (
            <span
              key={item.questionId}
              title={`Questão ${item.ordem + 1} — ${ROTULOS[estado]}`}
              className={cn("aspect-square rounded-[3px]", CORES[estado])}
            />
          )
        })}
      </div>

      {curva && (
        <p className="max-w-prose border-l-2 border-chart-3 pl-4 text-sm leading-relaxed text-muted-foreground">
          {curva.leitura === "ritmo" && (
            <>
              Você deixou {curva.tercos[2].brancos} das {curva.tercos[2].total} últimas
              em branco, contra {curva.tercos[0].brancos} no começo. O tempo acabou
              antes do conteúdo — o que treinar aqui é ritmo, não matéria.
            </>
          )}
          {curva.leitura === "queda" && (
            <>
              Seu acerto caiu de {curva.tercos[0].taxa}% no primeiro terço para{" "}
              {curva.tercos[2].taxa}% no último. A queda é no fim da prova, não no
              conteúdo: vale treinar com o relógio ligado.
            </>
          )}
          {curva.leitura === "estavel" && (
            <>
              Seu desempenho se manteve estável do início ao fim ({curva.tercos[0].taxa}%
              no primeiro terço, {curva.tercos[2].taxa}% no último)
              {acimaDaLinha ? "." : " — o problema é conteúdo, não resistência."}
            </>
          )}
        </p>
      )}
    </section>
  )
}
