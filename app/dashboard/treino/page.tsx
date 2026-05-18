"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { RadioGroupItem as AltRadio } from "@/components/ui/radio-group"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dumbbell, Target, Lightbulb, Play, TrendingUp, Sparkles,
  ChevronLeft, ChevronRight, CheckCircle2, XCircle, Loader2, X, AlertTriangle
} from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

const treinoOptions = [
  { value: "5",  label: "5",  description: "Sessão focada (5-8 min)" },
  { value: "10", label: "10", description: "Treino rápido (15-20 min)" },
  { value: "20", label: "20", description: "Treino médio (30-40 min)" },
  { value: "30", label: "30", description: "Treino completo (45-60 min)" },
]

const QUANTIDADES_VALIDAS = ["5", "10", "20", "30"]
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface MateriasRisco {
  subject_id: string
  nome: string
  taxa: number
  total?: number
}

interface QuestaoTreino {
  id: string
  enunciado: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  subject_name: string
}

interface TreinoAtivo {
  questoes: QuestaoTreino[]
  distribuicao: { total: number; risco: number; geral: number }
}

interface Progresso {
  totalRespondidas: number
  taxaGeralAcerto: number
}

interface ResumoTreino {
  total: number
  acertos: number
  erros: number
  percentual: number
  porMateria: { nome: string; acertos: number; total: number }[]
}

export default function TreinoPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <TreinoPageInner />
    </Suspense>
  )
}

