"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, TrendingDown, Users, Lock, Repeat, Target } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { toast } from "sonner"
import { formatarDataBrasil } from "@/lib/datas"

// Painel de ativação. A regra desta tela: NENHUM número aparece sem dizer o que
// ele cobre. Métrica retroativa (question_attempts, diagnostic_sessions) vale
// desde sempre; métrica prospectiva (user_events) vale desde o deploy da Fase D.
// Sem esse rótulo, "0 aberturas do Módulo 2" lê como fracasso do produto quando
// significa "a instrumentação começou ontem".

type Natureza = "retroativa" | "prospectiva"

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

function SeloNatureza({ natureza, desde }: { natureza: Natureza; desde?: string | null }) {
  if (natureza === "retroativa") {
    return (
      <Badge variant="secondary" className="font-normal">
        histórico completo
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="font-normal text-muted-foreground">
      {desde ? `desde ${formatarDataBrasil(desde)}` : "aguardando primeiro evento"}
    </Badge>
  )
}

function pct(n: number, d: number): string {
  if (d === 0) return "—"
  return `${Math.round((n / d) * 100)}%`
}

/** Linha de funil: valor absoluto + % sobre o denominador declarado. */
function LinhaFunil({ label, valor, base, nota }: { label: string; valor: number; base: number; nota?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-foreground">{label}</span>
        <span className="font-mono text-sm font-semibold text-foreground">
          {valor} <span className="text-xs font-normal text-muted-foreground">({pct(valor, base)})</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${base > 0 ? Math.min((valor / base) * 100, 100) : 0}%` }}
        />
      </div>
      {nota && <p className="mt-1 text-xs text-muted-foreground">{nota}</p>}
    </div>
  )
}

export default function MetricasPage() {
  const [data, setData] = useState<Metricas | null>(null)
  const [loading, setLoading] = useState(true)
  const [janela, setJanela] = useState(7)

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
  const totalNoTeto = ld.atingiramTeto.free + ld.atingiramTeto.pro

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Ativação</h1>
          <p className="text-sm text-muted-foreground">
            {data.totalUsuarios} usuários (admins fora). Respostas em menos de 3s são descartadas de
            todas as contagens — hoje {data.descartadasPorTempo} de {data.respostasDiagnostico} do
            diagnóstico.
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
            >
              {d}d
            </Button>
          ))}
        </div>
      </div>

      {/* ── O card que decide preço ─────────────────────────────────────── */}
      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" />
              Limite de {ld.limite}/dia
            </CardTitle>
            <SeloNatureza natureza={ld.natureza} />
          </div>
          <CardDescription>
            Só respostas de treino — o diagnóstico é isento do limite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Free que bateram o teto</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {ld.atingiramTeto.free}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  de {data.totalUsuarios}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">chegaram a {ld.limite} num dia</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Pro que passaram de {ld.limite}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{ld.atingiramTeto.pro}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                pra eles {ld.limite} não é teto, é uso
              </p>
            </div>
            <div className="rounded-lg border border-primary/40 bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground">Média do Pro nesses dias</p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {ld.mediaProAcimaDoTeto ?? "—"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                questões/dia sem teto — a melhor estimativa de demanda reprimida
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              Questões por dia-usuário ativo
            </p>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ld.distribuicaoPorDia}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="faixa" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Bar dataKey="free" name="Free" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pro" name="Pro" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Free empilhado na faixa <strong>{ld.limite}+</strong> é teto batendo, não saciedade: se
              a faixa imediatamente anterior está vazia, ninguém está parando por vontade própria.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">
                Com que frequência (free)
              </p>
              {ld.frequenciaFree.length === 0 ? (
                <p className="text-sm text-muted-foreground">Ninguém bateu o teto ainda.</p>
              ) : (
                <ul className="space-y-1 text-sm">
                  {ld.frequenciaFree.map((f) => (
                    <li key={f.dias} className="flex justify-between text-muted-foreground">
                      <span>
                        {f.dias} {f.dias === 1 ? "dia" : "dias"} no teto
                      </span>
                      <span className="font-mono text-foreground">
                        {f.usuarios} {f.usuarios === 1 ? "usuário" : "usuários"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">Foram barrados</p>
                <SeloNatureza natureza="prospectiva" desde={data.eventosDesde} />
              </div>
              <p className="text-2xl font-bold text-foreground">{ld.barrados.total}</p>
              <p className="text-xs text-muted-foreground">
                tentativas recusadas, de {ld.barrados.usuarios}{" "}
                {ld.barrados.usuarios === 1 ? "usuário" : "usuários"}. &quot;Chegou ao teto&quot; é
                histórico; &quot;quis a {ld.limite + 1}ª&quot; só o evento sabe.
              </p>
              {Object.keys(ld.barrados.porMotivo).length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  {Object.entries(ld.barrados.porMotivo).map(([motivo, n]) => (
                    <li key={motivo}>
                      <span className="font-mono">{motivo}</span>: {n}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <p className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Ressalva:</strong> `users.plano` é o estado{" "}
            <em>atual</em>. Quem hoje é Pro mas bateu o teto quando era free entra classificado como
            Pro. Sem histórico de plano não há como separar — e estimar seria inventar.
          </p>
        </CardContent>
      </Card>

      {/* ── Funil de ativação ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Funil, {data.janelaDias} dias do cadastro
            </CardTitle>
            <SeloNatureza natureza={funil.natureza} />
          </div>
          <CardDescription>
            Base: {funil.maduros} usuários que já viveram a janela inteira.
            {funil.imaturos > 0 &&
              ` ${funil.imaturos} cadastro(s) recente(s) fora da conta — voltam quando completarem ${data.janelaDias} dias.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LinhaFunil label="Iniciaram o Módulo 1" valor={funil.iniciaramM1} base={funil.maduros} />
          <LinhaFunil label="Concluíram o Módulo 1" valor={funil.concluiramM1} base={funil.maduros} />
          <LinhaFunil label="Fizeram algum treino" valor={funil.fizeramTreino} base={funil.maduros} />
          <LinhaFunil
            label="Handoff: concluíram e treinaram"
            valor={funil.handoff}
            base={funil.concluiramM1}
            nota={`% sobre quem concluiu (${funil.concluiramM1}), não sobre a base — é o que mede se o diagnóstico entrega o usuário pro produto.`}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Onde abandonam ────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-primary" />
                Onde param
              </CardTitle>
              <SeloNatureza natureza={abandono.natureza} />
            </div>
            <CardDescription>
              {abandono.emAndamento} de {abandono.totalSessoes} sessões em andamento. É o dado que
              decide se o módulo deve encolher.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {abandono.histograma.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhuma sessão parada no meio.
              </p>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={abandono.histograma.map((h) => ({ ...h, label: `Q${h.posicao + 1}` }))}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis dataKey="label" className="text-xs" tickLine={false} axisLine={false} />
                    <YAxis className="text-xs" tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                    />
                    <Bar dataKey="sessoes" name="Sessões paradas" radius={[4, 4, 0, 0]}>
                      {abandono.histograma.map((_, i) => (
                        <Cell key={i} fill="hsl(var(--destructive))" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Retorno ───────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <Repeat className="h-5 w-5 text-primary" />
                Voltaram em outro dia
              </CardTitle>
              <SeloNatureza natureza={retorno.natureza} />
            </div>
            <CardDescription>
              {retorno.voltaramOutroDia} de {retorno.ativos} usuários com atividade (
              {pct(retorno.voltaramOutroDia, retorno.ativos)}). Dias bucketizados no fuso de
              Brasília.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={retorno.distribuicaoDias.map((d) => ({
                    ...d,
                    label: d.dias >= 5 ? "5+ dias" : `${d.dias} dia${d.dias === 1 ? "" : "s"}`,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                  <XAxis dataKey="label" className="text-xs" tickLine={false} axisLine={false} />
                  <YAxis className="text-xs" tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Bar dataKey="usuarios" name="Usuários" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Módulo 2 ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Módulo 2
            </CardTitle>
            <SeloNatureza natureza={modulo2.natureza} />
          </div>
          <CardDescription>
            As 12 matérias restantes, 1 questão cada. Subiu junto com a Fase C2 — número baixo aqui
            é idade da feature, não rejeição.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Responderam alguma do M2</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{modulo2.usuariosComRespostaM2}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground">Concluíram o M2</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{modulo2.concluiram}</p>
            </div>
            <div className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-1.5">
                <p className="text-xs text-muted-foreground">Aberturas</p>
                <SeloNatureza natureza="prospectiva" desde={data.eventosDesde} />
              </div>
              <p className="mt-1 text-2xl font-bold text-foreground">{modulo2.aberturasPorEvento}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        {totalNoTeto > 0 && (
          <>
            Definições em <span className="font-mono">lib/services/metricas.ts</span>.{" "}
          </>
        )}
        A baseline congelada da Fase 0 continua em{" "}
        <span className="font-mono">scripts/ativacao.mjs</span> — esta página é o painel vivo, aquele
        script é o retrato de comparação.
      </p>
    </div>
  )
}
