"use client"

import { Flag, X } from "lucide-react"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"

export const LETRAS = ["A", "B", "C", "D"] as const
export type Letra = (typeof LETRAS)[number]

interface QuestaoProvaProps {
  indice: number
  total: number
  materia: string
  enunciado: string
  alternativas: { letra: Letra; texto: string }[]
  resposta: string | undefined
  /** Letras riscadas DESTA questão — a página guarda por `questaoId:letra`. */
  riscadas: Set<string>
  marcada: boolean
  onResponder: (letra: Letra) => void
  onToggleRisco: (letra: Letra) => void
  onToggleFlag: () => void
}

/**
 * O corpo da questão em modo prova.
 *
 * Está fora da página por dois motivos: a página já carrega o ciclo de vida
 * inteiro do simulado (tempo, sync, finalização), e um componente puro de
 * apresentação é o que permite ver a tela renderizada sem uma sessão logada
 * e um simulado em andamento.
 */
export function QuestaoProva({
  indice,
  total,
  materia,
  enunciado,
  alternativas,
  resposta,
  riscadas,
  marcada,
  onResponder,
  onToggleRisco,
  onToggleFlag,
}: QuestaoProvaProps) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 lg:px-6 lg:py-8">
      {/* `justify-end` no celular porque o número da questão e a matéria já
          estão na barra superior — repetir aqui custava uma linha inteira de
          uma tela que só cabe uma alternativa e meia. */}
      <div className="mb-5 flex items-center justify-end gap-3 sm:justify-between">
        <p className="hidden font-mono text-xs tracking-wide text-muted-foreground uppercase sm:block sm:text-sm">
          <span className="text-primary tabular-nums">
            Questão {String(indice + 1).padStart(2, "0")}
          </span>
          {" / "}
          <span className="tabular-nums">{total}</span>
          <span className="hidden sm:inline"> · {materia}</span>
        </p>

        <button
          type="button"
          onClick={onToggleFlag}
          aria-pressed={marcada}
          className={cn(
            "flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
            marcada
              ? "border-chart-3/60 bg-chart-3/10 text-chart-3"
              : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          <Flag className={cn("h-4 w-4", marcada && "fill-current")} />
          <span className="hidden sm:inline">{marcada ? "Marcada" : "Marcar para revisão"}</span>
          <Kbd className="hidden lg:inline-flex">R</Kbd>
        </button>
      </div>

      {/* Geist, como o enunciado do treino e do banco de questões — texto de
          questão no app inteiro é a sans, sem classe de fonte. `font-display`
          (Fraunces) é da landing e, aqui dentro, só de número grande no
          calendário: nunca de texto de leitura. O que a tela de prova ganha
          sobre as outras é TAMANHO e entrelinha, não uma fonte própria. */}
      <p className="mb-7 text-base leading-[1.6] text-foreground sm:text-lg sm:leading-[1.7]">
        {enunciado}
      </p>

      <div className="space-y-2.5">
        {alternativas.map((alt) => {
          const selecionada = resposta === alt.letra
          const riscada = riscadas.has(alt.letra)

          return (
            <div key={alt.letra} className="flex items-stretch gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => onResponder(alt.letra)}
                aria-pressed={selecionada}
                className={cn(
                  "flex flex-1 cursor-pointer items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                  selecionada
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:border-primary/40",
                  // Riscada é anotação, NUNCA verde: se pegasse qualquer cor de
                  // "selecionada", viraria resposta aos olhos de quem lê rápido.
                  riscada && !selecionada && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-xs font-medium",
                    selecionada ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}
                >
                  {alt.letra}
                </span>
                <span
                  className={cn(
                    "text-[0.9375rem] leading-relaxed text-foreground sm:text-base",
                    riscada && !selecionada && "line-through decoration-muted-foreground",
                  )}
                >
                  {alt.texto}
                </span>
              </button>

              <button
                type="button"
                onClick={() => onToggleRisco(alt.letra)}
                disabled={selecionada}
                aria-pressed={riscada}
                aria-label={
                  selecionada
                    ? `Alternativa ${alt.letra} é a sua resposta e não pode ser riscada`
                    : riscada
                      ? `Desfazer risco da alternativa ${alt.letra}`
                      : `Riscar alternativa ${alt.letra}`
                }
                title={selecionada ? "É a sua resposta" : "Riscar alternativa"}
                className={cn(
                  "grid w-9 shrink-0 place-items-center rounded-xl border transition-colors sm:w-11",
                  "disabled:cursor-not-allowed disabled:opacity-25",
                  riscada
                    ? "border-muted-foreground/40 bg-muted text-foreground"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  !selecionada && "cursor-pointer",
                )}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
