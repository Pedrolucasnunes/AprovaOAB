"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Clock, Target, BarChart2, Loader2, Trash2, AlertTriangle, ArrowRight, BarChart, Lock, Sparkles } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"

interface SimuladoRealizado {
  id: string
  titulo: string
  created_at: string
  acertos: number
  erros: number
  percentual: number
  numero_questoes: number
}

interface SimuladoEmAndamento {
  id: string
  titulo: string
  created_at: string
}

export default function SimuladosPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [deletandoId, setDeletandoId] = useState<string | null>(null)
  const [confirmarExclusao, setConfirmarExclusao] = useState<SimuladoEmAndamento | null>(null)
  const [loadingHistorico, setLoadingHistorico] = useState(true)
  const [simuladosRealizados, setSimuladosRealizados] = useState<SimuladoRealizado[]>([])
  const [emAndamento, setEmAndamento] = useState<SimuladoEmAndamento[]>([])
  const [plano, setPlano] = useState<string>("free")
  const [trialUsed, setTrialUsed] = useState(false)

  const trialDisponivel =
    process.env.NEXT_PUBLIC_TRIAL_ENABLED === "true" && plano === "free" && !trialUsed

  useEffect(() => {
    async function init() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [simuladosRes, usuarioRes] = await Promise.all([
        supabase
          .from("simulados")
          .select("id, titulo, created_at, acertos, erros, percentual, numero_questoes")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("users")
          .select("plano, trial_used")
          .eq("id", user.id)
          .single(),
      ])

      const todos = simuladosRes.data ?? []
      setSimuladosRealizados(todos.filter((s: any) => s.acertos !== null))
      setEmAndamento(todos.filter((s: any) => s.acertos === null))
      setPlano(usuarioRes.data?.plano ?? "free")
      setTrialUsed(usuarioRes.data?.trial_used ?? false)
      setLoadingHistorico(false)
    }
    init()
  }, [])

  const iniciarSimulado = async () => {
    setLoading(true)

    try {
      const res = await fetch("/api/simulados/gerar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 403 && data.upgrade) {
          router.push(trialDisponivel ? "/dashboard/perfil/trial" : "/#planos")
          return
        }
        if (res.status === 409 && data.emAndamento) {
          router.push(`/dashboard/simulados/${data.emAndamento}`)
          return
        }
        toast.error(data.error ?? "Erro ao gerar simulado")
        return
      }
      router.push(`/dashboard/simulados/${data.simuladoId}`)
    } catch {
      toast.error("Erro inesperado ao gerar simulado")
    } finally {
      setLoading(false)
    }
  }

  const deletarSimulado = async () => {
    if (!confirmarExclusao) return
    const id = confirmarExclusao.id
    setDeletandoId(id)
    try {
      const res = await fetch(`/api/simulados/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? "Erro ao excluir simulado")
        return
      }
      setSimuladosRealizados((prev) => prev.filter((s) => s.id !== id))
      setEmAndamento((prev) => prev.filter((s) => s.id !== id))
      setConfirmarExclusao(null)
      toast.success("Simulado excluído")
    } catch {
      toast.error("Erro inesperado ao excluir simulado")
    } finally {
      setDeletandoId(null)
    }
  }

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })

  const ultimo = simuladosRealizados[0]
  const melhorPercentual = simuladosRealizados.length > 0
    ? Math.max(...simuladosRealizados.map((s) => s.percentual))
    : null
  const metaAprovacao = 50

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Simulados</h1>
        <p className="text-muted-foreground text-sm">Treine como se fosse o exame real</p>
      </div>

      {/* ── Banner: jornada ── */}
      {ultimo && (
        <div className="rounded-xl border border-border/50 bg-card p-6" style={{ background: "linear-gradient(135deg, hsl(var(--card)) 60%, hsl(var(--primary)/0.08))" }}>
          <div className="flex items-start justify-between gap-6">
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 text-xs text-primary font-medium bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-4">
                <BarChart2 className="h-3.5 w-3.5" />
                Sua jornada de simulados
              </div>
              <p className="text-3xl font-extrabold text-foreground">
                Último resultado:{" "}
                <span className="text-primary">
                  {ultimo.acertos}/{ultimo.numero_questoes} ({ultimo.percentual}%)
                </span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {ultimo.percentual >= metaAprovacao
                  ? "Você atingiu a meta de aprovação. Continue assim!"
                  : `Faltam ${(metaAprovacao - ultimo.percentual).toFixed(1)}% para atingir a meta de aprovação (${metaAprovacao}%). Cada simulado te deixa mais perto.`}
              </p>
              <div className="mt-4 h-2 rounded-full bg-muted overflow-hidden w-full max-w-sm">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(ultimo.percentual, 100)}%` }}
                />
              </div>
            </div>
            <div className="hidden sm:flex flex-col gap-3 shrink-0">
              <div className="rounded-lg border border-border/40 bg-background/60 px-5 py-3 text-center min-w-[90px]">
                <p className="text-xs text-muted-foreground">Melhor</p>
                <p className="text-xl font-bold text-foreground">{melhorPercentual}%</p>
              </div>
              <div className="rounded-lg border border-border/40 bg-background/60 px-5 py-3 text-center min-w-[90px]">
                <p className="text-xs text-muted-foreground">Simulados</p>
                <p className="text-xl font-bold text-foreground">{simuladosRealizados.length}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Continuar simulado em andamento ── */}
      {emAndamento.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Continuar de onde parou</h2>
          </div>
          <div className="space-y-3">
            {emAndamento.map((s) => (
              <div key={s.id} className="rounded-xl border border-primary/40 bg-card p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground">Simulado em andamento</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Começado em {formatDate(s.created_at)} · {formatTime(s.created_at)}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 gap-1.5"
                  onClick={() => router.push(`/dashboard/simulados/${s.id}`)}
                >
                  Continuar <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => setConfirmarExclusao(s)}
                  disabled={deletandoId === s.id}
                >
                  {deletandoId === s.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />
                  }
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Card: próximo simulado ── */}
      <div className="rounded-xl border border-border/50 bg-card p-6" style={{ background: "linear-gradient(135deg, hsl(var(--card)) 50%, hsl(var(--primary)/0.06))" }}>
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 text-xs text-primary font-medium bg-primary/10 border border-primary/20 rounded-full px-3 py-1 mb-3">
              <Target className="h-3.5 w-3.5" />
              Simulado completo · 1ª fase OAB
            </div>
            <h2 className="text-2xl font-extrabold text-foreground mb-2">
              Simule a prova da OAB
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg">
              Réplica fiel da estrutura oficial: 80 questões em 5 horas, com peso por disciplina igual ao exame. Use para medir seu nível real e calibrar a estratégia.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-muted-foreground/70" /> 5h
                <span className="text-xs">Tempo total</span>
              </span>
              <span className="flex items-center gap-1.5">
                <BarChart className="h-4 w-4 text-muted-foreground/70" /> 80 questões
                <span className="text-xs">Estrutura oficial</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Target className="h-4 w-4 text-muted-foreground/70" /> Meta 50%
                <span className="text-xs">Para aprovação</span>
              </span>
            </div>
          </div>
          <div className="shrink-0 self-center">
            {plano === "free" ? (
              trialDisponivel ? (
                <Button
                  size="lg"
                  className="gap-2 text-base font-semibold px-6"
                  asChild
                >
                  <Link href="/dashboard/perfil/trial">
                    <Sparkles className="h-4 w-4" /> Testar Pro 7 dias grátis
                  </Link>
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 text-base font-semibold px-6"
                  asChild
                >
                  <Link href="/#planos">
                    <Lock className="h-4 w-4" /> Assinar para simular
                  </Link>
                </Button>
              )
            ) : (
              <Button
                size="lg"
                className="gap-2 text-base font-semibold px-6"
                onClick={() => iniciarSimulado()}
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</>
                ) : (
                  <>Iniciar simulado <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Histórico ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Histórico de simulados</h2>
          </div>
          {!loadingHistorico && simuladosRealizados.length > 0 && (
            <span className="text-xs text-muted-foreground">{simuladosRealizados.length} tentativa{simuladosRealizados.length > 1 ? "s" : ""}</span>
          )}
        </div>

        {loadingHistorico ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : simuladosRealizados.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Nenhum simulado realizado ainda. Inicie seu primeiro acima.</p>
        ) : (
          <div className="space-y-3">
            {simuladosRealizados.map((s, idx) => {
              const aprovado = s.percentual >= metaAprovacao
              const anterior = simuladosRealizados[idx + 1]
              const delta = anterior ? +(s.percentual - anterior.percentual).toFixed(1) : null
              return (
                <div key={s.id} className="rounded-xl border border-border/50 bg-card p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground truncate">
                        {s.titulo ?? "Simulado OAB — Multidisciplinar"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDate(s.created_at)} · {formatTime(s.created_at)}
                    </p>
                    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden w-full max-w-[200px]">
                      <div
                        className={`h-full rounded-full transition-all ${aprovado ? "bg-primary" : "bg-amber-500"}`}
                        style={{ width: `${Math.min(s.percentual, 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className={`text-xl font-bold ${aprovado ? "text-primary" : "text-amber-500"}`}>
                      {s.percentual}%
                    </p>
                    <p className="text-xs text-muted-foreground">{s.acertos}/{s.numero_questoes}</p>
                    {delta !== null && (
                      <p className={`text-xs font-medium ${delta >= 0 ? "text-primary" : "text-destructive"}`}>
                        {delta >= 0 ? "+" : ""}{delta}% vs anterior
                      </p>
                    )}
                  </div>

                  <div className="shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => router.push(`/dashboard/simulados/${s.id}?gabarito=true`)}
                    >
                      Ver análise
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmarExclusao(s)}
                    disabled={deletandoId === s.id}
                  >
                    {deletandoId === s.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Trash2 className="h-4 w-4" />
                    }
                  </Button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Dialog de confirmação de exclusão ── */}
      <Dialog open={!!confirmarExclusao} onOpenChange={(open) => { if (!open) setConfirmarExclusao(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir simulado
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Você está prestes a excluir o simulado:</p>
                <p className="font-medium text-foreground">
                  {confirmarExclusao?.titulo ?? "Simulado OAB"} — {confirmarExclusao ? formatDate(confirmarExclusao.created_at) : ""}
                </p>
                <p className="text-destructive/80">Esta ação não pode ser desfeita.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmarExclusao(null)}
              disabled={!!deletandoId}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={deletarSimulado}
              disabled={!!deletandoId}
            >
              {deletandoId
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Excluindo...</>
                : <><Trash2 className="mr-2 h-4 w-4" /> Excluir</>
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
