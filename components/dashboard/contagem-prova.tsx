"use client"

import Link from "next/link"
import { ArrowRight, CalendarClock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { fraseDaContagem, nomeDaProva, type ProximaProva } from "@/lib/editais"

/**
 * Contagem regressiva da 1ª fase + o próximo passo concreto.
 *
 * Por que o próximo passo vem junto: contador sozinho é enfeite. O que traz
 * alguém de volta é urgência LIGADA a uma ação — e a decisão de qual ação sai
 * inteira do payload que o dashboard já carrega, sem campo nem consulta nova.
 *
 * O card não cita preço nem plano, mesma regra da parede do limite diário: o
 * valor muda e a copy envelheceria errada sozinha.
 */

export interface EstadoDoAluno {
  /** Módulo do diagnóstico com matéria ainda não medida. */
  proximoModulo: { id: string; label: string; materiasPendentes: number } | null
  /** Pior matéria da lista de risco (já ordenada pelo servidor). */
  piorMateria: { id: string; nome: string } | null
  simuladosFinalizados: number
}

export interface ProximoPasso {
  texto: string
  cta: string
  href: string
}

/**
 * PURA — sem I/O, sem estado. A ordem dos ramos é a decisão de produto:
 * medir antes de treinar (treinar sem mapa é treinar no escuro), treinar antes
 * de simular (simulado é medição, não estudo), e o simulado só entra como
 * primeiro passo pra quem já tem mapa e nunca fez nenhum.
 */
export function proximoPasso(estado: EstadoDoAluno): ProximoPasso {
  if (estado.proximoModulo) {
    const n = estado.proximoModulo.materiasPendentes
    return {
      texto: `${n} ${n === 1 ? "matéria ainda não foi medida" : "matérias ainda não foram medidas"}. Meça antes de decidir o que estudar.`,
      cta: `Fazer o ${estado.proximoModulo.label}`,
      href: `/dashboard/diagnostico-inicial?modulo=${estado.proximoModulo.id}`,
    }
  }

  if (estado.piorMateria) {
    return {
      texto: `Sua matéria mais fraca hoje é ${estado.piorMateria.nome}.`,
      cta: "Treinar essa matéria",
      href: `/dashboard/treino?quantidade=5&materia=${estado.piorMateria.id}`,
    }
  }

  if (estado.simuladosFinalizados === 0) {
    return {
      texto: "Você ainda não fez um simulado completo — é ele que estima sua nota na prova.",
      cta: "Fazer o primeiro simulado",
      href: "/dashboard/simulados",
    }
  }

  return {
    texto: "Continue treinando pelas suas matérias mais fracas.",
    cta: "Treino inteligente",
    href: "/dashboard/treino?quantidade=10",
  }
}

export function ContagemProva({
  prova,
  estado,
}: {
  prova: ProximaProva
  estado: EstadoDoAluno
}) {
  const passo = proximoPasso(estado)

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
            <CalendarClock className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold">
              {fraseDaContagem(prova.diasRestantes, nomeDaProva(prova))}
              {prova.slug && (
                <>
                  {" · "}
                  <Link
                    href={`/editais/${prova.slug}`}
                    className="font-normal text-sm text-primary hover:underline underline-offset-2"
                  >
                    ver cronograma
                  </Link>
                </>
              )}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{passo.texto}</p>
          </div>
        </div>

        <Button asChild size="sm" className="shrink-0 sm:self-center">
          <Link href={passo.href}>
            {passo.cta} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>
    </div>
  )
}