function TreinoPageInner() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const qParam = searchParams.get("quantidade")
  const materiaParam = searchParams.get("materia")

  const initialQuantidade = qParam && QUANTIDADES_VALIDAS.includes(qParam) ? qParam : "10"

  const [quantidadeQuestoes, setQuantidadeQuestoes] = useState(initialQuantidade)
  const [materiasRisco, setMateriasRisco] = useState<MateriasRisco[]>([])
  const [progresso, setProgresso] = useState<Progresso | null>(null)
  const [loadingDados, setLoadingDados] = useState(true)
  const [materiaFiltrada, setMateriaFiltrada] = useState<{ id: string; nome: string } | null>(null)
  const [questoesHoje, setQuestoesHoje] = useState(0)
  const [plano, setPlano] = useState<"free" | "pro" | "aprovacao">("free")
  const [onboardingCompleto, setOnboardingCompleto] = useState(false)
  const [diagnosticoCompleto, setDiagnosticoCompleto] = useState(false)

  const [treinoAtivo, setTreinoAtivo] = useState<TreinoAtivo | null>(null)
  const [iniciando, setIniciando] = useState(false)
  const [confirmarEncerrar, setConfirmarEncerrar] = useState(false)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [respostas, setRespostas] = useState<Record<string, { acertou: boolean; correta: string }>>({})
  const [verificando, setVerificando] = useState(false)
  const [limiteAtingido, setLimiteAtingido] = useState(false)
  const [resumoFinal, setResumoFinal] = useState<ResumoTreino | null>(null)

  useEffect(() => {
    async function init() {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const res = await fetch("/api/dashboard")
      const data = await res.json()

      if (res.ok) {
        setMateriasRisco(data.materiasRisco ?? [])
        setProgresso(data.resumo ?? null)
        setQuestoesHoje(data.questoesHoje ?? 0)
        setPlano(data.plano ?? "free")
        setOnboardingCompleto(data.onboardingCompleto ?? false)
        setDiagnosticoCompleto(data.diagnosticoCompleto ?? false)
      }

      // Resolver matéria filtrada via query param
      if (materiaParam && UUID_REGEX.test(materiaParam)) {
        const fromRisco = (data?.materiasRisco ?? []).find((m: MateriasRisco) => m.subject_id === materiaParam)
        if (fromRisco) {
          setMateriaFiltrada({ id: fromRisco.subject_id, nome: fromRisco.nome })
        } else {
          const { data: subjectRow } = await supabase
            .from("subjects")
            .select("id, name")
            .eq("id", materiaParam)
            .single()
          if (subjectRow) {
            setMateriaFiltrada({ id: subjectRow.id, nome: subjectRow.name })
          } else {
            setMateriaFiltrada(null)
          }
        }
      } else {
        setMateriaFiltrada(null)
      }

      setLoadingDados(false)
    }
    init()
  }, [materiaParam])

  function limparFiltroMateria() {
    setMateriaFiltrada(null)
    router.replace("/dashboard/treino")
  }

  const iniciarTreino = async () => {
    setIniciando(true)

    const res = await fetch("/api/treino", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        quantidade: Number(quantidadeQuestoes),
        ...(materiaFiltrada && { materia: materiaFiltrada.id }),
      }),
    })

    const data = await res.json()
    setIniciando(false)

    if (!res.ok) { alert(data.error); return }

    if (!data.questoes || data.questoes.length === 0) {
      alert(materiaFiltrada
        ? `Não encontramos questões disponíveis em ${materiaFiltrada.nome} — você pode ter acertado todas. Tente o modo padrão.`
        : "Não encontramos questões disponíveis. Tente outra configuração.")
      return
    }

    setTreinoAtivo(data)
    setCurrentQuestion(0)
    setAnswers({})
    setRespostas({})
  }

  const handleVerificar = async () => {
    if (!treinoAtivo) return
    const questao = treinoAtivo.questoes[currentQuestion]
    const resposta = answers[questao.id]
    if (!resposta) return

    setVerificando(true)

    // ✅ Sem userId no body — API obtém do Auth
    const res = await fetch("/api/simulados/resposta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: questao.id,
        simuladoId: null,
        resposta,
      }),
    })

    const data = await res.json()
    setVerificando(false)

    if (res.status === 403 && data.limiteDiario) {
      setQuestoesHoje(10)
      setLimiteAtingido(true)
      return
    }

    if (res.ok) {
      setRespostas((prev) => ({
        ...prev,
        [questao.id]: { acertou: data.acertou, correta: data.resposta_correta },
      }))
    }
  }

  const encerrarTreino = () => {
    setTreinoAtivo(null)
    setResumoFinal(null)
    setAnswers({})
    setRespostas({})
    setCurrentQuestion(0)
    setLimiteAtingido(false)
    setMateriaFiltrada(null)
    router.replace("/dashboard/treino")

    fetch("/api/dashboard")
      .then(r => r.json())
      .then(d => { if (d.resumo) setProgresso(d.resumo) })
  }

  const concluirTreino = () => {
    if (!treinoAtivo) return

    const acertos = Object.values(respostas).filter((r) => r.acertou).length
    const total = Object.keys(respostas).length
    const erros = total - acertos
    const percentual = total > 0 ? parseFloat(((acertos / total) * 100).toFixed(1)) : 0

    const materiaMap = new Map<string, { acertos: number; total: number }>()
    for (const questao of treinoAtivo.questoes) {
      const resp = respostas[questao.id]
      if (!resp) continue
      const s = materiaMap.get(questao.subject_name) ?? { acertos: 0, total: 0 }
      s.total += 1
      if (resp.acertou) s.acertos += 1
      materiaMap.set(questao.subject_name, s)
    }

    const porMateria = Array.from(materiaMap.entries())
      .map(([nome, s]) => ({ nome, ...s }))
      .sort((a, b) => a.acertos / a.total - b.acertos / b.total)

    setTreinoAtivo(null)
    setLimiteAtingido(false)
    setResumoFinal({ total, acertos, erros, percentual, porMateria })

    fetch("/api/dashboard")
      .then(r => r.json())
      .then(d => { if (d.resumo) setProgresso(d.resumo) })
  }

  // ─── MODO TREINO ATIVO ────────────────────────────────────────
  if (treinoAtivo) {
    const questao = treinoAtivo.questoes[currentQuestion]
    const respostaAtual = answers[questao.id]
    const feedbackAtual = respostas[questao.id]
    const jaRespondida = !!feedbackAtual
    const respondidas = Object.keys(respostas).length
    const total = treinoAtivo.questoes.length

    const alternativas = [
      { letra: "A", texto: questao.alternativa_a },
      { letra: "B", texto: questao.alternativa_b },
      { letra: "C", texto: questao.alternativa_c },
      { letra: "D", texto: questao.alternativa_d },
    ]

    // Só permite voltar se a questão anterior ainda não foi verificada.
    // Evita o estado confuso onde o usuário volta mas não pode interagir com nada.
    const prevJaVerificada = currentQuestion > 0 && !!respostas[treinoAtivo.questoes[currentQuestion - 1].id]

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Treino Estratégico</h1>
            <p className="text-sm text-muted-foreground">
              Questão {currentQuestion + 1} de {total} — {respondidas} respondidas
            </p>
          </div>
          <Button variant="outline" onClick={() => setConfirmarEncerrar(true)}>
            Encerrar treino
          </Button>
        </div>

        <Progress value={(respondidas / total) * 100} className="h-2" />

        <div className="flex gap-3 text-xs text-muted-foreground">
          <span className="rounded-full bg-destructive/10 px-3 py-1 text-destructive">
            {treinoAtivo.distribuicao.risco} matérias em risco
          </span>
          <span className="rounded-full bg-secondary/15 text-secondary px-3 py-1">
            {treinoAtivo.distribuicao.geral} gerais
          </span>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="secondary">{questao.subject_name}</Badge>
            </div>

            <p className="text-foreground leading-relaxed">{questao.enunciado}</p>

            <RadioGroup
              value={respostaAtual || ""}
              onValueChange={(v) => {
                if (jaRespondida) return
                setAnswers((prev) => ({ ...prev, [questao.id]: v }))
              }}
              className="space-y-2"
            >
              {alternativas.map((alt) => (
                <div
                  key={alt.letra}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                    jaRespondida
                      ? alt.letra === feedbackAtual.correta
                        ? "border-primary bg-primary/5"
                        : respostaAtual === alt.letra
                        ? "border-destructive bg-destructive/5"
                        : "border-border"
                      : respostaAtual === alt.letra
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <AltRadio value={alt.letra} id={`alt-${alt.letra}`} className="mt-0.5" disabled={jaRespondida} />
                  <Label htmlFor={`alt-${alt.letra}`} className="flex-1 cursor-pointer text-sm text-foreground">
                    <span className="font-medium">{alt.letra})</span> {alt.texto}
                  </Label>
                  {jaRespondida && alt.letra === feedbackAtual.correta && (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                  )}
                  {jaRespondida && respostaAtual === alt.letra && alt.letra !== feedbackAtual.correta && (
                    <XCircle className="h-5 w-5 shrink-0 text-destructive" />
                  )}
                </div>
              ))}
            </RadioGroup>

            {jaRespondida && (
              <div className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex items-center gap-2">
                  {feedbackAtual.acertou
                    ? <><CheckCircle2 className="h-5 w-5 text-primary" /><span className="font-medium text-primary">Resposta correta!</span></>
                    : <><XCircle className="h-5 w-5 text-destructive" /><span className="font-medium text-destructive">Resposta incorreta — gabarito: {feedbackAtual.correta}</span></>
                  }
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestion((p) => p - 1)}
                disabled={currentQuestion === 0 || prevJaVerificada}
                title={prevJaVerificada ? "Questão anterior já respondida" : undefined}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Anterior
              </Button>

              {!jaRespondida ? (
                <Button onClick={handleVerificar} disabled={!respostaAtual || verificando}>
                  {verificando
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verificando...</>
                    : "Verificar resposta"
                  }
                </Button>
              ) : currentQuestion < total - 1 ? (
                <Button onClick={() => setCurrentQuestion((p) => p + 1)}>
                  Próxima <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={concluirTreino} className="bg-primary">
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Concluir treino
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={confirmarEncerrar} onOpenChange={setConfirmarEncerrar}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Encerrar treino?</AlertDialogTitle>
              <AlertDialogDescription>
                Seu progresso nesta sessão será perdido. As respostas já enviadas continuam salvas no seu histórico.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Continuar treinando</AlertDialogCancel>
              <AlertDialogAction onClick={encerrarTreino}>
                Encerrar mesmo assim
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={limiteAtingido}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Limite diário atingido</AlertDialogTitle>
              <AlertDialogDescription>
                Você completou suas 10 questões de hoje no plano Grátis. As respostas
                já enviadas estão salvas — veja o resultado da sessão e volte amanhã,
                ou conheça o Pro para questões ilimitadas.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel asChild>
                <Link href="/#planos">Conhecer o Pro</Link>
              </AlertDialogCancel>
              <AlertDialogAction onClick={concluirTreino}>
                Ver resultado do treino
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // ─── RESUMO FINAL ─────────────────────────────────────────────
  if (resumoFinal) {
    const veioDoDiagnostico = materiaFiltrada !== null

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {veioDoDiagnostico ? "Dia 1 do seu plano concluído" : "Treino concluído!"}
          </h1>
          <p className="text-muted-foreground">
            {veioDoDiagnostico
              ? `Você terminou as 5 questões focadas de ${materiaFiltrada.nome}. Amanhã: revisão + 5 questões mistas.`
              : "Veja o resultado desta sessão"}
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col items-center gap-3 text-center">
              {resumoFinal.percentual >= 70
                ? <CheckCircle2 className="h-12 w-12 text-primary" />
                : <XCircle className="h-12 w-12 text-destructive" />
              }
              <div>
                <p className="text-4xl font-bold text-foreground">{resumoFinal.percentual}%</p>
                <p className="text-muted-foreground mt-1">
                  {resumoFinal.acertos} de {resumoFinal.total} questões corretas
                </p>
              </div>
              <Progress value={resumoFinal.percentual} className="w-full h-3" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-primary/5 p-4 text-center">
                <p className="text-2xl font-bold text-primary">{resumoFinal.acertos}</p>
                <p className="text-sm text-muted-foreground">Acertos</p>
              </div>
              <div className="rounded-lg border border-border bg-destructive/5 p-4 text-center">
                <p className="text-2xl font-bold text-destructive">{resumoFinal.erros}</p>
                <p className="text-sm text-muted-foreground">Erros</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {resumoFinal.porMateria.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Desempenho por disciplina</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {resumoFinal.porMateria.map((m) => {
                const pct = m.total > 0 ? Math.round((m.acertos / m.total) * 100) : 0
                return (
                  <div key={m.nome} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground">{m.nome}</span>
                      <span className="font-medium text-muted-foreground">
                        {m.acertos}/{m.total} ({pct}%)
                      </span>
                    </div>
                    <Progress
                      value={pct}
                      className={`h-2 ${pct < 60 ? "[&>div]:bg-destructive" : pct < 70 ? "[&>div]:bg-warning" : ""}`}
                    />
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        {veioDoDiagnostico ? (
          <>
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Próximo passo</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Gere seu plano completo de estudos no calendário pra organizar a semana.
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button asChild className="flex-1">
                  <Link href="/dashboard/calendario">Gerar meu plano de estudos</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link href="/dashboard">Voltar pro dashboard</Link>
                </Button>
              </div>
              <Button asChild variant="ghost" size="sm" className="w-full">
                <Link href="/dashboard/diagnostico-inicial/resultado">
                  Ver minha análise inicial
                </Link>
              </Button>
            </div>

            <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-center">
              <p className="text-sm font-semibold text-foreground">
                Plano completo de 4 semanas?
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Ajuste automático e revisão dinâmica vêm com o Pro.
              </p>
              <Link
                href="/#planos"
                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Conhecer o Pro
              </Link>
            </div>
          </>
        ) : (
          <div className="flex gap-3">
            <Button className="flex-1" onClick={encerrarTreino}>
              <Play className="mr-2 h-4 w-4" /> Novo treino
            </Button>
            <Button variant="outline" asChild>
              <a href="/dashboard/desempenho">Ver desempenho completo</a>
            </Button>
          </div>
        )}
      </div>
    )
  }

  // ─── TELA INICIAL ─────────────────────────────────────────────
  const pioresmaterias = materiasRisco.slice(0, 2)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Treino Estratégico</h1>
        <p className="text-muted-foreground">Questões personalizadas baseadas no seu desempenho</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {materiaFiltrada && (
            <Alert className="border-primary/50 bg-primary/5">
              <Sparkles className="h-4 w-4 text-primary" />
              <AlertTitle className="text-primary flex items-center justify-between">
                <span>Treino guiado: {materiaFiltrada.nome}</span>
                <button
                  type="button"
                  onClick={limparFiltroMateria}
                  className="text-xs font-normal text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                  Modo padrão
                </button>
              </AlertTitle>
              <AlertDescription className="text-muted-foreground">
                Sessão focada vinda do seu diagnóstico inicial — todas as questões serão de {materiaFiltrada.nome}.
              </AlertDescription>
            </Alert>
          )}

          {!materiaFiltrada && pioresmaterias.length > 0 && (
            <Alert className="border-warning/50 bg-warning/5">
              <Lightbulb className="h-4 w-4 text-warning" />
              <AlertTitle className="text-warning">Recomendação inteligente</AlertTitle>
              <AlertDescription className="text-muted-foreground">
                Você errou várias questões sobre{" "}
                {pioresmaterias.map((m, i) => (
                  <span key={m.subject_id}>
                    <strong>{m.nome}</strong>
                    {i < pioresmaterias.length - 1 ? " e " : ""}
                  </span>
                ))}
                . Recomendamos revisar estes temas antes de continuar.
              </AlertDescription>
            </Alert>
          )}

          {(() => {
            const diagnosticoPendente = onboardingCompleto && !diagnosticoCompleto
            const limiteBatido = plano === "free" && questoesHoje >= 10

            if (diagnosticoPendente) {
              return (
                <Card>
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <Sparkles className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        Comece pelo diagnóstico
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        O treino estratégico foca nas suas matérias mais fracas — mas
                        pra isso, precisamos saber quais são. Faça o mini-diagnóstico
                        (5 questões, ~4 min) e o sistema te direciona daqui.
                      </p>
                    </div>
                    <Button asChild className="w-full sm:w-auto">
                      <Link href="/dashboard/diagnostico-inicial">
                        Fazer mini-diagnóstico
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            }

            if (limiteBatido) {
              return (
                <Card>
                  <CardContent className="p-6 text-center space-y-4">
                    <div className="flex justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                        <AlertTriangle className="h-6 w-6 text-amber-500" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">
                        Limite diário atingido
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Você completou suas 10 questões de hoje no plano Grátis.
                        Volte amanhã pra continuar o plano — ou veja seu calendário agora.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <Button asChild className="flex-1">
                        <Link href="/dashboard/calendario">Ver meu calendário</Link>
                      </Button>
                      <Button asChild variant="outline" className="flex-1">
                        <Link href="/#planos">Conhecer o Pro</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            }
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Dumbbell className="h-5 w-5 text-primary" />
                    {materiaFiltrada ? `Sessão focada: ${materiaFiltrada.nome}` : "Iniciar novo treino"}
                  </CardTitle>
                  <CardDescription>
                    {materiaFiltrada
                      ? "Todas as questões serão da matéria selecionada, evitando o que você já acertou."
                      : quantidadeQuestoes === "5"
                        ? "Sessão focada: 5 questões priorizando suas matérias com baixo desempenho."
                        : "70% das questões serão de matérias com baixo desempenho, 30% de questões gerais para manter o ritmo"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="mb-3 block text-sm font-medium">
                      Quantas questões você quer resolver?
                    </Label>
                    <RadioGroup
                      value={quantidadeQuestoes}
                      onValueChange={setQuantidadeQuestoes}
                      className="grid gap-3 grid-cols-2 sm:grid-cols-4"
                    >
                      {treinoOptions.map((option) => (
                        <div key={option.value}>
                          <RadioGroupItem value={option.value} id={`treino-${option.value}`} className="peer sr-only" />
                          <Label
                            htmlFor={`treino-${option.value}`}
                            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-border p-4 transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-secondary"
                          >
                            <span className="text-2xl font-bold text-foreground">{option.label}</span>
                            <span className="text-xs text-muted-foreground text-center">{option.description}</span>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>

                  <div className="rounded-lg border border-border bg-secondary/30 p-4">
                    <h4 className="mb-3 text-sm font-medium text-foreground">Distribuição do treino</h4>
                    {materiaFiltrada ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Foco em {materiaFiltrada.nome}</span>
                        <span className="font-medium text-foreground">
                          {parseInt(quantidadeQuestoes)} questões
                        </span>
                      </div>
                    ) : quantidadeQuestoes === "5" ? (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Matérias em risco (100%)</span>
                        <span className="font-medium text-foreground">5 questões</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Matérias em risco (70%)</span>
                          <span className="font-medium text-foreground">
                            {Math.round(parseInt(quantidadeQuestoes) * 0.7)} questões
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Questões gerais (30%)</span>
                          <span className="font-medium text-foreground">
                            {parseInt(quantidadeQuestoes) - Math.round(parseInt(quantidadeQuestoes) * 0.7)} questões
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button className="w-full" size="lg" onClick={iniciarTreino} disabled={iniciando}>
                    {iniciando
                      ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Preparando treino...</>
                      : <><Play className="mr-2 h-5 w-5" />
                          {materiaFiltrada
                            ? `Iniciar sessão focada de ${quantidadeQuestoes} questões`
                            : `Iniciar treino com ${quantidadeQuestoes} questões`}
                        </>
                    }
                  </Button>
                </CardContent>
              </Card>
            )
          })()}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Matérias para treinar
              </CardTitle>
              <CardDescription>Baseado no seu desempenho nos últimos 30 dias</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDados ? (
                <div className="flex items-center justify-center h-24">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : materiasRisco.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Responda mais questões para identificar suas matérias em risco.
                </p>
              ) : (
                <div className="space-y-4">
                  {materiasRisco.map((materia) => {
                    const taxa = Number(materia.taxa)
                    const status = taxa < 55 ? "crítico" : taxa < 70 ? "alerta" : "atenção"
                    return (
                      <div key={materia.subject_id} className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">{materia.nome}</span>
                            <Badge
                              variant={status === "crítico" ? "destructive" : "default"}
                              className={status === "alerta" ? "bg-warning text-warning-foreground" : status === "atenção" ? "bg-secondary text-secondary-foreground" : ""}
                            >
                              {status}
                            </Badge>
                          </div>
                          <Progress
                            value={taxa}
                            className={`h-2 ${taxa < 60 ? "[&>div]:bg-destructive" : taxa < 70 ? "[&>div]:bg-warning" : ""}`}
                          />
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">{taxa.toFixed(0)}%</p>
                          <p className="text-xs text-muted-foreground">de acerto</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Seu progresso</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingDados ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Questões respondidas</span>
                    <span className="text-lg font-bold text-foreground">
                      {progresso?.totalRespondidas?.toLocaleString("pt-BR") ?? "0"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Taxa de acerto</span>
                    <div className="flex items-center gap-1">
                      <span className="text-lg font-bold text-foreground">
                        {progresso?.taxaGeralAcerto ?? 0}%
                      </span>
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}