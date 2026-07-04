"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { ArrowLeft, AlertTriangle, Loader2, BookOpen, ShieldOff, ShieldCheck, Stethoscope, Target } from "lucide-react"
import { toast } from "sonner"
import { formatarDataBrasil, formatarDataHoraBrasil, parseDbDate } from "@/lib/datas"

interface Resumo {
  hoje: number
  semana: number
  total: number
  max_por_hora: number
}

interface DiaAtividade {
  data: string
  questoes: number
  simulados: number
}

interface HoraAtividade {
  hora: number
  count: number
}

type TipoAtividade = "diagnostico" | "treino_avulsa" | "simulado"

interface UltimaAtividade {
  created_at: string
  tipo: TipoAtividade
}

interface PorTipo {
  diagnostico: number
  treino_avulsa: number
  simulado_questoes: number
}

interface UserInfo {
  id: string
  email: string | null
  nome: string | null
  plano: "free" | "pro" | "aprovacao" | string
  role: "user" | "admin" | "blocked" | string
  subscription_status: "active" | "trialing" | "past_due" | "canceled" | null
  criado_em: string | null
  trial_ends_at: string | null
}

interface AtividadeData {
  user: UserInfo
  resumo: Resumo
  por_tipo: PorTipo
  por_dia: DiaAtividade[]
  por_hora: HoraAtividade[]
  ultimas_atividades: UltimaAtividade[]
}

const ALERTA_MAX_HORA = 60

