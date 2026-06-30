"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sparkles, Check, X } from "lucide-react"

type Alt = "A" | "B" | "C" | "D"

interface Question {
  id: string
  enunciado: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  subject_id: string
  subject_name: string
}

interface FeedbackState {
  correta: Alt
  acertou: boolean
  explicacao: string | null
}

export default function DiagnosticoInicialPage() {
  const router = useRouter()
  const [questions, setQuestions] = useState<Question[]>([])
  const [idx, setIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [selecionada, setSelecionada] = useState<Alt | null>(null)
  const [primeiraEscolha, setPrimeiraEscolha] = useState<Alt | null>(null)
  const [feedback, setFeedback] = useState<FeedbackState | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const startedAtRef = useRef<number>(0)
  const submittingRef = useRef(false)

  useEffect(() => {
    fetch("/api/diagnostico/gerar")
      .then((r) => r.json().then((json) => ({ status: r.status, json })))
      .then(({ status, json }) => {
        if (status === 400 && json.error === "ONBOARDING_REQUIRED") {
          router.replace("/dashboard?onboarding=true")
          return
        }
        if (status === 409 && json.error === "DIAGNOSTIC_ALREADY_DONE") {
          router.replace("/dashboard/diagnostico-inicial/resultado")
          return
        }
        if (json.error || !json.questions || json.questions.length === 0) {
          setLoadError(json.error ?? "Não foi possível carregar as questões.")
          setLoading(false)
          return
        }
        setQuestions(json.questions)
        setLoading(false)
        startedAtRef.current = performance.now()
      })
      .catch(() => {
        setLoadError("Erro ao carregar diagnóstico.")
        setLoading(false)
      })
  }, [router])

  function selecionar(alt: Alt) {
    if (feedback) return
    if (primeiraEscolha === null) setPrimeiraEscolha(alt)
    setSelecionada(alt)
  }

  async function confirmar() {
    if (submittingRef.current || !selecionada || feedback) return
    submittingRef.current = true
    setSubmitting(true)
    const timeSpent = Math.round(performance.now() - startedAtRef.current)
    const q = questions[idx]
    const changedAnswer = primeiraEscolha !== null && primeiraEscolha !== selecionada

    try {
      const res = await fetch("/api/diagnostico/responder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question_id: q.id,
          resposta: selecionada,
          time_spent_ms: timeSpent,
          changed_answer: changedAnswer,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        return
      }
      setFeedback({
        correta: json.correta,
        acertou: json.acertou,
        explicacao: json.explicacao,
      })
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  function proxima() {
    if (idx + 1 >= questions.length) {
      router.replace("/dashboard/diagnostico-inicial/resultado")
      return
    }
    setIdx(idx + 1)
    setSelecionada(null)
    setPrimeiraEscolha(null)
    setFeedback(null)
    startedAtRef.current = performance.now()
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center">
          <Sparkles className="mx-auto h-8 w-8 animate-pulse text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Preparando suas questões...</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="max-w-md text-center space-y-4 px-4">
          <p className="text-destructive">{loadError}</p>
          <Button onClick={() => router.replace("/dashboard")}>Voltar ao dashboard</Button>
        </div>
      </div>
    )
  }

  const q = questions[idx]
  const progress = ((idx + (feedback ? 1 : 0)) / questions.length) * 100
  const alternativas: { letra: Alt; texto: string }[] = [
    { letra: "A", texto: q.alternativa_a },
    { letra: "B", texto: q.alternativa_b },
    { letra: "C", texto: q.alternativa_c },
    { letra: "D", texto: q.alternativa_d },
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {/* Header com progresso */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3 w-3" />
              Análise inicial · Questão {idx + 1} de {questions.length}
            </span>
            <span className="text-xs text-muted-foreground">{q.subject_name}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Analisando seu padrão...
          </p>
        </div>

        {/* Enunciado */}
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
            {q.enunciado}
          </p>
        </div>

        {/* Alternativas */}
        <div className="mt-4 space-y-2">
          {alternativas.map(({ letra, texto }) => {
            const isSelecionada = selecionada === letra
            const isCorreta = feedback?.correta === letra
            const isErrada = feedback && isSelecionada && !feedback.acertou

            let borderClasses = "border-border hover:border-primary/40"
            if (feedback) {
              if (isCorreta) borderClasses = "border-primary bg-primary/10"
              else if (isErrada) borderClasses = "border-destructive bg-destructive/10"
              else if (isSelecionada) borderClasses = "border-border"
              else borderClasses = "border-border opacity-60"
            } else if (isSelecionada) {
              borderClasses = "border-primary bg-primary/5"
            }

            return (
              <button
                key={letra}
                type="button"
                onClick={() => selecionar(letra)}
                disabled={!!feedback}
                className={`w-full text-left rounded-lg border p-3 transition-colors flex items-start gap-3 ${
                  feedback ? "cursor-default" : "cursor-pointer"
                } ${borderClasses}`}
              >
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-xs font-bold ${
                  isCorreta
                    ? "bg-primary text-primary-foreground"
                    : isErrada
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-muted text-foreground"
                }`}>
                  {feedback && isCorreta
                    ? <Check className="h-3.5 w-3.5" />
                    : feedback && isErrada
                      ? <X className="h-3.5 w-3.5" />
                      : letra}
                </span>
                <span className="text-sm leading-relaxed text-foreground">{texto}</span>
              </button>
            )
          })}
        </div>

        {/* Explicação após resposta */}
        {feedback?.explicacao && (
          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
              Explicação
            </p>
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
              {feedback.explicacao}
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-6">
          {!feedback ? (
            <Button
              className="w-full"
              size="lg"
              disabled={!selecionada || submitting}
              onClick={confirmar}
            >
              {submitting ? "Enviando..." : "Confirmar resposta"}
            </Button>
          ) : (
            <Button className="w-full" size="lg" onClick={proxima}>
              {idx + 1 >= questions.length ? "Ver análise inicial" : "Próxima questão"}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
