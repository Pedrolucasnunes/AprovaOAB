"use client"

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Search, SlidersHorizontal, CheckCircle2, XCircle,
  Loader2, ChevronLeft, Maximize2, BookOpen, PenLine, RotateCcw,
} from "lucide-react"
import {
  ParedeLimiteCard, ParedeLimiteInline,
} from "@/components/dashboard/limite-diario"
import { supabase } from "@/lib/supabase"
import { getClientUser } from "@/lib/auth-client"
import { type DiasNoTeto } from "@/lib/limite-diario"

type Modo = "resolver" | "explorar"

interface Questao {
  id: string
  enunciado: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  dificuldade: string
  banca: string
  ano: number
  subject_id: string
  topic_id: string
  subject_name: string
  topic_name: string
}

interface Filtros {
  subjects: { id: string; name: string }[]
  dificuldades: string[]
  bancas: string[]
}

interface Pagination {
  total: number
  page: number
  limit: number
  totalPages: number
}

interface RespostaState {
  selecionada: string
  correta: string | null
  acertou: boolean | null
  explicacao: string | null
  verificada: boolean
  verificando: boolean
}

const emptyResposta: RespostaState = {
  selecionada: "",
  correta: null,
  acertou: null,
  explicacao: null,
  verificada: false,
  verificando: false,
}

function getDificuldadeColor(dificuldade: string) {
  switch (dificuldade?.toLowerCase()) {
    case "fácil": case "facil":
      return "bg-primary/15 text-primary border-primary/20"
    case "média": case "media": case "médio": case "medio":
      return "bg-yellow-500/15 text-yellow-500 border-yellow-500/20"
    case "difícil": case "dificil":
      return "bg-destructive/15 text-destructive border-destructive/20"
    default:
      return "bg-muted text-muted-foreground"
  }
}

function LetraBox({ letra, estado }: {
  letra: string
  estado: "neutro" | "selecionado" | "correto" | "errado" | "desbotado"
}) {
  const classes = {
    neutro: "bg-muted text-muted-foreground",
    selecionado: "bg-primary/20 text-primary",
    correto: "bg-primary text-primary-foreground",
    errado: "bg-destructive text-destructive-foreground",
    desbotado: "bg-muted/50 text-muted-foreground/50",
  }
  return (
    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${classes[estado]}`}>
      {letra}
    </span>
  )
}

function Alternativas({ questao, resposta, onSelecionar, compact }: {
  questao: Questao
  resposta: RespostaState
  onSelecionar: (letra: string) => void
  compact?: boolean
}) {
  const { selecionada, correta, verificada, acertou, explicacao } = resposta
  const alternativas = [
    { letra: "A", texto: questao.alternativa_a },
    { letra: "B", texto: questao.alternativa_b },
    { letra: "C", texto: questao.alternativa_c },
    { letra: "D", texto: questao.alternativa_d },
  ]

  const getEstado = (letra: string): "neutro" | "selecionado" | "correto" | "errado" | "desbotado" => {
    if (!verificada) return selecionada === letra ? "selecionado" : "neutro"
    if (letra === correta) return "correto"
    if (letra === selecionada) return "errado"
    return "desbotado"
  }

  return (
    <div className="space-y-2">
      {alternativas.map((alt) => {
        const estado = getEstado(alt.letra)
        const isCorreto = verificada && alt.letra === correta
        const isErrado = verificada && alt.letra === selecionada && alt.letra !== correta
        const isDesbotado = verificada && alt.letra !== correta && alt.letra !== selecionada

        return (
          <button
            key={alt.letra}
            disabled={verificada}
            onClick={() => !verificada && onSelecionar(alt.letra)}
            className={`w-full flex items-start gap-3 rounded-lg border ${compact ? "px-3 py-2.5" : "px-4 py-3"} text-left transition-all duration-150 cursor-pointer disabled:cursor-default ${
              isCorreto
                ? "border-primary/40 bg-primary/8"
                : isErrado
                ? "border-destructive/40 bg-destructive/8"
                : isDesbotado
                ? "border-border/50 opacity-50"
                : selecionada === alt.letra
                ? "border-primary/50 bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-muted/40 cursor-pointer"
            }`}
          >
            <LetraBox letra={alt.letra} estado={estado} />
            <span className={`flex-1 text-sm leading-relaxed ${isDesbotado ? "text-muted-foreground" : "text-foreground"}`}>
              {alt.texto}
            </span>
            {isCorreto && <CheckCircle2 className="h-4 w-4 shrink-0 text-primary mt-0.5" />}
            {isErrado && <XCircle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />}
          </button>
        )
      })}

      {verificada && (
        <div className={`mt-1 rounded-lg border p-4 ${acertou ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
          <p className={`text-sm font-semibold ${acertou ? "text-primary" : "text-destructive"}`}>
            Gabarito {correta} — {acertou ? "Correto" : "Incorreto"}
          </p>
          {explicacao && (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{explicacao}</p>
          )}
        </div>
      )}
    </div>
  )
}

