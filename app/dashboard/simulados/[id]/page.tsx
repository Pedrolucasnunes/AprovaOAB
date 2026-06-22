"use client"

import { useState, useEffect, use, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getClientUser } from "@/lib/auth-client"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Clock, ChevronLeft, ChevronRight, Flag, CheckCircle2, Loader2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface Questao {
  id: string
  attemptId: string
  enunciado: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  subject_name: string
  topic_name: string
  resposta_usuario?: string | null
}

interface Resultado {
  acertos: number
  erros: number
  percentual: number
  total: number
  gabarito: {
    question_id: string
    enunciado: string
    resposta_usuario: string
    resposta_correta: string
    acertou: boolean
    subject_name: string
  }[]
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

function getTimerStyle(seconds: number): string {
  if (seconds <= 10 * 60) return "text-destructive animate-pulse"
  if (seconds <= 30 * 60) return "text-orange-400"
  if (seconds <= 60 * 60) return "text-yellow-400"
  return "text-foreground"
}

const AVISOS = [
  { tempo: 60 * 60, msg: "⏰ 1 hora restante no simulado!" },
  { tempo: 30 * 60, msg: "⚠️ 30 minutos restantes!" },
  { tempo: 10 * 60, msg: "🚨 Apenas 10 minutos restantes!" },
  { tempo: 5 * 60, msg: "🔴 5 minutos restantes — conclua suas respostas!" },
]

export default function SimuladoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: simuladoId } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const modoGabarito = searchParams.get("gabarito") === "true"

  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [loadingQuestoes, setLoadingQuestoes] = useState(true)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [flagged, setFlagged] = useState<Set<string>>(new Set())
  const [timeRemaining, setTimeRemaining] = useState(5 * 60 * 60)
  const [showFinishDialog, setShowFinishDialog] = useState(false)
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const avisosDisparados = useRef<Set<number>>(new Set())
  const timeRemainingRef = useRef(5 * 60 * 60)

  useEffect(() => {
    async function init() {
      const user = await getClientUser()
      if (!user) { router.push("/login"); return }

      // Modo gabarito: carrega resultado diretamente sem montar o simulado
      if (modoGabarito) {
        const res = await fetch(`/api/simulados/${simuladoId}/gabarito`)
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error ?? "Erro ao carregar gabarito")
          router.push("/dashboard/simulados")
          return
        }
        setResultado(data)
        setLoadingQuestoes(false)
        return
      }

      // Busca tempo restante do servidor + carrega questões em paralelo
      const [tempoRes, questoesRes] = await Promise.all([
        fetch(`/api/simulados/${simuladoId}`, { cache: "no-store" }),
        fetch(`/api/simulados/${simuladoId}/questoes`),
      ])

      const tempoData = await tempoRes.json()
      const questoesData = await questoesRes.json()

      if (!tempoRes.ok) {
        toast.error(tempoData.error ?? "Erro ao iniciar simulado")
        router.push("/dashboard/simulados")
        return
      }

      if (tempoData.finalizado) {
        toast.info("Este simulado já foi finalizado. Veja o gabarito.")
        router.push(`/dashboard/simulados/${simuladoId}?gabarito=true`)
        return
      }

      if (!questoesRes.ok) {
        toast.error(questoesData.error ?? "Erro ao carregar questões")
        return
      }

      const tempo = tempoData.tempo_restante_segundos ?? 5 * 60 * 60
      setTimeRemaining(tempo)
      timeRemainingRef.current = tempo

      const listaQuestoes: Questao[] = questoesData.questions ?? []
      setQuestoes(listaQuestoes)

      // Recupera as respostas já salvas — progresso persiste ao reabrir o simulado
      const respostasSalvas: Record<string, string> = {}
      for (const q of listaQuestoes) {
        if (q.resposta_usuario) respostasSalvas[q.id] = q.resposta_usuario
      }
      setAnswers(respostasSalvas)

      setLoadingQuestoes(false)

      if (tempoData.expired) {
        setShowTimeUpDialog(true)
      }
    }
    init()
  }, [simuladoId, modoGabarito])

  // Re-sincroniza tempo com servidor a cada 30s pra evitar drift
  useEffect(() => {
    if (resultado || modoGabarito || loadingQuestoes) return

    const sync = setInterval(async () => {
      try {
        const res = await fetch(`/api/simulados/${simuladoId}`, { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (typeof data.tempo_restante_segundos === "number") {
          const serverTime = data.tempo_restante_segundos
          // Ajusta só se drift > 3s (evita "pulos" visuais a cada 30s)
          if (Math.abs(serverTime - timeRemainingRef.current) > 3) {
            setTimeRemaining(serverTime)
            timeRemainingRef.current = serverTime
          }
        }
      } catch {
        // silent — o decremento client-side continua
      }
    }, 30000)

    return () => clearInterval(sync)
  }, [simuladoId, resultado, modoGabarito, loadingQuestoes])

  useEffect(() => {
    if (resultado) return

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        const next = prev - 1
        timeRemainingRef.current = next

        AVISOS.forEach(({ tempo, msg }) => {
          if (next === tempo && !avisosDisparados.current.has(tempo)) {
            avisosDisparados.current.add(tempo)
            toast.warning(msg, { duration: 6000 })
          }
        })

        if (next <= 0) {
          clearInterval(timer)
          setShowTimeUpDialog(true)
          return 0
        }

        return next
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [resultado])

  const questao = questoes[currentQuestion]
  const totalQuestions = questoes.length
  const answeredCount = Object.keys(answers).length
  const flaggedList = questoes.filter((q) => flagged.has(q.id))

  const handleAnswer = async (valor: string) => {
    if (!questao) return

    setAnswers((prev) => ({ ...prev, [questao.id]: valor }))

    try {
      const res = await fetch("/api/simulados/resposta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: questao.id, simuladoId, resposta: valor }),
      })

      if (!res.ok) {
        const data = await res.json()
        if (data.expired) {
          toast.error("Tempo do simulado esgotado")
          setShowTimeUpDialog(true)
          setTimeRemaining(0)
          timeRemainingRef.current = 0
          return
        }
        if (data.finalizado) {
          toast.info("Simulado já finalizado")
          router.push(`/dashboard/simulados/${simuladoId}?gabarito=true`)
          return
        }
        console.error("[handleAnswer] Erro:", data.error)
        toast.error("Erro ao salvar resposta")
        return
      }
    } catch (err) {
      console.error("[handleAnswer] Erro inesperado:", err)
      toast.error("Erro ao salvar resposta")
      return
    }

  }

  const toggleFlag = () => {
    if (!questao) return
    setFlagged((prev) => {
      const s = new Set(prev)
      if (s.has(questao.id)) {
        s.delete(questao.id)
        toast.info("Questão removida da lista de revisão")
      } else {
        s.add(questao.id)
        toast.info("Questão adicionada à lista de revisão")
      }
      return s
    })
  }

  const finalizarSimulado = async () => {
    setFinalizando(true)

    // ✅ Sem userId no body
    const res = await fetch("/api/simulados/finalizar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ simuladoId }),
    })

    const data = await res.json()
    setFinalizando(false)
    setShowFinishDialog(false)
    setShowTimeUpDialog(false)

    if (!res.ok) {
      toast.error(data.error ?? "Erro ao finalizar simulado")
      return
    }

    toast.success("Simulado finalizado!")
    setResultado(data)
  }

  // ── Tela de resultado ────────────────────────────────────────
  if (resultado) {
    return (
      <div className="space-y-6 pb-10">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-foreground">
            {modoGabarito ? "Gabarito do Simulado" : "Simulado Concluído!"}
          </h1>
          <p className="text-muted-foreground">
            {modoGabarito ? "Veja as respostas corretas e seu desempenho" : "Confira seu resultado abaixo"}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto sm:grid-cols-4">
          {[
            { label: "Acertos", value: resultado.acertos, className: "text-foreground" },
            { label: "Erros", value: resultado.erros, className: "text-destructive" },
            { label: "Aproveitamento", value: `${resultado.percentual}%`, className: "text-primary" },
            { label: "Respondidas", value: resultado.total, className: "text-foreground" },
          ].map((item) => (
            <div key={item.label} className="rounded-lg border border-border p-4 text-center">
              <p className={`text-2xl font-bold ${item.className}`}>{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
        <div className={`max-w-lg mx-auto rounded-lg border p-4 text-center text-sm font-medium ${resultado.percentual >= 50 ? "border-primary/30 bg-primary/5 text-primary" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
          {resultado.percentual >= 50 ? "✓ Aprovado — você atingiu a nota mínima da OAB (50%)" : "✗ Reprovado — a nota mínima da OAB é 50%"}
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-foreground">Gabarito ({resultado.total} questões respondidas)</h2>
          {(resultado.gabarito ?? []).map((item, index) => (
            <div key={`${item.question_id}-${index}`} className={`rounded-lg border p-4 space-y-2 ${item.acertou ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Q{index + 1}</span>
                  <Badge variant="secondary" className="text-xs">{item.subject_name}</Badge>
                </div>
                <Badge variant={item.acertou ? "default" : "destructive"} className={item.acertou ? "bg-primary shrink-0" : "shrink-0"}>
                  {item.acertou ? "✓ Acerto" : "✗ Erro"}
                </Badge>
              </div>
              <p className="text-sm text-foreground leading-relaxed line-clamp-2">{item.enunciado}</p>
              <div className="flex gap-4 text-xs">
                <span className="text-muted-foreground">
                  Sua resposta: <span className={item.acertou ? "text-primary font-medium" : "text-destructive font-medium"}>{item.resposta_usuario}</span>
                </span>
                {!item.acertou && (
                  <span className="text-muted-foreground">
                    Resposta correta: <span className="text-primary font-medium">{item.resposta_correta}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center">
          <Button onClick={() => router.push("/dashboard/simulados")}>Voltar para Simulados</Button>
        </div>
      </div>
    )
  }

  if (loadingQuestoes) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!questao) return null

  const alternativas = [
    { letra: "A", texto: questao.alternativa_a },
    { letra: "B", texto: questao.alternativa_b },
    { letra: "C", texto: questao.alternativa_c },
    { letra: "D", texto: questao.alternativa_d },
  ]

  const timerStyle = getTimerStyle(timeRemaining)

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-base font-semibold text-foreground sm:text-lg">Simulado OAB</h1>
          <p className="text-xs text-muted-foreground sm:text-sm">Questão {currentQuestion + 1} de {totalQuestions}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 border transition-colors ${timeRemaining <= 10 * 60 ? "bg-destructive/10 border-destructive/30"
            : timeRemaining <= 30 * 60 ? "bg-orange-500/10 border-orange-500/30"
              : "bg-secondary border-transparent"
            }`}>
            <Clock className={`h-3 w-3 sm:h-4 sm:w-4 ${timerStyle}`} />
            <span className={`font-mono text-base font-semibold sm:text-lg ${timerStyle}`}>
              {formatTime(timeRemaining)}
            </span>
          </div>
          <Button variant="destructive" size="sm" onClick={() => setShowFinishDialog(true)}>
            Finalizar
          </Button>
        </div>
      </div>

      <div className="py-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>{answeredCount} de {totalQuestions} respondidas</span>
          <span>{totalQuestions > 0 ? ((answeredCount / totalQuestions) * 100).toFixed(0) : 0}%</span>
        </div>
        <Progress value={totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0} className="h-2" />
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <Card>
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <Badge variant="secondary">{questao.subject_name}</Badge>
                <Button variant={flagged.has(questao.id) ? "default" : "ghost"} size="sm" onClick={toggleFlag}>
                  <Flag className="h-4 w-4 mr-1" />
                  {flagged.has(questao.id) ? "Marcada" : "Marcar para revisão"}
                </Button>
              </div>
              <p className="mb-6 text-foreground leading-relaxed">{questao.enunciado}</p>
              <RadioGroup value={answers[questao.id] || ""} onValueChange={handleAnswer} className="space-y-3">
                {alternativas.map((alt) => (
                  <div key={alt.letra} className={`flex items-start gap-3 rounded-lg border p-4 transition-colors ${answers[questao.id] === alt.letra ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    }`}>
                    <RadioGroupItem value={alt.letra} id={`alt-${alt.letra}`} className="mt-0.5" />
                    <Label htmlFor={`alt-${alt.letra}`} className="flex-1 cursor-pointer text-foreground">
                      <span className="font-medium">{alt.letra})</span> {alt.texto}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              <div className="mt-6 flex items-center justify-between">
                <Button variant="outline" onClick={() => setCurrentQuestion((p) => p - 1)} disabled={currentQuestion === 0}>
                  <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
                </Button>
                <Button onClick={() => setCurrentQuestion((p) => p + 1)} disabled={currentQuestion === totalQuestions - 1}>
                  Próxima <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="hidden lg:flex flex-col gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="mb-4 font-medium text-foreground">Navegação</h3>
                <div className="grid grid-cols-5 gap-2">
                  {questoes.map((q, index) => (
                    <button key={q.id} onClick={() => setCurrentQuestion(index)}
                      className={`flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold transition-all duration-150 active:scale-95 ${
                        currentQuestion === index
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : answers[q.id] && flagged.has(q.id)
                          ? "bg-primary/25 text-primary ring-1 ring-yellow-500/50 hover:bg-primary/35"
                          : answers[q.id]
                          ? "bg-primary/20 text-primary hover:bg-primary/30"
                          : flagged.has(q.id)
                          ? "bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/30 hover:bg-yellow-500/30"
                          : "bg-muted text-foreground hover:bg-primary/15 hover:text-primary"
                      }`}>
                      {index + 1}
                    </button>
                  ))}
                </div>
                <div className="mt-4 space-y-2 text-xs">
                  <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-primary" /><span className="text-muted-foreground">Atual</span></div>
                  <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-primary/20" /><span className="text-muted-foreground">Respondida</span></div>
                  <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-yellow-500/20 ring-1 ring-yellow-500/30" /><span className="text-muted-foreground">Marcada para revisão</span></div>
                  <div className="flex items-center gap-2"><div className="h-3 w-3 rounded bg-muted" /><span className="text-muted-foreground">Não respondida</span></div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    <Flag className="h-4 w-4 text-yellow-500" />
                    Lista de Revisão
                  </h3>
                  <Badge variant="secondary">{flaggedList.length}</Badge>
                </div>
                {flaggedList.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nenhuma questão marcada ainda. Use o botão{" "}
                    <span className="font-medium text-foreground">"Marcar para revisão"</span>{" "}
                    nas questões que quiser revisar antes de finalizar.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                    {flaggedList.map((q) => {
                      const index = questoes.findIndex((x) => x.id === q.id)
                      return (
                        <button key={q.id} onClick={() => setCurrentQuestion(index)}
                          className="w-full text-left rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3 hover:bg-yellow-500/10 transition-colors">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-xs font-medium text-yellow-500">Q{index + 1}</span>
                            <Badge variant="secondary" className="text-xs">{q.subject_name}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">{q.enunciado}</p>
                        </button>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar simulado?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Você respondeu <strong className="text-foreground">{answeredCount}</strong> de <strong className="text-foreground">{totalQuestions}</strong> questões.</p>
                {answeredCount < totalQuestions && <p className="text-orange-400">⚠️ {totalQuestions - answeredCount} questões sem resposta.</p>}
                {flaggedList.filter(q => !answers[q.id]).length > 0 && (
                  <p className="text-yellow-500">🚩 {flaggedList.filter(q => !answers[q.id]).length} questão(ões) marcada(s) para revisão ainda sem resposta.</p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <Button variant="outline" onClick={() => setShowFinishDialog(false)} className="flex-1">Continuar</Button>
            <Button onClick={finalizarSimulado} disabled={finalizando} className="flex-1">
              {finalizando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizando...</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Finalizar</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showTimeUpDialog} onOpenChange={() => {}}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-orange-400">
              <AlertTriangle className="h-5 w-5" /> Tempo esgotado!
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>O tempo de 5 horas chegou ao fim. Você respondeu <strong className="text-foreground">{answeredCount}</strong> de <strong className="text-foreground">{totalQuestions}</strong> questões.</p>
                <p>Suas respostas já foram salvas. Clique abaixo para ver o resultado.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-2">
            <Button onClick={finalizarSimulado} disabled={finalizando} className="flex-1">
              {finalizando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizando...</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Ver resultado</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}