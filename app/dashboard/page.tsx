"use client"

import { toast } from "sonner"
import { SkeletonDashboard } from "@/components/ui/skeleton-cards"
import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  TrendingDown, TrendingUp, Target, FileText, CheckCircle2, AlertTriangle,
  ArrowRight, Clock, Zap, ListChecks, Lightbulb, Sparkles,
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

const META = 50

// ── Helpers ─────────────────────────────────────────────────────
function getTextColor(taxa: number): string {
  if (taxa <= 25) return "text-destructive"
  if (taxa < META) return "text-amber-500"
  return "text-primary"
}

function getBarColor(taxa: number): string {
  if (taxa <= 25) return "bg-destructive"
  if (taxa < META) return "bg-amber-500"
  return "bg-primary"
}

function getRiskBadge(taxa: number) {
  if (taxa <= 25) return <Badge variant="destructive">crítico</Badge>
  if (taxa < META) return <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30">atenção</Badge>
  return <Badge className="bg-primary/10 text-primary border-primary/20">adequado</Badge>
}

// ── Linha de disciplina ──────────────────────────────────────────
interface DisciplinaItem {
  nome: string
  taxa_acerto: number
}

function DisciplinaRow({ item, index }: { item: DisciplinaItem; index?: number }) {
  const taxa = Number(item.taxa_acerto)
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-1.5 cursor-default">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {index !== undefined && (
                  <span className="text-xs text-muted-foreground w-4 shrink-0">{index + 1}.</span>
                )}
                <div className="flex flex-col min-w-0">
                  <span className="text-sm text-foreground truncate max-w-[180px]">{item.nome}</span>
                  <div className="mt-0.5">{getRiskBadge(taxa)}</div>
                </div>
              </div>
              <span className={`text-sm font-semibold shrink-0 ${getTextColor(taxa)}`}>
                {taxa.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${getBarColor(taxa)}`}
                style={{ width: `${Math.min(taxa, 100)}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="font-medium">{item.nome}</p>
          <p className="text-xs text-muted-foreground">{taxa.toFixed(1)}% de acerto</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// ── Interfaces ───────────────────────────────────────────────────
interface DashboardData {
  resumo: { totalRespondidas: number; totalAcertos: number; taxaGeralAcerto: number }
  ultimoSimulado: { id: string; acertos: number; erros: number; percentual: number; numero_questoes: number; titulo: string; created_at: string } | null
  materiasRisco: { subject_id: string; nome: string; taxa: number }[]
  desempenhoPorMateria: { subject_id: string; nome: string; total: number; acertos: number; taxa_acerto: number }[]
  evolucao: { date: string; nota: number }[]
  actionCards: {
    proximaAcao:     { subject: string; horario: string | null } | null
    proximoSimulado: { date: string; time: string; numero: number } | null
    insightMateria:  { subject: string; taxa: number; diasSemTreino: number | null } | null
  }
  onboardingCompleto?: boolean
  diagnosticoCompleto?: boolean
  questoesHoje?: number
  plano?: "free" | "pro" | "aprovacao"
  subscriptionStatus?: "active" | "past_due" | "canceled"
}

interface FocoDiagnostico {
  id: string
  nome: string
}

function getSaudacao(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12) return "Bom dia"
  if (h >= 12 && h < 18) return "Boa tarde"
  return "Boa noite"
}

