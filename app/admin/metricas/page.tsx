"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, TrendingDown, Users, Lock, Repeat, Target, ArrowRight } from "lucide-react"
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { toast } from "sonner"
import { formatarDataBrasil } from "@/lib/datas"

// Painel de ativação. Duas regras desta tela:
//
// 1. Nenhum número aparece sem dizer o que ele cobre. Métrica retroativa
//    (question_attempts, diagnostic_sessions) vale desde sempre; prospectiva
//    (user_events) vale desde o deploy da Fase D. Sem esse rótulo, "0 aberturas
//    do Módulo 2" lê como fracasso quando significa "a feature subiu ontem".
//
// 2. Cores de gráfico saem de `var(--primary)` etc. — as variáveis do tema são
//    HEX (ver app/globals.css), não triplets HSL. `hsl(var(--primary))` monta
//    `hsl(#10B981)`, que é inválido, e o recharts cai pra preto.

type Natureza = "retroativa" | "prospectiva"

const COR_FREE = "var(--destructive)"
const COR_PRO = "var(--primary)"
const COR_NEUTRA = "var(--chart-2)"

interface Metricas {
  janelaDias: number
  eventosDesde: string | null
  totalUsuarios: number
  descartadasPorTempo: number
  respostasDiagnostico: number
  funil: {
    natureza: Natureza
    maduros: number
    imaturos: number
    iniciaramM1: number
    concluiramM1: number
    fizeramTreino: number
    handoff: number
  }
  abandono: {
    natureza: Natureza
    histograma: { posicao: number; sessoes: number }[]
    emAndamento: number
    totalSessoes: number
    tamanhoModulo: number
  }
  modulo2: {
    natureza: Natureza
    aberturasPorEvento: number
    usuariosComRespostaM2: number
    concluiram: number
  }
  retorno: {
    natureza: Natureza
    voltaramOutroDia: number
    ativos: number
    distribuicaoDias: { dias: number; usuarios: number }[]
  }
  limiteDiario: {
    natureza: Natureza
    atingiramTeto: { free: number; pro: number }
    frequenciaFree: { dias: number; usuarios: number }[]
    distribuicaoPorDia: { faixa: string; free: number; pro: number }[]
    barrados: { total: number; usuarios: number; porMotivo: Record<string, number> }
    limite: number
    mediaProAcimaDoTeto: number | null
  }
}

const JANELAS = [7, 14, 30]

/** Selo de natureza: texto discreto, não chip colorido — ele contextualiza, não compete. */
function Selo({ natureza, desde }: { natureza: Natureza; desde?: string | null }) {
  const texto =
    natureza === "retroativa"
      ? "histórico completo"
      : desde
        ? `desde ${formatarDataBrasil(desde)}`
        : "aguardando 1º evento"
  return (
    <span className="shrink-0 text-[11px] font-normal text-muted-foreground/70">{texto}</span>
  )
}

function pct(n: number, d: number): string {
  if (d === 0) return "—"
  return `${Math.round((n / d) * 100)}%`
}

const TOOLTIP_STYLE = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
} as const

/** Número grande com legenda — a unidade de leitura rápida da tela. */
function Kpi({
  label,
  valor,
  sub,
  destaque,
}: {
  label: string
  valor: string | number
  sub?: string
  destaque?: boolean
}) {
  return (
    <div
      className={`rounded-xl border p-4 ${
        destaque ? "border-primary/40 bg-primary/5" : "border-border bg-card"
      }`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${destaque ? "text-primary" : "text-foreground"}`}>
        {valor}
      </p>
      {sub && <p className="mt-1 text-xs leading-snug text-muted-foreground">{sub}</p>}
    </div>
  )
}

function LinhaFunil({
  label,
  valor,
  base,
  baseLabel,
  cor = COR_PRO,
}: {
  label: string
  valor: number
  base: number
  baseLabel: string
  cor?: string
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-foreground">{label}</span>
        <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
          <span className="text-lg font-semibold text-foreground">{valor}</span>
          <span className="mx-1">/</span>
          {base}
          <span className="ml-2 font-sans text-xs">({pct(valor, base)})</span>
        </span>
      </div>
      <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${base > 0 ? Math.min((valor / base) * 100, 100) : 0}%`,
            background: cor,
          }}
        />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground/70">{baseLabel}</p>
    </div>
  )
}

