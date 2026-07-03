"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, Target, BookOpen, Trophy, Loader2, AlertCircle, Award, CheckCircle2, XCircle } from "lucide-react"
import {
  Area, AreaChart, Bar, BarChart, ResponsiveContainer,
  XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Legend,
} from "recharts"
import { supabase } from "@/lib/supabase"
import { getClientUser } from "@/lib/auth-client"
import { fetchAllRows, fetchByIds } from "@/lib/supabase-paginate"
import { META_APROVACAO as META, classificarTaxa, taxaLabel, metaTextColor } from "@/lib/metrics"

const LISTA_LIMITE = 6

interface EvolutionPoint {
  date: string
  nota: number
}

interface WeeklyPoint {
  dia: string
  questoes: number
  acertos: number
  erros: number
}

interface DesempenhoMateria {
  subject_id: string
  name: string
  acerto: number
  questoes: number
}

interface MateriaRisco {
  subject_id: string
  name: string
  taxa: number
}

function getRiskColor(taxa: number) {
  const nivel = classificarTaxa(taxa)
  if (nivel === "critica") return "bg-destructive text-destructive-foreground"
  if (nivel === "media") return "bg-amber-500 text-white"
  return "bg-primary text-primary-foreground"
}

// Cor do preenchimento do <Progress> pela banda canônica.
function progressBarClass(taxa: number) {
  const nivel = classificarTaxa(taxa)
  if (nivel === "critica") return "[&>div]:bg-destructive"
  if (nivel === "media") return "[&>div]:bg-amber-500"
  return ""
}

