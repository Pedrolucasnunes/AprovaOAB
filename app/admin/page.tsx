"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Users, FileQuestion, FileText, TrendingUp, Loader2, ArrowRight } from "lucide-react"
import {
  Area, AreaChart, Bar, BarChart,
  ResponsiveContainer, XAxis, YAxis,
  Tooltip, CartesianGrid,
} from "recharts"
import { toast } from "sonner"

interface UsuarioRecente {
  id: string
  nome: string
  email: string
  role: string
  plano: "free" | "pro" | "aprovacao" | string
  criadoEm: string
}

interface AdminStats {
  totais: {
    usuarios: number
    questoes: number
    simulados: number
    mediaAproveitamento: number
  }
  questoesPorDisciplina: { name: string; questoes: number }[]
  simuladosPorDia: { date: string; total: number }[]
  usuariosRecentes: UsuarioRecente[]
}

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "agora"
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `há ${d}d`
  const meses = Math.floor(d / 30)
  if (meses < 12) return `há ${meses} ${meses === 1 ? "mês" : "meses"}`
  const anos = Math.floor(d / 365)
  return `há ${anos} ${anos === 1 ? "ano" : "anos"}`
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

function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return "??"
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase()
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats")
        const data = await res.json()
        if (!res.ok) {
          toast.error("Erro ao carregar métricas")
          return
        }
        setStats(data)
      } catch {
        toast.error("Erro inesperado ao carregar dashboard")
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!stats) return null

  const secondaryCards = [
    {
      title: "Questões Cadastradas",
      value: stats.totais.questoes.toLocaleString("pt-BR"),
      description: "No banco de questões",
      icon: FileQuestion,
    },
    {
      title: "Simulados Realizados",
      value: stats.totais.simulados.toLocaleString("pt-BR"),
      description: "Total acumulado",
      icon: FileText,
    },
    {
      title: "Média de Aproveitamento",
      value: `${stats.totais.mediaAproveitamento}%`,
      description: "Média geral dos simulados",
      icon: TrendingUp,
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard Administrativo</h1>
        <p className="text-muted-foreground">Visão geral da plataforma AprovaOAB</p>
      </div>

      {/* ── Card principal: Total de Usuários ── */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total de Usuários
          </CardTitle>
          <Users className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <span className="font-display text-5xl font-black tracking-tight text-foreground">
            {stats.totais.usuarios.toLocaleString("pt-BR")}
          </span>
          <p className="mt-1 text-xs text-muted-foreground">Cadastrados na plataforma</p>
        </CardContent>
      </Card>

      {/* ── Cards secundários ── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {secondaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <span className="text-2xl font-bold text-foreground">{card.value}</span>
              <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Gráficos ── */}
      <div className="grid gap-6 lg:grid-cols-2">

        {/* Simulados por dia */}
        <Card>
          <CardHeader>
            <CardTitle>Simulados por Dia</CardTitle>
            <CardDescription>Últimos 7 dias de atividade</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.simuladosPorDia}>
                  <defs>
                    <linearGradient id="colorSim" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} className="text-xs fill-muted-foreground" />
                  <YAxis axisLine={false} tickLine={false} className="text-xs fill-muted-foreground" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                    labelStyle={{ color: "var(--foreground)" }}
                    formatter={(value: number) => [value, "Simulados"]}
                  />
                  <Area type="monotone" dataKey="total" stroke="var(--primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorSim)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Questões por disciplina */}
        <Card>
          <CardHeader>
            <CardTitle>Questões por Disciplina</CardTitle>
            <CardDescription>Distribuição real do banco de questões</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.questoesPorDisciplina.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">
                Nenhuma questão cadastrada ainda
              </div>
            ) : (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.questoesPorDisciplina.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} className="text-xs fill-muted-foreground" />
                    <YAxis
                      type="category"
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      className="text-xs fill-muted-foreground"
                      width={90}
                      tickFormatter={(v: string) => v.length > 12 ? v.slice(0, 12) + "…" : v}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                      labelStyle={{ color: "var(--foreground)" }}
                      formatter={(value: number) => [value, "Questões"]}
                    />
                    <Bar dataKey="questoes" fill="var(--primary)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Usuários recentes ── */}
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Usuários Recentes</CardTitle>
            <CardDescription>Últimos 5 usuários cadastrados na plataforma</CardDescription>
          </div>
          <Link
            href="/admin/usuarios"
            className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Ver todos
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>
        <CardContent>
          {stats.usuariosRecentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
          ) : (
            <div className="space-y-3">
              {stats.usuariosRecentes.map((u) => (
                <div key={u.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {iniciais(u.nome)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">{u.nome}</span>
                      <span className="text-xs text-muted-foreground truncate">{u.email || "Sem email"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {u.role === "admin" && <Badge>Admin</Badge>}
                    {u.role === "blocked" && <Badge variant="destructive">Bloqueado</Badge>}
                    <PlanoBadge plano={u.plano} />
                    <span className="hidden sm:inline text-xs text-muted-foreground whitespace-nowrap">
                      {tempoRelativo(u.criadoEm)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}