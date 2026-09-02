"use client"

import { useState, useEffect, use, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { getClientUser } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Kbd } from "@/components/ui/kbd"
import { ThemeToggle } from "@/components/theme-toggle"
import { BarraProgresso } from "@/components/simulado/barra-progresso"
import { MapaDaProva } from "@/components/simulado/mapa-da-prova"
import { QuestaoProva, LETRAS, type Letra } from "@/components/simulado/questao-prova"
import { agruparPorMateria, formatarRitmo } from "@/lib/simulado-prova"
import { useIsMobile } from "@/components/ui/use-mobile"
import { cn } from "@/lib/utils"
import {
  Clock, ChevronLeft, ChevronRight, CheckCircle2, Loader2,
  AlertTriangle, LayoutGrid, Eraser,
} from "lucide-react"
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

// Bandas do cronômetro. `chart-3` é o âmbar do sistema (o mesmo da questão
// marcada) — antes eram `text-orange-400`/`text-yellow-400` soltos do Tailwind,
// que não acompanham o tema e destoavam do resto da tela.
function getTimerStyle(seconds: number): string {
  if (seconds <= 10 * 60) return "text-destructive animate-pulse"
  if (seconds <= 30 * 60) return "text-destructive"
  if (seconds <= 60 * 60) return "text-chart-3"
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
  const isMobile = useIsMobile()

  const [questoes, setQuestoes] = useState<Questao[]>([])
  const [loadingQuestoes, setLoadingQuestoes] = useState(true)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [flagged, setFlagged] = useState<Set<string>>(new Set())
  const [timeRemaining, setTimeRemaining] = useState(5 * 60 * 60)
  const [showFinishDialog, setShowFinishDialog] = useState(false)
  const [showExitDialog, setShowExitDialog] = useState(false)
  const [showTimeUpDialog, setShowTimeUpDialog] = useState(false)
  const [mapaAberto, setMapaAberto] = useState(false)
  const [finalizando, setFinalizando] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  // Alternativas riscadas — a técnica de papel de eliminar o que já se descartou.
  // Chave composta `questaoId:letra`. É ANOTAÇÃO LOCAL e some ao recarregar:
  // `simulado_respostas` não tem coluna pra isso e não deveria ter, porque
  // riscar não é responder e não entra em nota nenhuma.
  const [riscadas, setRiscadas] = useState<Set<string>>(new Set())

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

  // ── Modo prova: esconde a navegação do dashboard ─────────────
  // A tela cobre a janela inteira (`fixed inset-0`), mas cobrir não basta:
  // sem isto o Tab continua alcançando a sidebar por baixo e o leitor de tela
  // anuncia "Desempenho", "Perfil" e "Agenda" no meio de uma prova cronometrada.
  // O CSS que lê este atributo está em `app/globals.css`.
  const emProva = !resultado && !modoGabarito
  useEffect(() => {
    if (!emProva) return
    document.body.dataset.modoProva = "true"
    return () => { delete document.body.dataset.modoProva }
  }, [emProva])

  const questao = questoes[currentQuestion]
  const totalQuestions = questoes.length
  const answeredCount = Object.keys(answers).length
  const semResposta = totalQuestions - answeredCount
  const blocos = agruparPorMateria(questoes, answers)
  const ritmo = formatarRitmo(timeRemaining, semResposta)

  const handleAnswer = useCallback(async (valor: string) => {
    const alvo = questoes[currentQuestion]
    if (!alvo) return

    setAnswers((prev) => ({ ...prev, [alvo.id]: valor }))
    // Responder desfaz o risco da própria alternativa: manter tachado o que
    // acabou de ser escolhido é o único estado que o desenho não sustenta.
    setRiscadas((prev) => {
      if (!prev.has(`${alvo.id}:${valor}`)) return prev
      const s = new Set(prev)
      s.delete(`${alvo.id}:${valor}`)
      return s
    })

    try {
      const res = await fetch("/api/simulados/resposta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: alvo.id, simuladoId, resposta: valor }),
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
  }, [questoes, currentQuestion, simuladoId, router])

  const toggleFlag = useCallback(() => {
    const alvo = questoes[currentQuestion]
    if (!alvo) return
    setFlagged((prev) => {
      const s = new Set(prev)
      if (s.has(alvo.id)) {
        s.delete(alvo.id)
        toast.info("Questão removida da lista de revisão")
      } else {
        s.add(alvo.id)
        toast.info("Questão adicionada à lista de revisão")
      }
      return s
    })
  }, [questoes, currentQuestion])

  const toggleRisco = useCallback((letra: string) => {
    const alvo = questoes[currentQuestion]
    if (!alvo) return
    setRiscadas((prev) => {
      const chave = `${alvo.id}:${letra}`
      const s = new Set(prev)
      if (s.has(chave)) s.delete(chave)
      else s.add(chave)
      return s
    })
  }, [questoes, currentQuestion])

  const limparRiscos = useCallback(() => {
    const alvo = questoes[currentQuestion]
    if (!alvo) return
    setRiscadas((prev) => {
      const s = new Set(prev)
      for (const letra of LETRAS) s.delete(`${alvo.id}:${letra}`)
      return s
    })
  }, [questoes, currentQuestion])

  const irPara = useCallback((indice: number) => {
    setCurrentQuestion(Math.min(Math.max(indice, 0), Math.max(questoes.length - 1, 0)))
  }, [questoes.length])

  // ── Atalhos de teclado ───────────────────────────────────────
  // Só ligam durante a prova. Ficam desligados com qualquer diálogo aberto —
  // senão "A" responderia a questão por trás do "Finalizar simulado?".
  const atalhosAtivos = emProva && !loadingQuestoes && !showFinishDialog && !showExitDialog && !showTimeUpDialog
  useEffect(() => {
    if (!atalhosAtivos) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const alvo = e.target as HTMLElement | null
      if (alvo?.closest("input, textarea, select, [contenteditable]")) return

      const tecla = e.key.toUpperCase()

      if (mapaAberto) {
        // Com o mapa aberto só o próprio M responde; o resto é do Sheet
        // (Escape fecha, Tab circula entre os botões de questão).
        if (tecla === "M") { e.preventDefault(); setMapaAberto(false) }
        return
      }

      if ((LETRAS as readonly string[]).includes(tecla)) {
        e.preventDefault()
        handleAnswer(tecla)
        return
      }
      if (tecla === "R") { e.preventDefault(); toggleFlag(); return }
      if (tecla === "M") { e.preventDefault(); setMapaAberto(true); return }
      if (e.key === "ArrowRight") { e.preventDefault(); setCurrentQuestion((p) => Math.min(p + 1, questoes.length - 1)); return }
      if (e.key === "ArrowLeft") { e.preventDefault(); setCurrentQuestion((p) => Math.max(p - 1, 0)) }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [atalhosAtivos, mapaAberto, handleAnswer, toggleFlag, questoes.length])

  const finalizarSimulado = async () => {
    setFinalizando(true)

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
  // Continua dentro do layout do dashboard, com sidebar: acabou a prova, e a
  // revisão do gabarito é justamente quando se quer ir pro Desempenho.
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

  // A partir daqui é modo prova: tela cheia, sem a navegação do app.
  if (loadingQuestoes) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!questao) return null

  const alternativas: { letra: Letra; texto: string }[] = [
    { letra: "A", texto: questao.alternativa_a },
    { letra: "B", texto: questao.alternativa_b },
    { letra: "C", texto: questao.alternativa_c },
    { letra: "D", texto: questao.alternativa_d },
  ]

  // O componente recebe só as letras riscadas DESTA questão; a página guarda
  // todas num Set único com chave composta pra não recriar objeto por questão.
  const riscadasDaQuestao = new Set(LETRAS.filter((l) => riscadas.has(`${questao.id}:${l}`)))

  const timerStyle = getTimerStyle(timeRemaining)
  const marcada = flagged.has(questao.id)
  const temRisco = riscadasDaQuestao.size > 0
  const marcadasSemResposta = [...flagged].filter((id) => !answers[id]).length

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* ── Barra superior ───────────────────────────────────── */}
      <header className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2.5 sm:px-4 lg:px-6">
        <button
          type="button"
          onClick={() => setShowExitDialog(true)}
          aria-label="Sair do simulado"
          className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Sair</span>
        </button>

        <div className="hidden h-8 w-px shrink-0 bg-border md:block" />

        <div className="hidden min-w-0 md:block">
          <h1 className="truncate text-sm font-semibold text-foreground">Simulado OAB · 1ª Fase</h1>
          <p className="truncate text-xs text-muted-foreground">
            {totalQuestions} questões · 5 horas · cronometrado
          </p>
        </div>

        {/* No celular o cabeçalho vira a identificação da questão — não sobra
            largura pro título do simulado e pra matéria ao mesmo tempo. */}
        <div className="min-w-0 md:hidden">
          <p className="font-mono text-xs text-primary tabular-nums">
            QUESTÃO {String(currentQuestion + 1).padStart(2, "0")}/{totalQuestions}
          </p>
          <p className="truncate text-xs text-muted-foreground">{questao.subject_name}</p>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <ThemeToggle />

          <button
            type="button"
            onClick={() => setMapaAberto(true)}
            aria-label="Abrir mapa da prova"
            className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-sm transition-colors hover:border-primary/40 hover:bg-muted"
          >
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            <span className="hidden text-muted-foreground lg:inline">Mapa da prova</span>
            <span className="font-mono text-xs text-primary tabular-nums">
              {answeredCount}<span className="hidden sm:inline">/{totalQuestions}</span>
            </span>
          </button>

          <div className={cn(
            "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors",
            timeRemaining <= 30 * 60
              ? "border-destructive/30 bg-destructive/10"
              : timeRemaining <= 60 * 60
                ? "border-chart-3/30 bg-chart-3/10"
                : "border-border",
          )}>
            <Clock className={cn("hidden h-4 w-4 sm:block", timerStyle)} />
            <div className="leading-tight">
              <p className={cn("font-mono text-base font-semibold tabular-nums sm:text-lg", timerStyle)}>
                {formatTime(timeRemaining)}
              </p>
              {ritmo && (
                <p className="hidden text-[0.65rem] text-muted-foreground sm:block">
                  ≈{ritmo} por questão restante
                </p>
              )}
            </div>
          </div>

          <Button
            variant="destructive"
            size="sm"
            className="hidden md:inline-flex"
            onClick={() => setShowFinishDialog(true)}
          >
            Finalizar
          </Button>
        </div>
      </header>

      {/* ── Progresso ────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border">
        <div className="hidden sm:block">
          <BarraProgresso
            questoes={questoes}
            blocos={blocos}
            respostas={answers}
            marcadas={flagged}
            atual={currentQuestion}
          />
        </div>
        {/* No celular a barra segmentada daria ~4px por questão: ruído, não
            informação. Vira progresso agregado; o estado por questão fica
            no mapa, a um toque de distância. */}
        <div
          className="h-1 w-full bg-muted sm:hidden"
          role="img"
          aria-label={`${answeredCount} de ${totalQuestions} questões respondidas`}
        >
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* ── Questão ──────────────────────────────────────────── */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <QuestaoProva
          indice={currentQuestion}
          total={totalQuestions}
          materia={questao.subject_name}
          enunciado={questao.enunciado}
          alternativas={alternativas}
          resposta={answers[questao.id]}
          riscadas={riscadasDaQuestao}
          marcada={marcada}
          onResponder={handleAnswer}
          onToggleRisco={toggleRisco}
          onToggleFlag={toggleFlag}
        />
      </div>

      {/* ── Rodapé ───────────────────────────────────────────── */}
      <footer className="flex shrink-0 items-center gap-3 border-t border-border px-3 py-2.5 sm:px-4 lg:px-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentQuestion((p) => Math.max(p - 1, 0))}
          disabled={currentQuestion === 0}
          aria-label="Questão anterior"
        >
          <ChevronLeft className="h-4 w-4 sm:mr-1" />
          <span className="hidden sm:inline">Anterior</span>
        </Button>

        {/* Atalhos declarados na tela: sem isso ninguém descobre que existem.
            Somem no celular, onde não há teclado. */}
        <div className="mx-auto hidden items-center gap-4 text-xs text-muted-foreground lg:flex">
          <span className="flex items-center gap-1.5"><Kbd>A–D</Kbd> responder</span>
          <span className="flex items-center gap-1.5"><Kbd>R</Kbd> revisão</span>
          <span className="flex items-center gap-1.5"><Kbd>M</Kbd> mapa</span>
          <span className="flex items-center gap-1.5"><Kbd>←</Kbd><Kbd>→</Kbd> navegar</span>
        </div>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={limparRiscos}
            disabled={!temRisco}
            aria-label="Limpar as alternativas riscadas desta questão"
            title="Apaga as alternativas riscadas desta questão"
          >
            <Eraser className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Limpar riscos</span>
          </Button>

          <Button
            size="sm"
            onClick={() => setCurrentQuestion((p) => Math.min(p + 1, totalQuestions - 1))}
            disabled={currentQuestion === totalQuestions - 1}
            aria-label="Próxima questão"
          >
            <span className="hidden sm:inline">Próxima</span>
            <ChevronRight className="h-4 w-4 sm:ml-1" />
          </Button>
        </div>
      </footer>

      <MapaDaProva
        aberto={mapaAberto}
        onOpenChange={setMapaAberto}
        questoes={questoes}
        blocos={blocos}
        respostas={answers}
        marcadas={flagged}
        atual={currentQuestion}
        onIr={irPara}
        onFinalizar={() => setShowFinishDialog(true)}
        mobile={isMobile}
      />

      {/* ── Sair ─────────────────────────────────────────────── */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sair do simulado?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Suas <strong className="text-foreground">{answeredCount}</strong> respostas já
                  estão salvas e você pode voltar de onde parou.
                </p>
                {/* O aviso mais importante desta tela: o tempo é do servidor e
                    não pausa. Sem isto, "Sair" parece um botão inofensivo. */}
                <p className="text-chart-3">
                  ⏱️ O cronômetro <strong>não para</strong> — as 5 horas continuam correndo.
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex gap-3">
            <Button variant="outline" onClick={() => setShowExitDialog(false)} className="flex-1">
              Continuar prova
            </Button>
            <Button variant="destructive" onClick={() => router.push("/dashboard/simulados")} className="flex-1">
              Sair mesmo assim
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Finalizar ────────────────────────────────────────── */}
      <Dialog open={showFinishDialog} onOpenChange={setShowFinishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Finalizar simulado?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Você respondeu <strong className="text-foreground">{answeredCount}</strong> de <strong className="text-foreground">{totalQuestions}</strong> questões.</p>
                {semResposta > 0 && <p className="text-destructive">⚠️ {semResposta} questões sem resposta.</p>}
                {marcadasSemResposta > 0 && (
                  <p className="text-chart-3">🚩 {marcadasSemResposta} questão(ões) marcada(s) para revisão ainda sem resposta.</p>
                )}
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex gap-3">
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
            <DialogTitle className="flex items-center gap-2 text-chart-3">
              <AlertTriangle className="h-5 w-5" /> Tempo esgotado!
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>O tempo de 5 horas chegou ao fim. Você respondeu <strong className="text-foreground">{answeredCount}</strong> de <strong className="text-foreground">{totalQuestions}</strong> questões.</p>
                <p>Suas respostas já foram salvas. Clique abaixo para ver o resultado.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 flex gap-3">
            <Button onClick={finalizarSimulado} disabled={finalizando} className="flex-1">
              {finalizando ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizando...</> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Ver resultado</>}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