export default function DesempenhoPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [evolutionData, setEvolutionData] = useState<EvolutionPoint[]>([])
  const [statsSimulados, setStatsSimulados] = useState({
    mediaAcerto: 0, totalSimulados: 0, aprovados: 0,
    maiorNota: 0, maiorTotal: 0, maiorPercentual: 0,
  })
  const [statsQuestoes, setStatsQuestoes] = useState({
    total: 0, acertos: 0, erros: 0, taxaAcerto: 0,
  })
  const [weeklyData, setWeeklyData] = useState<WeeklyPoint[]>([])
  const [desempenhoPorMateria, setDesempenhoPorMateria] = useState<DesempenhoMateria[]>([])
  const [materiasRisco, setMateriasRisco] = useState<MateriaRisco[]>([])
  const [showAllRisco, setShowAllRisco] = useState(false)
  const [showAllDisciplinas, setShowAllDisciplinas] = useState(false)

  useEffect(() => {
    async function init() {
      try {
        const user = await getClientUser()
        if (!user) { setError("Usuário não autenticado."); return }
        await Promise.all([fetchSimulados(user.id), fetchQuestoes(user.id), fetchDesempenho(user.id)])
      } catch (err) {
        console.error("Erro ao carregar desempenho:", err)
        setError("Não foi possível carregar os dados. Tente novamente.")
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  async function fetchSimulados(uid: string) {
    const { data, error } = await supabase
      .from("simulados")
      .select("id, acertos, erros, percentual, numero_questoes, created_at")
      .eq("user_id", uid)
      .not("percentual", "is", null)
      .order("created_at", { ascending: true })

    if (error) throw error
    if (!data || data.length === 0) return

    // Taxa agrupada (soma de acertos / soma de questões), não média de
    // percentuais — mesma fórmula da taxa de simulados do /api/dashboard.
    const totalQuestoes = data.reduce((acc, s) => acc + (s.numero_questoes ?? 0), 0)
    const totalAcertos = data.reduce((acc, s) => acc + (s.acertos ?? 0), 0)
    const media = totalQuestoes > 0 ? (totalAcertos / totalQuestoes) * 100 : 0
    const melhor = data.reduce((prev, curr) => curr.percentual > prev.percentual ? curr : prev, data[0])
    const aprovados = data.filter(s => s.percentual >= META).length

    setStatsSimulados({
      mediaAcerto: parseFloat(media.toFixed(1)),
      totalSimulados: data.length,
      aprovados,
      maiorNota: melhor.acertos,
      maiorTotal: melhor.numero_questoes,
      maiorPercentual: melhor.percentual,
    })

    // Um ponto por simulado (sem agregação mensal): com poucos dados, a média
    // por mês escondia simulados e distorcia a "evolução".
    setEvolutionData(data.map(s => ({
      date: new Date(s.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      nota: parseFloat(Number(s.percentual).toFixed(1)),
    })))
  }

  async function fetchQuestoes(uid: string) {
    // Pagina: um usuário ativo pode passar de 1000 question_attempts.
    const data = await fetchAllRows<{ question_id: string; acertou: boolean; created_at: string }>(
      () => supabase.from("question_attempts").select("question_id, acertou, created_at").eq("user_id", uid),
    )

    const total = data.length
    const acertos = data.filter(q => q.acertou).length
    setStatsQuestoes({
      total, acertos, erros: total - acertos,
      taxaAcerto: total > 0 ? parseFloat(((acertos / total) * 100).toFixed(2)) : 0,
    })

    const dias = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
    const hoje = new Date()
    const semana: WeeklyPoint[] = []
    for (let i = 6; i >= 0; i--) {
      const dia = new Date(hoje)
      dia.setDate(hoje.getDate() - i)
      const dateStr = dia.toLocaleDateString("en-CA")
      const doDia = data.filter(q => new Date(q.created_at).toLocaleDateString("en-CA") === dateStr)
      const acertosDia = doDia.filter(q => q.acertou).length
      semana.push({
        dia: dias[dia.getDay()],
        questoes: doDia.length,
        acertos: acertosDia,
        erros: doDia.length - acertosDia,
      })
    }
    setWeeklyData(semana)

    if (data.length === 0) return

    const qIds = [...new Set(data.map(q => q.question_id))]
    const questions = await fetchByIds<{ id: string; subject_id: string }>(
      (ids) => supabase.from("questions").select("id, subject_id").in("id", ids),
      qIds,
    )

    const subjectIds = [...new Set(questions.map(q => q.subject_id).filter(Boolean))]
    const { data: subjects, error: sError } = await supabase
      .from("subjects").select("id, name").in("id", subjectIds.length > 0 ? subjectIds : ["null"])
    if (sError) throw sError

    const subjectMap = Object.fromEntries((subjects ?? []).map(s => [s.id, s.name]))
    const qSubMap = Object.fromEntries((questions ?? []).map(q => [q.id, q.subject_id]))

    const materiaStats: Record<string, { acertos: number; total: number; name: string }> = {}
    for (const attempt of data) {
      const sid = qSubMap[attempt.question_id]
      if (!sid) continue
      if (!materiaStats[sid]) materiaStats[sid] = { acertos: 0, total: 0, name: subjectMap[sid] ?? "Desconhecida" }
      materiaStats[sid].total += 1
      if (attempt.acertou) materiaStats[sid].acertos += 1
    }

    setDesempenhoPorMateria(
      Object.entries(materiaStats).map(([subject_id, v]) => ({
        subject_id,
        name: v.name,
        acerto: v.total > 0 ? parseFloat(((v.acertos / v.total) * 100).toFixed(1)) : 0,
        questoes: v.total,
      })).sort((a, b) => a.acerto - b.acerto)
    )
  }

  async function fetchDesempenho(uid: string) {
    // Pagina: usuário ativo pode passar de 1000 attempts/respostas de simulado.
    const attempts = await fetchAllRows<{ id: string }>(
      () => supabase.from("simulado_attempts").select("id").eq("user_id", uid),
    )
    if (attempts.length === 0) return

    const respostas = await fetchByIds<{ question_id: string; acertou: boolean }>(
      (ids) => supabase.from("simulado_respostas").select("question_id, acertou").in("attempt_id", ids),
      attempts.map(a => a.id),
    )
    if (respostas.length === 0) return

    const qIds = [...new Set(respostas.map(r => r.question_id))]
    const questions = await fetchByIds<{ id: string; subject_id: string }>(
      (ids) => supabase.from("questions").select("id, subject_id").in("id", ids),
      qIds,
    )

    const subjectIds = [...new Set(questions.map(q => q.subject_id).filter(Boolean))]
    const { data: subjects, error: sError } = await supabase
      .from("subjects").select("id, name").in("id", subjectIds.length > 0 ? subjectIds : ["null"])
    if (sError) throw sError

    const subjectMap = Object.fromEntries((subjects ?? []).map(s => [s.id, s.name]))
    const qSubMap = Object.fromEntries((questions ?? []).map(q => [q.id, q.subject_id]))

    const materiaStats: Record<string, { acertos: number; total: number; name: string }> = {}
    for (const resposta of respostas) {
      const sid = qSubMap[resposta.question_id]
      if (!sid) continue
      if (!materiaStats[sid]) materiaStats[sid] = { acertos: 0, total: 0, name: subjectMap[sid] ?? "Desconhecida" }
      materiaStats[sid].total += 1
      if (resposta.acertou) materiaStats[sid].acertos += 1
    }

    setMateriasRisco(
      Object.entries(materiaStats).map(([subject_id, v]) => ({
        subject_id,
        name: v.name,
        taxa: v.total > 0 ? parseFloat(((v.acertos / v.total) * 100).toFixed(1)) : 0,
      })).sort((a, b) => a.taxa - b.taxa)
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm">{error}</p>
        <button
          onClick={() => { setError(null); setLoading(true); window.location.reload() }}
          className="text-sm text-primary underline underline-offset-2"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  const riscosVisiveis = showAllRisco ? materiasRisco : materiasRisco.slice(0, LISTA_LIMITE)
  const disciplinasVisiveis = showAllDisciplinas ? desempenhoPorMateria : desempenhoPorMateria.slice(0, LISTA_LIMITE)
  const abaixoDaMetaRisco = materiasRisco.filter(m => m.taxa < META).length
  const abaixoDaMetaDisciplinas = desempenhoPorMateria.filter(d => d.acerto < META).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Desempenho</h1>
        <p className="text-muted-foreground">Análise completa do seu progresso e áreas de melhoria</p>
      </div>

      <Tabs defaultValue="simulados">
        <TabsList>
          <TabsTrigger value="simulados">Simulados</TabsTrigger>
          <TabsTrigger value="questoes">Questões</TabsTrigger>
        </TabsList>

        {/* ─── ABA SIMULADOS ─── */}
        <TabsContent value="simulados" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de acerto em simulados</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">{statsSimulados.mediaAcerto}%</span>
                  <span className={`flex items-center text-xs font-medium ${metaTextColor(statsSimulados.mediaAcerto)}`}>
                    {statsSimulados.mediaAcerto >= META
                      ? <><TrendingUp className="mr-1 h-3 w-3" />acima da meta</>
                      : <><TrendingDown className="mr-1 h-3 w-3" />abaixo da meta</>
                    }
                  </span>
                </div>
                <Progress value={statsSimulados.mediaAcerto} className="h-1.5" />
                <p className="text-xs text-muted-foreground">Meta: {META}% para aprovação</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Simulados Realizados</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{statsSimulados.totalSimulados}</div>
                <p className="mt-1 text-xs text-muted-foreground">{statsSimulados.aprovados} acima de {META}%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Maior Nota</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {statsSimulados.maiorTotal > 0 ? `${statsSimulados.maiorNota}/${statsSimulados.maiorTotal}` : "—"}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {statsSimulados.maiorTotal > 0 ? `${statsSimulados.maiorPercentual}% de aproveitamento` : "Nenhum simulado realizado"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Aprovação</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold text-foreground">
                  {statsSimulados.totalSimulados > 0
                    ? Math.round((statsSimulados.aprovados / statsSimulados.totalSimulados) * 100)
                    : 0}%
                </div>
                <Progress
                  value={statsSimulados.totalSimulados > 0
                    ? (statsSimulados.aprovados / statsSimulados.totalSimulados) * 100
                    : 0}
                  className="h-1.5"
                />
                <p className="text-xs text-muted-foreground">{statsSimulados.aprovados} de {statsSimulados.totalSimulados} simulados</p>
              </CardContent>
            </Card>
          </div>

          {/* Evolução das Notas */}
          <Card>
            <CardHeader>
              <CardTitle>Evolução das Notas</CardTitle>
              <CardDescription>Sua performance nos simulados ao longo do tempo</CardDescription>
            </CardHeader>
            <CardContent>
              {evolutionData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] gap-3 text-muted-foreground">
                  <BookOpen className="h-8 w-8 opacity-40" />
                  <p className="text-sm">Realize simulados para ver sua evolução</p>
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={evolutionData}>
                      <defs>
                        <linearGradient id="colorNota2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="date" axisLine={false} tickLine={false} className="text-xs fill-muted-foreground" />
                      <YAxis axisLine={false} tickLine={false} className="text-xs fill-muted-foreground" domain={[0, 100]} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                        labelStyle={{ color: "var(--foreground)" }}
                        formatter={(value) => [`${value}%`, "Nota"]}
                      />
                      <ReferenceLine
                        y={META}
                        stroke="var(--muted-foreground)"
                        strokeDasharray="5 5"
                        label={{ value: `Meta ${META}%`, position: "insideTopRight", fontSize: 10, fill: "var(--muted-foreground)" }}
                      />
                      {/* linear (não monotone): com poucos pontos, a curva suavizada inventa tendência */}
                      <Area type="linear" dataKey="nota" stroke="var(--chart-1)" strokeWidth={2} fillOpacity={1} fill="url(#colorNota2)" name="Nota" dot={{ r: 3, fill: "var(--chart-1)" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Disciplinas em Risco */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>Disciplinas em Risco</CardTitle>
                  <CardDescription>Análise por disciplina baseada no seu desempenho em simulados</CardDescription>
                </div>
                {abaixoDaMetaRisco > 0 && (
                  <Badge variant="destructive" className="shrink-0">{abaixoDaMetaRisco} abaixo de {META}%</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {materiasRisco.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
                  <Target className="h-8 w-8 opacity-40" />
                  <p className="text-sm">Realize simulados para ver a análise de risco por disciplina.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {riscosVisiveis.map((m, i) => (
                    <div key={`${m.subject_id}-${i}`} className="flex items-center gap-4 rounded-lg border border-border p-3">
                      <Badge className={getRiskColor(m.taxa)}>{taxaLabel(m.taxa)}</Badge>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">{m.name}</span>
                          <span className="text-sm font-medium text-foreground">{m.taxa}%</span>
                        </div>
                        <Progress
                          value={m.taxa}
                          className={`mt-1 h-2 ${progressBarClass(m.taxa)}`}
                        />
                      </div>
                    </div>
                  ))}
                  {materiasRisco.length > LISTA_LIMITE && (
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setShowAllRisco(v => !v)}>
                      {showAllRisco ? "Mostrar menos" : `Ver mais ${materiasRisco.length - LISTA_LIMITE} disciplinas`}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── ABA QUESTÕES ─── */}
        <TabsContent value="questoes" className="mt-6 space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Resolvidas</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{statsQuestoes.total.toLocaleString("pt-BR")}</div>
                <p className="mt-1 text-xs text-muted-foreground">{statsQuestoes.acertos} acertos · {statsQuestoes.erros} erros</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Taxa de Acerto</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-foreground">{statsQuestoes.taxaAcerto}%</span>
                  <span className={`flex items-center text-xs font-medium ${metaTextColor(statsQuestoes.taxaAcerto)}`}>
                    {statsQuestoes.taxaAcerto >= META
                      ? <><TrendingUp className="mr-1 h-3 w-3" />acima da meta</>
                      : <><TrendingDown className="mr-1 h-3 w-3" />abaixo da meta</>
                    }
                  </span>
                </div>
                <Progress value={statsQuestoes.taxaAcerto} className="h-1.5" />
                <p className="text-xs text-muted-foreground">Meta: {META}% para aprovação</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Acertos</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">{statsQuestoes.acertos.toLocaleString("pt-BR")}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {statsQuestoes.total > 0
                    ? `${((statsQuestoes.acertos / statsQuestoes.total) * 100).toFixed(1)}% do total respondido`
                    : "Nenhuma questão respondida"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Erros</CardTitle>
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{statsQuestoes.erros.toLocaleString("pt-BR")}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {statsQuestoes.total > 0
                    ? `${((statsQuestoes.erros / statsQuestoes.total) * 100).toFixed(1)}% do total respondido`
                    : "Nenhuma questão respondida"}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Atividade Semanal */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade Semanal</CardTitle>
              <CardDescription>Acertos e erros nos últimos 7 dias</CardDescription>
            </CardHeader>
            <CardContent>
              {weeklyData.every(d => d.questoes === 0) ? (
                <div className="flex flex-col items-center justify-center h-[300px] gap-3 text-muted-foreground">
                  <BookOpen className="h-8 w-8 opacity-40" />
                  <p className="text-sm">Nenhuma atividade nos últimos 7 dias</p>
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                      <XAxis dataKey="dia" axisLine={false} tickLine={false} className="text-xs fill-muted-foreground" />
                      <YAxis axisLine={false} tickLine={false} className="text-xs fill-muted-foreground" />
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: "8px" }}
                        labelStyle={{ color: "var(--foreground)" }}
                      />
                      <Legend />
                      <Bar dataKey="acertos" fill="var(--chart-1)" name="Acertos" stackId="a" />
                      <Bar dataKey="erros" fill="var(--chart-4)" name="Erros" stackId="a" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Desempenho por Disciplina */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle>Desempenho por Disciplina</CardTitle>
                  <CardDescription>Taxa de acerto em questões avulsas</CardDescription>
                </div>
                {abaixoDaMetaDisciplinas > 0 && (
                  <Badge variant="destructive" className="shrink-0">{abaixoDaMetaDisciplinas} abaixo de {META}%</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {desempenhoPorMateria.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-3 text-muted-foreground">
                  <BookOpen className="h-8 w-8 opacity-40" />
                  <p className="text-sm">Responda questões para ver seu desempenho por disciplina.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {disciplinasVisiveis.map((d, i) => (
                    <div key={`${d.subject_id}-${i}`} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-foreground">{d.name}</span>
                        <span className="text-muted-foreground">
                          {d.acerto}% <span className="text-xs">({d.questoes} questões)</span>
                        </span>
                      </div>
                      <Progress
                        value={d.acerto}
                        className={`h-2 ${progressBarClass(d.acerto)}`}
                      />
                    </div>
                  ))}
                  {desempenhoPorMateria.length > LISTA_LIMITE && (
                    <Button variant="ghost" size="sm" className="w-full text-muted-foreground" onClick={() => setShowAllDisciplinas(v => !v)}>
                      {showAllDisciplinas ? "Mostrar menos" : `Ver mais ${desempenhoPorMateria.length - LISTA_LIMITE} disciplinas`}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
