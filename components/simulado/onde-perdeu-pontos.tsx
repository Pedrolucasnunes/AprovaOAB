"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { taxaTextColor } from "@/lib/metrics"
import type { MateriaResultado } from "@/lib/simulado-resultado"
import { cn } from "@/lib/utils"

interface OndePerdeuPontosProps {
  materias: MateriaResultado[]
}

const VISIVEIS_POR_PADRAO = 5

/**
 * As disciplinas em que a pessoa errou, ordenadas por quantidade de erro.
 *
 * SÓ ENTRA MATÉRIA COM RESPOSTA. Quem parou na metade da prova tem disciplinas
 * inteiras em branco, e elas apareciam aqui como "0 de 7 acertos", 0%, marcadas
 * como prioridade de estudo — um veredito sobre conhecimento que nunca foi
 * medido. Branco é assunto do mapa, que mostra onde o relógio acabou.
 *
 * O N vai impresso em toda linha ("2 de 10 acertos") porque taxa sem amostra
 * mente — mesma regra do relatório de turma.
 */
export function OndePerdeuPontos({ materias }: OndePerdeuPontosProps) {
  const [expandido, setExpandido] = useState(false)

  const comErro = materias.filter((m) => m.erros > 0)
  if (comErro.length === 0) return null

  const visiveis = expandido ? comErro : comErro.slice(0, VISIVEIS_POR_PADRAO)

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-foreground">Onde você errou mais</h2>
        {comErro.length > VISIVEIS_POR_PADRAO && (
          <button
            type="button"
            onClick={() => setExpandido((v) => !v)}
            className="cursor-pointer text-sm text-primary hover:underline"
          >
            {expandido ? "Ver menos" : `Ver todas as ${comErro.length} áreas`}
          </button>
        )}
      </div>
      <p className="mb-5 text-sm text-muted-foreground">
        Ordenado pelo número de erros — comece pelo topo. Questões em branco não
        entram: elas não dizem o que você sabe.
      </p>

      <ul className="space-y-4">
        {visiveis.map((materia) => (
          <li
            key={materia.subjectId ?? materia.nome}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:flex-nowrap"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{materia.nome}</p>
              {/* Denominador é RESPONDIDAS, não o total da matéria na prova:
                  a taxa ao lado é acerto sobre o que ela respondeu, e os dois
                  números têm que sair da mesma conta. Os brancos vêm depois,
                  como contexto, sem entrar na porcentagem. */}
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                {materia.acertos} de {materia.respondidas} acertos,{" "}
                {materia.erros} {materia.erros === 1 ? "erro" : "erros"}
                {materia.brancos > 0 && `, ${materia.brancos} em branco`}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-4">
              <span
                className={cn(
                  "w-10 shrink-0 text-right text-sm font-semibold tabular-nums",
                  taxaTextColor(materia.taxa),
                )}
              >
                {materia.taxa}%
              </span>

              {materia.subjectId ? (
                <Button asChild variant="outline" size="sm" className="shrink-0">
                  <Link
                    href={`/dashboard/treino?materia=${materia.subjectId}&origem=simulado_resultado`}
                  >
                    Treinar
                  </Link>
                </Button>
              ) : (
                <span className="w-[4.5rem] shrink-0" />
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