function iniciais(nome: string | null, email: string | null): string {
  const fonte = (nome || email || "??").trim()
  const partes = fonte.split(/\s+/).filter(Boolean)
  if (partes.length === 0) return "??"
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

function PlanoBadge({ plano }: { plano: string }) {
  if (plano === "pro") {
    return <Badge className="bg-primary/15 text-primary hover:bg-primary/15 border-0">Pro</Badge>
  }
  if (plano === "aprovacao") {
    return <Badge className="bg-[#fff4cc] text-[#b8860b] hover:bg-[#fff4cc] dark:bg-[#b8860b]/15 dark:text-[#f0c75e] border-0">Aprovação</Badge>
  }
  return <Badge variant="secondary">Grátis</Badge>
}

function StatusBadge({ status }: { status: UserInfo["subscription_status"] }) {
  if (!status || status === "active") return null
  if (status === "trialing") return <Badge className="bg-blue-500/15 text-blue-600 hover:bg-blue-500/15 border-0 dark:text-blue-400">Trial</Badge>
  if (status === "past_due") return <Badge variant="destructive">Pagamento falhou</Badge>
  if (status === "canceled") return <Badge variant="outline" className="text-muted-foreground">Cancelada</Badge>
  return null
}

function formatarData(iso: string | null): string {
  if (!iso) return "—"
  return formatarDataBrasil(iso)
}

export default function UsuarioAtividadePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [data, setData] = useState<AtividadeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmBloqueio, setConfirmBloqueio] = useState(false)
  const [atualizandoRole, setAtualizandoRole] = useState(false)

  useEffect(() => {
    fetch(`/api/admin/usuarios/${id}/atividade`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [id])

  const toggleBloqueio = async () => {
    if (!data) return
    // Roles reais no banco: "user" | "admin" | "blocked" — não existe "free".
    const novoRole = data.user.role === "blocked" ? "user" : "blocked"
    setAtualizandoRole(true)
    try {
      const res = await fetch(`/api/admin/usuarios/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: novoRole }),
      })
      if (!res.ok) throw new Error("Falha")
      setData({ ...data, user: { ...data.user, role: novoRole } })
      toast.success(novoRole === "blocked" ? "Usuário bloqueado" : "Usuário desbloqueado")
    } catch {
      toast.error("Não foi possível atualizar o usuário")
    } finally {
      setAtualizandoRole(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-muted-foreground">
        <p>Usuário não encontrado.</p>
        <Button variant="outline" onClick={() => router.back()}>Voltar</Button>
      </div>
    )
  }

  const { user, resumo, por_tipo, por_dia, por_hora, ultimas_atividades } = data
  const totalPorTipo = por_tipo.diagnostico + por_tipo.treino_avulsa + por_tipo.simulado_questoes
  const temAlerta = resumo.max_por_hora >= ALERTA_MAX_HORA

  const maxDia = Math.max(...por_dia.map((d) => d.questoes), 1)
  const maxHora = Math.max(...por_hora.map((h) => h.count), 1)

  const resumoPeriodo = {
    total: por_dia.reduce((acc, d) => acc + d.questoes, 0),
    diasAtivos: por_dia.filter((d) => d.questoes > 0).length,
  }

  const horarioPico = por_hora.reduce(
    (max, h) => (h.count > max.count ? h : max),
    { hora: 0, count: 0 }
  )
  const totalHoras = por_hora.reduce((acc, h) => acc + h.count, 0)

  const trialAtivo = user.subscription_status === "trialing" && user.trial_ends_at
    && parseDbDate(user.trial_ends_at) > new Date()
  const ehBloqueado = user.role === "blocked"
  const ehAdmin = user.role === "admin"

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Voltar
        </Button>

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-start sm:justify-between">
          {/* Identidade */}
          <div className="flex items-start gap-4 min-w-0">
            <Avatar className="h-14 w-14 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary text-base font-semibold">
                {iniciais(user.nome, user.email)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-foreground truncate">
                  {user.nome ?? "Usuário sem nome"}
                </h1>
                <PlanoBadge plano={user.plano} />
                {ehAdmin && <Badge>Admin</Badge>}
                {ehBloqueado && <Badge variant="destructive">Bloqueado</Badge>}
                <StatusBadge status={user.subscription_status} />
              </div>

              <p className="mt-1 text-sm text-muted-foreground truncate">
                {user.email ?? "Sem email"}
              </p>

              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>Membro desde {formatarData(user.criado_em)}</span>
                {trialAtivo && (
                  <span className="text-blue-600 dark:text-blue-400">
                    Trial termina em {formatarData(user.trial_ends_at)}
                  </span>
                )}
                {temAlerta && (
                  <span className="flex items-center gap-1 text-destructive font-medium">
                    <AlertTriangle className="h-3 w-3" />
                    Atividade suspeita
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Ações */}
          {!ehAdmin && (
            <div className="flex shrink-0 gap-2">
              <Button
                variant={ehBloqueado ? "outline" : "destructive"}
                size="sm"
                onClick={() => setConfirmBloqueio(true)}
                disabled={atualizandoRole}
              >
                {atualizandoRole
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : ehBloqueado
                    ? <><ShieldCheck className="h-4 w-4 mr-1.5" /> Desbloquear</>
                    : <><ShieldOff className="h-4 w-4 mr-1.5" /> Bloquear</>
                }
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Alerta de atividade suspeita */}
      {temAlerta && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-destructive text-sm">Atividade suspeita detectada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Este usuário respondeu <strong>{resumo.max_por_hora} questões em 1 hora</strong> — acima do limite esperado de {ALERTA_MAX_HORA}. Isso pode indicar uso de bot ou scraping.
            </p>
          </div>
        </div>
      )}

      {/* Cards de resumo */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{resumo.hoje}</p>
            <p className="text-xs text-muted-foreground">Questões hoje</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{resumo.semana}</p>
            <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold">{resumo.total.toLocaleString("pt-BR")}</p>
            <p className="text-xs text-muted-foreground">Total de questões</p>
          </CardContent>
        </Card>
        <Card className={temAlerta ? "border-destructive/50" : ""}>
          <CardContent className="p-4">
            <p className={`text-2xl font-bold ${temAlerta ? "text-destructive" : ""}`}>
              {resumo.max_por_hora}
            </p>
            <p className="text-xs text-muted-foreground">Máx. questões/hora</p>
          </CardContent>
        </Card>
      </div>

      {/* Distribuição por tipo de questão */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por tipo</CardTitle>
          <CardDescription>
            {totalPorTipo === 0
              ? "Nenhuma questão respondida ainda"
              : `${totalPorTipo.toLocaleString("pt-BR")} questões respondidas no total`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totalPorTipo === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">—</p>
          ) : (
            <>
              {/* Barra horizontal proporcional */}
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                {por_tipo.diagnostico > 0 && (
                  <div
                    className="bg-muted-foreground/60"
                    style={{ width: `${(por_tipo.diagnostico / totalPorTipo) * 100}%` }}
                    title={`Diagnóstico: ${por_tipo.diagnostico}`}
                  />
                )}
                {por_tipo.treino_avulsa > 0 && (
                  <div
                    className="bg-primary"
                    style={{ width: `${(por_tipo.treino_avulsa / totalPorTipo) * 100}%` }}
                    title={`Treino/Avulsa: ${por_tipo.treino_avulsa}`}
                  />
                )}
                {por_tipo.simulado_questoes > 0 && (
                  <div
                    className="bg-blue-500"
                    style={{ width: `${(por_tipo.simulado_questoes / totalPorTipo) * 100}%` }}
                    title={`Simulado: ${por_tipo.simulado_questoes}`}
                  />
                )}
              </div>

              {/* Legenda com contagens */}
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Stethoscope className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold leading-none">{por_tipo.diagnostico}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Diagnóstico</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <BookOpen className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold leading-none">{por_tipo.treino_avulsa}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Treino / Avulsa</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/10">
                    <Target className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg font-bold leading-none">{por_tipo.simulado_questoes}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">Em simulados</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Gráfico: questões por dia */}
      <Card>
        <CardHeader>
          <CardTitle>Questões por dia</CardTitle>
          <CardDescription>
            Últimos 30 dias · {resumoPeriodo.total} questões em {resumoPeriodo.diasAtivos} {resumoPeriodo.diasAtivos === 1 ? "dia ativo" : "dias ativos"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={por_dia} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="data"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                tickFormatter={(v) => {
                  const d = new Date(v + "T00:00:00")
                  return `${d.getDate()}/${d.getMonth() + 1}`
                }}
                interval={2}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(v) => [`${v} questões`, ""]}
                labelFormatter={(l) => {
                  const d = new Date(l + "T00:00:00")
                  return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })
                }}
              />
              <Bar dataKey="questoes" radius={[4, 4, 0, 0]} background={{ fill: "var(--muted)", opacity: 0.25, radius: 4 }}>
                {por_dia.map((entry) => (
                  <Cell
                    key={entry.data}
                    fill={entry.questoes >= maxDia * 0.8 && entry.questoes > 50
                      ? "var(--destructive)"
                      : "var(--primary)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Distribuição por horário */}
      <Card>
        <CardHeader>
          <CardTitle>Horário de estudo</CardTitle>
          <CardDescription>
            {totalHoras === 0
              ? "Sem atividade nos últimos 30 dias"
              : `Pico às ${horarioPico.hora}h (${horarioPico.count} ${horarioPico.count === 1 ? "questão" : "questões"})`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Barras: single row de 24 horas com trilho de fundo */}
          <div className="flex items-end gap-[2px] h-20">
            {por_hora.map(({ hora, count }) => {
              const pct = maxHora > 0 ? (count / maxHora) * 100 : 0
              const isAlto = count >= ALERTA_MAX_HORA
              return (
                <div
                  key={hora}
                  className="group relative flex-1 h-full flex items-end rounded-sm bg-muted/30"
                  title={`${hora}h: ${count} ${count === 1 ? "questão" : "questões"}`}
                >
                  {count > 0 && (
                    <div
                      className={`w-full rounded-sm transition-all ${isAlto ? "bg-destructive" : "bg-primary"}`}
                      style={{ height: `${Math.max(pct, 8)}%` }}
                    />
                  )}
                </div>
              )
            })}
          </div>

          {/* Labels: 0h, 6h, 12h, 18h, 23h em vez de todas as 24 (reduz ruído) */}
          <div className="mt-2 flex justify-between text-[10px] text-muted-foreground font-mono px-[1px]">
            <span>0h</span>
            <span>6h</span>
            <span>12h</span>
            <span>18h</span>
            <span>23h</span>
          </div>
        </CardContent>
      </Card>

      {/* Últimas atividades */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas atividades</CardTitle>
          <CardDescription>As 20 ações mais recentes nos últimos 30 dias</CardDescription>
        </CardHeader>
        <CardContent>
          {ultimas_atividades.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade nos últimos 30 dias.</p>
          ) : (
            <div className="space-y-2">
              {ultimas_atividades.map((a, i) => {
                const config = {
                  diagnostico: { icon: Stethoscope, bg: "bg-muted", color: "text-muted-foreground", label: "Questão de diagnóstico" },
                  treino_avulsa: { icon: BookOpen, bg: "bg-primary/10", color: "text-primary", label: "Questão (treino/avulsa)" },
                  simulado: { icon: Target, bg: "bg-blue-500/10", color: "text-blue-500", label: "Simulado realizado" },
                }[a.tipo]
                const Icon = config.icon
                return (
                  <div key={i} className="flex items-center gap-3 text-sm">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${config.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                    </div>
                    <span className="flex-1 text-foreground">{config.label}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatarDataHoraBrasil(a.created_at)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmBloqueio}
        onOpenChange={setConfirmBloqueio}
        title={ehBloqueado ? "Desbloquear usuário?" : "Bloquear usuário?"}
        description={ehBloqueado
          ? "O usuário voltará a ter acesso à plataforma normalmente."
          : "O usuário não conseguirá mais acessar a plataforma até ser desbloqueado."}
        confirmLabel={ehBloqueado ? "Desbloquear" : "Bloquear"}
        destructive={!ehBloqueado}
        onConfirm={() => {
          setConfirmBloqueio(false)
          toggleBloqueio()
        }}
      />
    </div>
  )
}
