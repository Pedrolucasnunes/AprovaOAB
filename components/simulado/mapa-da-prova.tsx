"use client"

import { useState } from "react"
import { CheckCircle2 } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { estadoDaQuestao, type BlocoMateria, type EstadoQuestao } from "@/lib/simulado-prova"
import { cn } from "@/lib/utils"

type Filtro = "todas" | "branco" | "marcadas"

interface MapaDaProvaProps {
  aberto: boolean
  onOpenChange: (aberto: boolean) => void
  questoes: { id: string; subject_name: string }[]
  blocos: BlocoMateria[]
  respostas: Record<string, string>
  marcadas: Set<string>
  atual: number
  onIr: (indice: number) => void
  onFinalizar: () => void
  /** No celular entra por baixo (alcance do polegar); no desktop, pela direita. */
  mobile: boolean
}

/**
 * O mapa vira consulta sob demanda, não painel permanente.
 *
 * Antes eram 80 botões e uma lista de revisão ocupando uma coluna de 300px o
 * tempo todo, numa tela em que se olha uma questão por vez. A lista de revisão
 * separada sumiu porque virou o filtro "Marcadas" daqui — eram duas superfícies
 * respondendo à mesma pergunta.
 */
export function MapaDaProva({
  aberto,
  onOpenChange,
  questoes,
  blocos,
  respostas,
  marcadas,
  atual,
  onIr,
  onFinalizar,
  mobile,
}: MapaDaProvaProps) {
  const [filtro, setFiltro] = useState<Filtro>("todas")

  const emBranco = questoes.filter((q) => !respostas[q.id]).length

  const passaNoFiltro = (estado: EstadoQuestao) =>
    filtro === "todas" ||
    (filtro === "branco" && estado === "branco") ||
    (filtro === "marcadas" && estado === "marcada")

  const filtros: { chave: Filtro; rotulo: string; contagem: number }[] = [
    { chave: "todas", rotulo: "Todas", contagem: questoes.length },
    { chave: "branco", rotulo: "Em branco", contagem: emBranco },
    { chave: "marcadas", rotulo: "Marcadas", contagem: marcadas.size },
  ]

  return (
    <Sheet open={aberto} onOpenChange={onOpenChange}>
      <SheetContent
        side={mobile ? "bottom" : "right"}
        className={cn(
          "gap-0 p-0",
          mobile ? "max-h-[85vh] rounded-t-xl" : "w-full sm:max-w-lg",
        )}
      >
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle>Mapa da prova</SheetTitle>
          <SheetDescription className="sr-only">
            Navegue entre as 80 questões do simulado e filtre pelas que faltam responder.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-wrap gap-2 px-5 pb-4">
          {filtros.map((f) => (
            <button
              key={f.chave}
              type="button"
              onClick={() => setFiltro(f.chave)}
              aria-pressed={filtro === f.chave}
              className={cn(
                "cursor-pointer rounded-lg border px-3 py-1.5 text-sm transition-colors",
                filtro === f.chave
                  ? "border-primary/60 bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
              )}
            >
              {f.rotulo}{" "}
              <span className="font-mono text-xs tabular-nums opacity-70">{f.contagem}</span>
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
          {blocos.map((bloco) => {
            const visiveis = bloco.indices.filter((i) =>
              passaNoFiltro(estadoDaQuestao(questoes[i].id, respostas, marcadas)),
            )
            if (visiveis.length === 0) return null

            return (
              <div key={bloco.materia} className="mb-5">
                <div className="mb-2 flex items-baseline gap-3">
                  <h3 className="font-mono text-[0.7rem] tracking-widest text-muted-foreground uppercase">
                    {bloco.materia}
                  </h3>
                  <span className="h-px flex-1 bg-border" />
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {bloco.respondidas}/{bloco.total}
                  </span>
                </div>

                <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                  {visiveis.map((indice) => {
                    const questao = questoes[indice]
                    const estado = estadoDaQuestao(questao.id, respostas, marcadas)
                    const ehAtual = indice === atual

                    return (
                      <button
                        key={questao.id}
                        type="button"
                        onClick={() => {
                          onIr(indice)
                          onOpenChange(false)
                        }}
                        aria-current={ehAtual ? "true" : undefined}
                        aria-label={`Questão ${indice + 1}, ${
                          estado === "marcada"
                            ? "marcada para revisão"
                            : estado === "respondida"
                              ? "respondida"
                              : "em branco"
                        }`}
                        className={cn(
                          "flex h-10 cursor-pointer items-center justify-center rounded-lg border font-mono text-sm tabular-nums transition-colors active:scale-95",
                          ehAtual && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                          estado === "respondida" &&
                            "border-primary/40 bg-primary/15 text-primary hover:bg-primary/25",
                          estado === "marcada" &&
                            "border-chart-3/60 bg-chart-3/10 text-chart-3 hover:bg-chart-3/20",
                          estado === "branco" &&
                            "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                        )}
                      >
                        {indice + 1}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="border-t border-border px-5 py-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" /> respondida
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full border border-border bg-muted" /> em branco
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-chart-3" /> marcada
            </span>
          </div>

          {/* No celular a barra superior não comporta o Finalizar; ele mora aqui. */}
          <Button
            variant="destructive"
            className="mt-3 w-full md:hidden"
            onClick={() => {
              onOpenChange(false)
              onFinalizar()
            }}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" /> Finalizar simulado
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
