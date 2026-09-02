"use client"

import { estadoDaQuestao, type BlocoMateria } from "@/lib/simulado-prova"
import { cn } from "@/lib/utils"

interface BarraProgressoProps {
  questoes: { id: string; subject_name: string }[]
  blocos: BlocoMateria[]
  respostas: Record<string, string>
  marcadas: Set<string>
  atual: number
}

/**
 * Barra segmentada — uma marca por questão, agrupada por disciplina.
 *
 * Substitui a `<Progress>` linear, que media só "quantas respondi". Esta mede
 * ESTADO POR QUESTÃO, que é a informação de que a pessoa precisa pra decidir
 * pra onde voltar, e é o que torna o mapa uma consulta ocasional em vez de um
 * painel permanente ocupando um terço da tela.
 *
 * É PRESENTACIONAL de propósito: 80 segmentos numa barra dão ~10px de largura
 * cada no desktop e ~4px no celular, muito abaixo do alvo mínimo de 24px da
 * WCAG 2.5.8. Quem navega usa o mapa, onde os alvos são botões de verdade.
 */
export function BarraProgresso({
  questoes,
  blocos,
  respostas,
  marcadas,
  atual,
}: BarraProgressoProps) {
  const respondidas = questoes.filter((q) => respostas[q.id]).length

  return (
    <div
      role="img"
      aria-label={`Progresso: ${respondidas} de ${questoes.length} questões respondidas, ${marcadas.size} marcadas para revisão. Questão atual: ${atual + 1}.`}
      className="flex items-end gap-2 px-4 py-2 sm:gap-3 lg:px-6"
    >
      {/* A chave inclui o índice inicial porque `agruparPorMateria` agrupa por
          CONTIGUIDADE: a mesma matéria pode render dois blocos separados no dia
          em que o blueprint intercalar disciplinas. Só o nome colidiria. */}
      {blocos.map((bloco) => (
        <div key={`${bloco.materia}-${bloco.indices[0]}`} className="flex min-w-0 flex-1 items-end gap-[2px]">
          {bloco.indices.map((indice) => {
            const questao = questoes[indice]
            const estado = estadoDaQuestao(questao.id, respostas, marcadas)
            const ehAtual = indice === atual

            return (
              <span
                key={questao.id}
                className={cn(
                  "min-w-0 flex-1 rounded-[1px] transition-all",
                  ehAtual ? "h-3 ring-1 ring-primary/60" : "h-1.5",
                  estado === "respondida" && (ehAtual ? "bg-primary" : "bg-primary/70"),
                  estado === "marcada" && (ehAtual ? "bg-chart-3" : "bg-chart-3/80"),
                  // Em branco não é vazio: é contorno, pra a barra mostrar o
                  // tamanho da prova inteira desde a primeira questão.
                  estado === "branco" && (ehAtual ? "bg-primary/40" : "bg-border"),
                )}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