// ── Page ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userName, setUserName] = useState<string>("")
  const [foco, setFoco] = useState<FocoDiagnostico | null>(null)

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError("Usuário não autenticado"); setLoading(false); return }

        const firstName = user.user_metadata?.full_name?.split(" ")[0]
          ?? user.user_metadata?.name?.split(" ")[0]
          ?? user.email?.split("@")[0]
          ?? ""
        setUserName(firstName)

        const res = await fetch(`/api/dashboard`)
        const json = await res.json()

        if (!res.ok) {
          toast.error("Erro ao carregar dashboard")
          setError(json.error ?? "Erro ao carregar dashboard")
          setLoading(false)
          return
        }

        setData(json)

        if (json.diagnosticoCompleto) {
          fetch("/api/diagnostico/resultado")
            .then((r) => r.json())
            .then((d) => { if (d.completed && d.foco) setFoco(d.foco) })
            .catch(() => {})
        }
      } catch (err) {
        toast.error("Erro inesperado ao carregar dados")
        setError("Erro inesperado ao carregar dados")
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) return <SkeletonDashboard />
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  const DAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
  function fmtSimDate(dateStr: string, time: string) {
    const [y, m, d] = dateStr.split("-").map(Number)
    return `${DAYS_SHORT[new Date(y, m - 1, d).getDay()]} · ${time}`
  }
  function insightTitle(subject: string, dias: number | null) {
    if (dias === null) return `Comece a treinar ${subject}`
    if (dias >= 7)     return `Retome ${subject}`
    return                    `Intensifique ${subject}`
  }

  const ac  = data?.actionCards
  const acão = ac?.proximaAcao
  const sim  = ac?.proximoSimulado
  const ins  = ac?.insightMateria

  const emRisco = (data?.materiasRisco ?? []).map(m => ({ ...m, taxa_acerto: m.taxa }))
  const taxaGeral = data?.resumo?.taxaGeralAcerto ?? 0
  const numRisco = data?.materiasRisco?.length ?? 0
  const isNewUser = !data?.ultimoSimulado && (data?.resumo?.totalRespondidas ?? 0) === 0

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Acompanhe seu progresso e desempenho</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/simulados">
            Fazer simulado <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* ── Cobrança em atraso (Stripe past_due) ── */}
      {data?.subscriptionStatus === "past_due" && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-foreground">Sua última cobrança falhou</p>
            <p className="text-sm text-muted-foreground mt-1">
              Atualize seu cartão pra não perder o acesso ao seu plano. Tentaremos cobrar novamente nos próximos dias.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3">
              <Link href="/dashboard/perfil">
                Gerenciar assinatura <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      )}

      {/* ── Diagnóstico completo (cenário A) ── */}
      {isNewUser && data?.onboardingCompleto && data?.diagnosticoCompleto && (() => {
        const limiteBatido = data.plano === "free" && (data.questoesHoje ?? 0) >= 10
        const treinoHref = foco
          ? `/dashboard/treino?quantidade=5&materia=${foco.id}`
          : "/dashboard/treino?quantidade=5"
        return (
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">
                  {userName ? `${getSaudacao()}, ${userName}. ` : ""}
                  {limiteBatido
                    ? "Você completou suas questões de hoje."
                    : "Sua análise inicial está pronta."}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {limiteBatido
                    ? "Veja seu calendário pra continuar o plano de estudos."
                    : "Identificamos seus primeiros padrões a partir do diagnóstico. Comece o treino do dia."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {limiteBatido ? (
                    <Button asChild size="sm">
                      <Link href="/dashboard/calendario">
                        Ver meu calendário <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild size="sm">
                      <Link href={treinoHref}>
                        Começar treino do dia <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                  <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/diagnostico-inicial/resultado">
                      Ver análise completa
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── Onboarding feito, diagnóstico pendente (cenário B) ── */}
      {isNewUser && data?.onboardingCompleto && !data?.diagnosticoCompleto && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-semibold">Comece pelo diagnóstico</p>
              <p className="text-sm text-muted-foreground mt-1">
                Você ainda não fez seu mini-diagnóstico — 4 minutos pra mapear seus primeiros padrões.
              </p>
              <Button asChild size="sm" className="mt-3">
                <Link href="/dashboard/diagnostico-inicial">
                  Fazer agora <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Onboarding (usuário antigo sem perfil) ── */}
      {isNewUser && !data?.onboardingCompleto && (
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <p className="font-semibold">
              {userName ? `${getSaudacao()}, ${userName}! ` : ""}Bem-vindo ao AprovaOAB.
            </p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Siga estes 3 passos para começar seu estudo de forma inteligente.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex items-start gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">1</span>
              <div>
                <p className="text-sm font-medium">Faça um simulado</p>
                <p className="text-xs text-muted-foreground mt-0.5">Identifica seu nível atual e as disciplinas críticas.</p>
                <Link href="/dashboard/simulados" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                  Iniciar agora <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border p-3 opacity-60">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">2</span>
              <div>
                <p className="text-sm font-medium">Gere sua agenda</p>
                <p className="text-xs text-muted-foreground mt-0.5">A IA monta um calendário de estudos personalizado.</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-border p-3 opacity-60">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">3</span>
              <div>
                <p className="text-sm font-medium">Treine estrategicamente</p>
                <p className="text-xs text-muted-foreground mt-0.5">Questões priorizadas pelo seu ponto fraco.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero: Progresso rumo à aprovação ── */}
      {!isNewUser && (
        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-2 flex-1">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-2.5 py-1 text-xs font-medium text-primary">
                <Zap className="h-3 w-3" />
                Seu progresso rumo à aprovação
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold leading-tight">
                Sua taxa de acerto é{" "}
                <span className="text-primary">{taxaGeral.toFixed(1)}%</span>
              </h2>
              <p className="text-sm text-muted-foreground">
                Meta para aprovação:{" "}
                <strong className="text-foreground">{META}% de acerto</strong>.{" "}
                {taxaGeral >= META
                  ? "Parabéns! Você atingiu a meta."
                  : `Faltam ${(META - taxaGeral).toFixed(1)}% para chegar lá.`}
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-sm font-semibold text-primary shrink-0 pt-1">
              <TrendingUp className="h-4 w-4" />
              {taxaGeral.toFixed(1)}% / {META}%
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <div className="relative h-3 w-full rounded-full bg-primary/10 overflow-visible">
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(taxaGeral, 100)}%` }}
              />
              {/* Marcador da meta */}
              <div
                className="absolute top-0 h-full w-0.5 bg-foreground/30 rounded-full"
                style={{ left: `${META}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>Meta: {META}%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Próxima Ação (Card grande com CTA) ── */}
      {acão && (
        <div className="rounded-xl border border-border bg-gradient-to-br from-card via-card to-primary/5 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="space-y-3 flex-1">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-2.5 py-1 text-xs font-medium text-primary">
              <Zap className="h-3 w-3" />
              Próxima ação recomendada · Hoje
            </span>
            <div>
              <h3 className="text-xl font-bold">Treino de {acão.subject}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                10 questões adaptativas priorizando sua matéria mais crítica. Foco no que realmente vai te aprovar.
              </p>
            </div>
            <div className="flex items-center gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                <span>18 min</span>
                <span className="text-muted-foreground/50">Tempo estimado</span>
              </span>
              <span className="flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5" />
                <span>10 questões</span>
                <span className="text-muted-foreground/50">Adaptativas</span>
              </span>
            </div>
          </div>
          <Button size="lg" className="shrink-0 w-full sm:w-auto" asChild>
            <Link href="/dashboard/treino">
              Começar agora <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        {/* Último Simulado */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted-foreground">Último simulado</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 shrink-0">
                <FileText className="h-4 w-4 text-amber-500" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold">
              {data?.ultimoSimulado
                ? `${data.ultimoSimulado.acertos}/${data.ultimoSimulado.numero_questoes}`
                : "—"}
            </p>
            <p className={`mt-1 text-xs font-medium ${data?.ultimoSimulado ? getTextColor(data.ultimoSimulado.percentual) : "text-muted-foreground"}`}>
              {data?.ultimoSimulado
                ? `${data.ultimoSimulado.percentual}% de acerto · meta ${META}%`
                : "Nenhum simulado ainda"}
            </p>
          </CardContent>
        </Card>

        {/* Taxa de Acerto Geral */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted-foreground">Taxa de acerto geral</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <Target className="h-4 w-4 text-primary" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold">{taxaGeral.toFixed(1)}%</p>
            <p className={`mt-1 text-xs font-medium ${taxaGeral >= META ? "text-primary" : "text-muted-foreground"}`}>
              {taxaGeral >= META
                ? "Meta atingida!"
                : `Faltam ${(META - taxaGeral).toFixed(1)}% para a meta`}
            </p>
          </CardContent>
        </Card>

        {/* Questões Resolvidas */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted-foreground">Questões resolvidas</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 shrink-0">
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold">
              {data?.resumo?.totalRespondidas?.toLocaleString("pt-BR") ?? "0"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Total acumulado</p>
          </CardContent>
        </Card>

        {/* Matérias em Risco */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-start justify-between">
              <p className="text-sm text-muted-foreground">Matérias em risco</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10 shrink-0">
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold">{numRisco}</p>
            <p className="mt-1 text-xs text-muted-foreground">Precisam de atenção urgente</p>
          </CardContent>
        </Card>

      </div>

      {/* ── Bottom: 3 cards compactos ── */}
      <div className="grid gap-4 lg:grid-cols-3">

        {/* Simulado agendado */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-500">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                Simulado agendado
              </span>
              <span className="text-xs text-muted-foreground">
                {sim ? fmtSimDate(sim.date, sim.time) : "—"}
              </span>
            </div>
            {sim ? (
              <p className="text-sm font-semibold">
                Simulado completo {sim.numero} — 80 questões · 5h
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum simulado agendado ainda.</p>
            )}
            <Link
              href={sim ? "/dashboard/simulados" : "/dashboard/calendario"}
              className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {sim ? "Ver simulado" : "Agendar agora"} <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Recomendação */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                Recomendação
              </span>
              {ins && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Prioridade alta</Badge>
              )}
            </div>
            {ins ? (
              <p className="text-sm font-semibold">{insightTitle(ins.subject, ins.diasSemTreino)}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Faça simulados para gerar sugestões.</p>
            )}
            <Link href="/dashboard/treino" className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Aplicar sugestão <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        {/* Dica rápida */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Lightbulb className="h-3 w-3" />
                Dica rápida
              </span>
              <span className="text-xs text-muted-foreground">2 min</span>
            </div>
            <p className="text-sm font-semibold">
              {data?.ultimoSimulado
                ? `Revise os ${data.ultimoSimulado.erros ?? (data.ultimoSimulado.numero_questoes - data.ultimoSimulado.acertos)} erros mais frequentes do último simulado`
                : emRisco.length > 0
                  ? `Foque em ${emRisco[0].nome}, sua matéria mais crítica`
                  : "Faça ao menos 10 questões por dia para manter o ritmo"}
            </p>
            <Link href="/dashboard/desempenho" className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:underline">
              Ver análise completa <ArrowRight className="h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

      </div>

      {/* ── Disciplinas em risco ── */}
      {emRisco.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-destructive" />
              Disciplinas em risco
            </CardTitle>
            <Link href="/dashboard/desempenho" className="text-xs text-primary hover:underline flex items-center gap-1">
              Ver análise completa <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {emRisco.map((item, i) => (
                <DisciplinaRow key={item.subject_id} item={item} index={i} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  )
}