export default function MetricasPage() {
  const [data, setData] = useState<Metricas | null>(null)
  const [loading, setLoading] = useState(true)
  const [janela, setJanela] = useState(30)

  const carregar = useCallback(async (dias: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/metricas?janela=${dias}`)
      if (!res.ok) throw new Error()
      setData(await res.json())
    } catch {
      toast.error("Não foi possível carregar as métricas.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    carregar(janela)
  }, [carregar, janela])

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }
  if (!data) return null

  const { funil, abandono, modulo2, retorno, limiteDiario: ld } = data

  // Histograma com o eixo do MÓDULO INTEIRO: uma barra em Q1 de 16 mostra
  // "param na primeira"; a mesma barra sozinha num eixo de 1 slot não diz nada.
  const mapaAbandono = new Map(abandono.histograma.map((h) => [h.posicao, h.sessoes]))
  const dadosAbandono = Array.from({ length: abandono.tamanhoModulo }, (_, i) => ({
    label: `${i + 1}`,
    sessoes: mapaAbandono.get(i) ?? 0,
  }))

  const dadosRetorno = retorno.distribuicaoDias.map((d) => ({
    label: d.dias >= 5 ? "5+" : String(d.dias),
    usuarios: d.usuarios,
  }))

  return (
    <div className="space-y-6">
      {/* ── Cabeçalho ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ativação</h1>
          <p className="text-sm text-muted-foreground">
            Coorte de {data.janelaDias} dias a partir do cadastro · {data.totalUsuarios} usuários
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          {JANELAS.map((d) => (
            <Button
              key={d}
              size="sm"
              variant={janela === d ? "default" : "ghost"}
              onClick={() => setJanela(d)}
              disabled={loading}
              className="min-w-[52px]"
            >
              {d} dias
            </Button>
          ))}
        </div>
      </div>

      {/* ── KPIs: o estado do produto em 5 segundos ────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Concluíram o diagnóstico"
          valor={pct(funil.concluiramM1, funil.maduros)}
          sub={`${funil.concluiramM1} de ${funil.maduros} com janela cumprida`}
        />
        <Kpi
          label="Handoff pro treino"
          valor={pct(funil.handoff, funil.concluiramM1)}
          sub={`${funil.handoff} dos ${funil.concluiramM1} que concluíram`}
        />
        <Kpi
          label="Voltaram em outro dia"
          valor={pct(retorno.voltaramOutroDia, retorno.ativos)}
          sub={`${retorno.voltaramOutroDia} de ${retorno.ativos} com atividade`}
        />
        <Kpi
          destaque
          label={`Pro faz por dia (teto free: ${ld.limite})`}
          valor={ld.mediaProAcimaDoTeto ?? "—"}
          sub="média nos dias em que passam do teto — demanda reprimida"
        />
      </div>

      {/* ── O card que decide preço ────────────────────────────────────── */}
      <Card className="border-primary/30">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Limite de {ld.limite}/dia
              </CardTitle>
              <CardDescription className="mt-1">
                Só respostas de treino — o diagnóstico é isento do limite.
              </CardDescription>
            </div>
            <Selo natureza={ld.natureza} />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
              <p className="text-xs text-muted-foreground">Free bateram o teto</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-destructive">
                {ld.atingiramTeto.free}
              </p>
              <p className="text-xs text-muted-foreground">chegaram a {ld.limite} num dia</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">Pro passaram de {ld.limite}</p>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
                {ld.atingiramTeto.pro}
              </p>
              <p className="text-xs text-muted-foreground">pra eles não é teto, é uso</p>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-muted-foreground">Foram barrados</p>
                <Selo natureza="prospectiva" desde={data.eventosDesde} />
              </div>
              <p className="mt-0.5 text-2xl font-bold tabular-nums text-foreground">
                {ld.barrados.total}
              </p>
              <p className="text-xs text-muted-foreground">
                tentativas recusadas · quis a {ld.limite + 1}ª
              </p>
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-foreground">Questões por dia, quem estava ativo</p>
              <p className="text-xs text-muted-foreground">dias-usuário</p>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ld.distribuicaoPorDia} margin={{ top: 18, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="faixa" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                  <Bar dataKey="free" name="Free" fill={COR_FREE} radius={[4, 4, 0, 0]} maxBarSize={64}>
                    <LabelList dataKey="free" position="top" style={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  </Bar>
                  <Bar dataKey="pro" name="Pro" fill={COR_PRO} radius={[4, 4, 0, 0]} maxBarSize={64}>
                    <LabelList dataKey="pro" position="top" style={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Free empilhado em <strong className="text-foreground">{ld.limite}+</strong> com a faixa
              anterior vazia é teto batendo, não saciedade — ninguém para por vontade própria em 8 ou 9.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Quantos dias no teto (free)</p>
              {ld.frequenciaFree.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ninguém bateu o teto ainda.</p>
              ) : (
                <ul className="space-y-1.5">
                  {ld.frequenciaFree.map((f) => (
                    <li key={f.dias} className="flex items-center gap-3 text-sm">
                      <span className="w-16 shrink-0 text-muted-foreground">
                        {f.dias} {f.dias === 1 ? "dia" : "dias"}
                      </span>
                      <div className="h-4 flex-1 overflow-hidden rounded bg-muted">
                        <div
                          className="h-full rounded bg-destructive"
                          style={{
                            width: `${(f.usuarios / Math.max(...ld.frequenciaFree.map((x) => x.usuarios))) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="w-6 shrink-0 text-right font-mono tabular-nums text-foreground">
                        {f.usuarios}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
              <p className="text-xs font-medium text-foreground">Ressalva de leitura</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                <span className="font-mono">users.plano</span> é o estado <em>atual</em>. Quem hoje é
                Pro mas bateu o teto quando era free entra classificado como Pro. Sem histórico de
                plano não há como separar — e estimar seria inventar.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Funil ──────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Funil de ativação
              </CardTitle>
              <CardDescription className="mt-1">
                {funil.maduros} usuários já viveram os {data.janelaDias} dias.
                {funil.imaturos > 0 && ` ${funil.imaturos} recente(s) fora da conta.`}
              </CardDescription>
            </div>
            <Selo natureza={funil.natureza} />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <LinhaFunil
            label="Iniciaram o Módulo 1"
            valor={funil.iniciaramM1}
            base={funil.maduros}
            baseLabel="sobre a base madura"
          />
          <LinhaFunil
            label="Concluíram o Módulo 1"
            valor={funil.concluiramM1}
            base={funil.maduros}
            baseLabel="sobre a base madura"
          />
          <LinhaFunil
            label="Fizeram algum treino"
            valor={funil.fizeramTreino}
            base={funil.maduros}
            baseLabel="sobre a base madura"
          />
          <div className="border-t border-border pt-5">
            <LinhaFunil
              label="Handoff: concluíram e treinaram"
              valor={funil.handoff}
              base={funil.concluiramM1}
              baseLabel="sobre quem CONCLUIU, não sobre a base — mede se o diagnóstico entrega o usuário pro produto"
              cor={COR_NEUTRA}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Onde param ───────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-primary" />
                  Onde param
                </CardTitle>
                <CardDescription className="mt-1">
                  {abandono.emAndamento} de {abandono.totalSessoes} sessões paradas no meio. Decide se
                  o módulo deve encolher.
                </CardDescription>
              </div>
              <Selo natureza={abandono.natureza} />
            </div>
          </CardHeader>
          <CardContent>
            {abandono.emAndamento === 0 ? (
              <p className="py-16 text-center text-sm text-muted-foreground">
                Nenhuma sessão parada no meio.
              </p>
            ) : (
              <>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dadosAbandono} margin={{ top: 16, right: 4, left: -28, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} interval={0} />
                      <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={TOOLTIP_STYLE}
                        cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                        formatter={(v: number) => [v, "sessões paradas"]}
                        labelFormatter={(l) => `Questão ${l}`}
                      />
                      <Bar dataKey="sessoes" fill={COR_FREE} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Eixo = as {abandono.tamanhoModulo} questões do módulo. Massa à esquerda significa
                  abandono na entrada; espalhada, cansaço.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── Retorno ──────────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Repeat className="h-5 w-5 text-primary" />
                  Dias de atividade
                </CardTitle>
                <CardDescription className="mt-1">
                  {retorno.voltaramOutroDia} de {retorno.ativos} voltaram em outro dia (
                  {pct(retorno.voltaramOutroDia, retorno.ativos)}). Fuso de Brasília.
                </CardDescription>
              </div>
              <Selo natureza={retorno.natureza} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosRetorno} margin={{ top: 18, right: 8, left: -28, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                    formatter={(v: number) => [v, "usuários"]}
                    labelFormatter={(l) => `${l} dia(s) de atividade`}
                  />
                  <Bar dataKey="usuarios" fill={COR_NEUTRA} radius={[4, 4, 0, 0]} maxBarSize={72}>
                    <LabelList dataKey="usuarios" position="top" style={{ fontSize: 11, fill: "var(--muted-foreground)" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              A barra de 1 dia é quem experimentou e não voltou — é o alvo do trabalho de ativação.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Módulo 2, compacto ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Target className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-medium text-foreground">Módulo 2</p>
              <p className="text-xs text-muted-foreground">
                12 matérias restantes, 1 questão cada. Subiu com a Fase C2 — número baixo aqui é idade
                da feature, não rejeição.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums text-foreground">
                {modulo2.usuariosComRespostaM2}
              </p>
              <p className="text-xs text-muted-foreground">responderam</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground/50" />
            <div className="text-center">
              <p className="text-2xl font-bold tabular-nums text-foreground">{modulo2.concluiram}</p>
              <p className="text-xs text-muted-foreground">concluíram</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs leading-relaxed text-muted-foreground/70">
        Respostas enviadas em menos de 3s são descartadas de todas as contagens —{" "}
        {data.descartadasPorTempo} de {data.respostasDiagnostico} respostas de diagnóstico até agora.
        Definições em <span className="font-mono">lib/services/metricas.ts</span>; a baseline
        congelada da Fase 0 segue em <span className="font-mono">scripts/ativacao.mjs</span>.
      </p>
    </div>
  )
}
