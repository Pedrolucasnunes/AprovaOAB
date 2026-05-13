"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowRight, TrendingUp, AlertTriangle, Target, Clock, Brain } from "lucide-react"

interface Card {
  tipo: "materia" | "tempo" | "seguranca"
  titulo: string
  texto: string
  tom: "ok" | "atencao" | "critico"
}

interface PlanoDia {
  label: string
  atividade: string
  subject_id: string | null
}

interface Foco {
  id: string
  nome: string
}

interface ResultadoData {
  completed: boolean
  cards?: Card[]
  plano?: PlanoDia[]
  foco?: Foco | null
}

const iconByTipo = {
  materia: Target,
  tempo: Clock,
  seguranca: Brain,
}

const colorByTom = {
  ok: "border-primary/30 bg-primary/5",
  atencao: "border-amber-500/30 bg-amber-500/5",
  critico: "border-destructive/30 bg-destructive/5",
}

const iconColorByTom = {
  ok: "text-primary",
  atencao: "text-amber-500",
  critico: "text-destructive",
}

export default function ResultadoPage() {
  const router = useRouter()
  const [data, setData] = useState<ResultadoData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/diagnostico/resultado")
      .then((r) => r.json())
      .then((json) => {
        if (!json.completed) {
          router.replace("/dashboard/diagnostico-inicial")
          return
        }
        setData(json)
        setLoading(false)
      })
      .catch(() => {
        router.replace("/dashboard")
      })
  }, [router])

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center">
          <Sparkles className="mx-auto h-8 w-8 animate-pulse text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Montando sua análise...</p>
        </div>
      </div>
    )
  }

  const focoSubjectId = data.foco?.id

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            Análise inicial
          </span>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            Primeiros indícios
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Baseado no que você nos contou e nas suas primeiras respostas. Esses padrões vão ficar mais precisos conforme você responder mais questões.
          </p>
        </div>

        {/* Cards de observações */}
        <div className="space-y-3">
          {(data.cards ?? []).map((card, i) => {
            const Icon = iconByTipo[card.tipo]
            return (
              <div
                key={i}
                className={`rounded-xl border p-4 sm:p-5 ${colorByTom[card.tom]}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background ${iconColorByTom[card.tom]}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground">{card.titulo}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {card.texto}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Mini-plano */}
        <div className="mt-8 rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-primary" />
            <h2 className="text-base font-bold text-foreground">Próximos 3 dias</h2>
          </div>
          <div className="space-y-3">
            {(data.plano ?? []).map((dia, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="flex h-7 w-16 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-mono font-semibold text-foreground">
                  {dia.label}
                </span>
                <p className="text-sm leading-relaxed text-foreground pt-1">{dia.atividade}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA principal */}
        <div className="mt-6">
          <Button asChild className="w-full" size="lg">
            <Link
              href={
                focoSubjectId
                  ? `/dashboard/treino?quantidade=5&materia=${focoSubjectId}`
                  : "/dashboard/treino?quantidade=5"
              }
            >
              Começar hoje
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full mt-2">
            <Link href="/dashboard">Ir pro dashboard</Link>
          </Button>
        </div>

        {/* Paywall sutil */}
        <div className="mt-10 rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center">
          <div className="flex justify-center mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-sm font-semibold text-foreground">
            Quer ir além desta primeira leitura?
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Plano completo de 4 semanas, ajuste automático e revisão dinâmica vêm com o Pro.
          </p>
          <Link
            href="/#planos"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          >
            Conhecer o Pro <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