function QuestaoCardExplorar({ questao, resposta, onSelecionar, onVerificar, onReset, aviso }: {
  questao: Questao
  resposta: RespostaState
  onSelecionar: (letra: string) => void
  onVerificar: () => void
  onReset: () => void
  aviso?: ReactNode
}) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/15 text-primary border border-primary/20 font-medium">
              {questao.subject_name}
            </Badge>
            {questao.topic_name && (
              <span className="text-xs text-muted-foreground">{questao.topic_name}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {questao.dificuldade && (
              <Badge className={`border text-xs ${getDificuldadeColor(questao.dificuldade)}`}>
                {questao.dificuldade}
              </Badge>
            )}
            {(questao.banca || questao.ano) && (
              <span className="font-mono text-xs text-muted-foreground">
                {[questao.banca, questao.ano].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
        </div>

        <div className="px-4 pt-4 pb-3">
          <p className="text-sm leading-relaxed text-foreground">{questao.enunciado}</p>
        </div>

        <div className="space-y-2 px-4 pb-4">
          <Alternativas
            questao={questao}
            resposta={resposta}
            onSelecionar={onSelecionar}
            compact
          />
          {aviso}
          <div className="flex justify-end pt-1">
            {!resposta.verificada ? (
              <Button
                size="sm"
                onClick={onVerificar}
                disabled={!resposta.selecionada || resposta.verificando}
              >
                {resposta.verificando
                  ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Verificando...</>
                  : "Verificar resposta"
                }
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={onReset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Tentar novamente
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function QuestoesPage() {
  const [userId, setUserId] = useState<string>("")
  const [plano, setPlano] = useState<string>("free")
  const [questoesHoje, setQuestoesHoje] = useState<number>(0)
  // Matéria mais fraca (top-1 do risco) — personaliza a copy do limite diário.
  const [materiaFraca, setMateriaFraca] = useState<string | null>(null)
  // Teto e frequência vêm do servidor (app_config + question_attempts): o
  // trigger do banco já lia `app_config`, e o 10 fixo aqui mentiria assim que o
  // valor mudasse. O 10 sobrou só como estado inicial até a primeira resposta.
  const [limiteFree, setLimiteFree] = useState(10)
  const [diasNoTeto, setDiasNoTeto] = useState<DiasNoTeto>({ total: 0, ultimos7: 0 })
  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [filtros, setFiltros] = useState<Filtros>({ subjects: [], dificuldades: [], bancas: [] })
  const [pagination, setPagination] = useState<Pagination>({ total: 0, page: 1, limit: 10, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingFiltros, setLoadingFiltros] = useState(true)
  const [showFiltrosAvancados, setShowFiltrosAvancados] = useState(false)

  const [searchTerm, setSearchTerm] = useState("")
  const [subjectId, setSubjectId] = useState("todas")
  const [dificuldade, setDificuldade] = useState("todas")
  const [banca, setBanca] = useState("todas")
  const [page, setPage] = useState(1)

  const [modo, setModo] = useState<Modo>("resolver")
  const [modoFoco, setModoFoco] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [pendingLastIndex, setPendingLastIndex] = useState(false)
  const [respostas, setRespostas] = useState<Record<string, RespostaState>>({})
  const [limiteAtingido, setLimiteAtingido] = useState(false)
  const [trialUsed, setTrialUsed] = useState(false)

  const trialDisponivel =
    process.env.NEXT_PUBLIC_TRIAL_ENABLED === "true" && plano === "free" && !trialUsed

  // Tempo por questão — alimenta o filtro de baixa confiança (< 3s) no cálculo
  // do desempenho por matéria. Mapa por id, não um timestamp só: no modo
  // "explorar" várias questões ficam na tela ao mesmo tempo e são respondidas
  // em qualquer ordem.
  //
  // Mede da EXIBIÇÃO até confirmar, não da primeira alternativa clicada. Quem
  // lê 60s e então clica-e-confirma em 1s é leitor cuidadoso, não clicador —
  // medir a partir do clique inverteria o sinal. No "explorar" isso infla o
  // tempo de quem rola até a questão 7 depois de 2 min na página, e inflar é o
  // lado seguro do erro: o filtro só descarta ABAIXO do piso.
  const abertaEm = useRef<Record<string, number>>({})

  useEffect(() => {
    const agora = performance.now()
    abertaEm.current = Object.fromEntries(questoes.map((q) => [q.id, agora]))
  }, [questoes])

  // No modo "resolver" a questão aparece uma de cada vez: reestampa na troca.
  useEffect(() => {
    if (modo !== "resolver") return
    const q = questoes[currentIndex]
    if (q) abertaEm.current[q.id] = performance.now()
  }, [modo, currentIndex, questoes])

  // Contador e plano via /api/dashboard — mesma fonte que o backend usa para
  // aplicar o limite (meia-noite de São Paulo, exclui questões de diagnóstico).
  const refreshStatus = useCallback(async () => {
    const res = await fetch("/api/dashboard")
    const data = await res.json()
    if (!res.ok) return null
    setPlano(data.plano ?? "free")
    setQuestoesHoje(data.questoesHoje ?? 0)
    if (typeof data.limiteDiario === "number") setLimiteFree(data.limiteDiario)
    if (data.diasNoTeto) setDiasNoTeto(data.diasNoTeto)
    setTrialUsed(data.trialUsed ?? false)
    setMateriaFraca(data.materiasRisco?.[0]?.nome ?? null)
    return data
  }, [])

  useEffect(() => {
    async function init() {
      const user = await getClientUser()
      if (user) {
        setUserId(user.id)
        await refreshStatus()
      }
      const res = await fetch("/api/questions/filtros")
      const data = await res.json()
      setFiltros(data)
      setLoadingFiltros(false)
    }
    init()
  }, [refreshStatus])

  const fetchQuestoes = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("page", String(page))
    if (subjectId !== "todas") params.set("subjectId", subjectId)
    if (dificuldade !== "todas") params.set("dificuldade", dificuldade)
    if (banca !== "todas") params.set("banca", banca)
    if (searchTerm.trim()) params.set("busca", searchTerm.trim())

    const res = await fetch(`/api/questions?${params.toString()}`)
    const data = await res.json()
    setQuestoes(data.questions ?? [])
    setPagination(data.pagination ?? { total: 0, page: 1, limit: 10, totalPages: 0 })
    setLoading(false)
  }, [page, subjectId, dificuldade, banca, searchTerm])

  useEffect(() => { fetchQuestoes() }, [fetchQuestoes])

  useEffect(() => {
    if (pendingLastIndex && questoes.length > 0) {
      setCurrentIndex(questoes.length - 1)
      setPendingLastIndex(false)
    }
  }, [questoes, pendingLastIndex])

  const handleLimparFiltros = () => {
    setSubjectId("todas")
    setDificuldade("todas")
    setBanca("todas")
    setSearchTerm("")
    setPage(1)
    setCurrentIndex(0)
  }

  const handleModo = (novoModo: Modo) => {
    setModo(novoModo)
    setPage(1)
    setCurrentIndex(0)
    setModoFoco(false)
  }

  const temFiltrosAtivos = subjectId !== "todas" || dificuldade !== "todas" || banca !== "todas"

  // --- Resolver mode ---
  const questaoAtual = questoes[currentIndex]
  const globalQuestionNumber = (page - 1) * 10 + currentIndex + 1
  const respostaAtual: RespostaState = questaoAtual
    ? (respostas[questaoAtual.id] ?? emptyResposta)
    : emptyResposta
  const isFirst = globalQuestionNumber <= 1
  const isLast = globalQuestionNumber >= pagination.total

  const handleSelecionar = (questaoId: string, letra: string) => {
    setRespostas((prev) => {
      const current = prev[questaoId] ?? emptyResposta
      if (current.verificada) return prev
      return { ...prev, [questaoId]: { ...current, selecionada: letra } }
    })
  }

  const handleVerificar = async (questaoId: string, selecionada: string, aposRefresh = false) => {
    if (!userId || !selecionada) return

    setRespostas((prev) => ({
      ...prev,
      [questaoId]: { ...(prev[questaoId] ?? emptyResposta), verificando: true },
    }))

    const res = await fetch("/api/simulados/resposta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        questionId: questaoId,
        simuladoId: null,
        resposta: selecionada,
        time_spent_ms: abertaEm.current[questaoId]
          ? Math.round(performance.now() - abertaEm.current[questaoId])
          : null,
      }),
    })
    const data = await res.json()

    if (res.status === 403 && data.limiteDiario) {
      // Re-consulta o servidor antes de assumir o bloqueio: se o plano mudou no
      // meio da sessão (upgrade), destrava e reenvia sem exigir reload da página.
      const status = aposRefresh ? null : await refreshStatus()
      if (status && (status.plano ?? "free") !== "free") {
        return handleVerificar(questaoId, selecionada, true)
      }
      setLimiteAtingido(true)
      setQuestoesHoje((prev) => Math.max(prev, limiteFree))
      setRespostas((prev) => ({
        ...prev,
        [questaoId]: { ...(prev[questaoId] ?? emptyResposta), verificando: false },
      }))
      return
    }

    const { data: qData } = await supabase
      .from("questions").select("explicacao").eq("id", questaoId).single()

    setQuestoesHoje((prev) => prev + 1)

    setRespostas((prev) => ({
      ...prev,
      [questaoId]: {
        ...(prev[questaoId] ?? emptyResposta),
        verificando: false,
        verificada: true,
        acertou: data.acertou,
        correta: data.resposta_correta,
        explicacao: qData?.explicacao ?? null,
      },
    }))
  }

  const handleReset = (questaoId: string) => {
    setRespostas((prev) => ({ ...prev, [questaoId]: emptyResposta }))
  }

  const handleAnterior = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    } else if (page > 1) {
      setPendingLastIndex(true)
      setPage((p) => p - 1)
    }
  }

  const handleProxima = () => {
    if (currentIndex < questoes.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else if (page < pagination.totalPages) {
      setCurrentIndex(0)
      setPage((p) => p + 1)
    }
  }

  // Feedback no ponto do clique quando o limite bloqueia a resposta — o banner
  // do topo não é visível no modo foco (overlay) nem explica que nada foi salvo.
  const avisoLimite = limiteAtingido && plano === "free" ? (
    <ParedeLimiteInline
      limite={limiteFree}
      diasNoTeto={diasNoTeto}
      trialDisponivel={trialDisponivel}
      origem="questoes_inline"
      materiaFraca={materiaFraca}
      avisoNaoSalvo
    />
  ) : null

  const NavBar = () => (
    <div>
      {avisoLimite}
      <div className="flex items-center justify-between pt-2">
        <Button variant="ghost" onClick={handleAnterior} disabled={isFirst || loading} className="gap-1.5">
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>
        {!respostaAtual.verificada ? (
          <Button
            onClick={() => handleVerificar(questaoAtual.id, respostaAtual.selecionada)}
            disabled={!respostaAtual.selecionada || respostaAtual.verificando}
          >
            {respostaAtual.verificando
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verificando...</>
              : "Responder"
            }
          </Button>
        ) : (
          <Button onClick={handleProxima} disabled={isLast || loading}>
            Próxima →
          </Button>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Modo Foco overlay */}
      {modoFoco && questaoAtual && (
        <div className="fixed inset-0 z-50 bg-background overflow-y-auto">
          <div className="flex justify-end p-4 sm:p-6">
            <button
              onClick={() => setModoFoco(false)}
              className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sair do modo foco
            </button>
          </div>
          <div className="mx-auto max-w-2xl px-4 pb-12">
            <p className="mb-6 text-center text-xs font-semibold tracking-widest uppercase text-muted-foreground">
              {questaoAtual.subject_name}
              {questaoAtual.topic_name && ` · ${questaoAtual.topic_name}`}
            </p>
            <p className="mb-8 text-center text-lg font-medium leading-relaxed text-foreground">
              {questaoAtual.enunciado}
            </p>
            <Alternativas
              questao={questaoAtual}
              resposta={respostaAtual}
              onSelecionar={(l) => handleSelecionar(questaoAtual.id, l)}
            />
            <NavBar />
          </div>
        </div>
      )}

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Explore questões</h1>
            <p className="text-sm text-muted-foreground">Estudo livre. Você no controle.</p>
          </div>
          {modo === "resolver" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModoFoco(true)}
              disabled={!questaoAtual || loading}
              className="shrink-0 gap-2"
            >
              <Maximize2 className="h-4 w-4" />
              Modo foco
            </Button>
          )}
        </div>

        {/* Tabs: Resolver / Explorar */}
        <div className="flex gap-2">
          <button
            onClick={() => handleModo("resolver")}
            className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              modo === "resolver"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            <PenLine className="h-3.5 w-3.5" />
            Resolver questões
          </button>
          <button
            onClick={() => handleModo("explorar")}
            className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              modo === "explorar"
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-transparent text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Explorar questões
          </button>
        </div>

        {/* Busca + botão filtros avançados */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por tema ou palavra-chave..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); setCurrentIndex(0) }}
              className="pl-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFiltrosAvancados(!showFiltrosAvancados)}
            className={temFiltrosAtivos ? "border-primary/50 text-primary" : ""}
          >
            <SlidersHorizontal className="mr-2 h-4 w-4" />
            Filtros
            {temFiltrosAtivos && (
              <span className="ml-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground font-bold">
                {(subjectId !== "todas" ? 1 : 0) + (dificuldade !== "todas" ? 1 : 0) + (banca !== "todas" ? 1 : 0)}
              </span>
            )}
          </Button>
        </div>

        {/* Filtros avançados */}
        {showFiltrosAvancados && (
          <Card>
            <CardContent className="p-4">
              <div className="grid gap-4 sm:grid-cols-4">
                <div className="space-y-2">
                  <Label>Disciplina</Label>
                  <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setPage(1); setCurrentIndex(0) }}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {loadingFiltros
                        ? <SelectItem value="_loading" disabled>Carregando...</SelectItem>
                        : filtros.subjects.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))
                      }
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Dificuldade</Label>
                  <Select value={dificuldade} onValueChange={(v) => { setDificuldade(v); setPage(1); setCurrentIndex(0) }}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {filtros.dificuldades.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Banca</Label>
                  <Select value={banca} onValueChange={(v) => { setBanca(v); setPage(1); setCurrentIndex(0) }}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Todas" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todas">Todas</SelectItem>
                      {filtros.bancas.map((b) => (
                        <SelectItem key={b} value={b}>{b}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={handleLimparFiltros} className="w-full">
                    Limpar filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Banner de limite diário / próximo passo */}
        {plano === "free" && questoesHoje >= limiteFree ? (
          /* Sem `sessao` de propósito: aqui não existe sessão fechada — a lista
             é paginada e `respostas` só tem a página atual. Resumir isso daria
             "3 questões — 1 certa" pra quem respondeu 10 hoje. A copy cai no
             texto que sai de `questoesHoje`, que é verdadeiro. */
          <ParedeLimiteCard
            limite={limiteFree}
            diasNoTeto={diasNoTeto}
            trialDisponivel={trialDisponivel}
            origem="questoes_banner"
            materiaFraca={materiaFraca}
            secundario="calendario"
          />
        ) : plano === "free" ? (
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
            <span className="text-muted-foreground">
              {questoesHoje}/{limiteFree} questões respondidas hoje (plano Grátis)
            </span>
          </div>
        ) : null}

        {/* Conteúdo */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : questoes.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">Nenhuma questão encontrada com esses filtros.</p>
          </div>
        ) : modo === "resolver" && questaoAtual ? (
          /* ── Modo Resolver: uma questão por vez ── */
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-foreground">
                    Questão {globalQuestionNumber} de {pagination.total}
                  </span>
                  {questaoAtual.dificuldade && (
                    <Badge className={`border text-xs ${getDificuldadeColor(questaoAtual.dificuldade)}`}>
                      {questaoAtual.dificuldade}
                    </Badge>
                  )}
                  {(questaoAtual.banca || questaoAtual.ano) && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {[questaoAtual.banca, questaoAtual.ano].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {questaoAtual.subject_name}
                  {questaoAtual.topic_name && ` · ${questaoAtual.topic_name}`}
                </span>
              </div>

              <div className="px-4 pt-4 pb-3">
                <p className="text-sm leading-relaxed text-foreground">{questaoAtual.enunciado}</p>
              </div>

              <div className="px-4 pb-4">
                <Alternativas
                  questao={questaoAtual}
                  resposta={respostaAtual}
                  onSelecionar={(l) => handleSelecionar(questaoAtual.id, l)}
                  compact
                />
                <NavBar />
              </div>
            </CardContent>
          </Card>
        ) : modo === "explorar" ? (
          /* ── Modo Explorar: lista de questões ── */
          <>
            <div className="space-y-4">
              {questoes.map((questao) => {
                const r = respostas[questao.id] ?? emptyResposta
                return (
                  <QuestaoCardExplorar
                    key={questao.id}
                    questao={questao}
                    resposta={r}
                    onSelecionar={(l) => handleSelecionar(questao.id, l)}
                    onVerificar={() => handleVerificar(questao.id, r.selecionada)}
                    onReset={() => handleReset(questao.id)}
                    aviso={avisoLimite}
                  />
                )
              })}
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 1 || loading}
                >
                  Anterior
                </Button>
                <span className="px-4 text-sm text-muted-foreground">
                  Página {pagination.page} de {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page === pagination.totalPages || loading}
                >
                  Próximo
                </Button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </>
  )
}
