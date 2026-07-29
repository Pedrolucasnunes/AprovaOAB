"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Sparkles, ArrowRight, AlertTriangle, RotateCcw } from "lucide-react"
import { taxaTextColor, taxaBarColor } from "@/lib/metrics"

interface MateriaMedida {
  subject_id: string
  nome: string
  acertos: number
  total: number
  descartadas: number
  taxa: number
}

interface ModuloStatus {
  id: string
  label: string
  materias: number
  questoes: number
  status: "nao_iniciado" | "em_andamento" | "concluida"
  posicao: number
  total: number
  materiasMedidas: number
}

interface Materia {
  subject_id: string
  nome: string
}

interface ResultadoData {
  completed: boolean
  estado: "ok" | "nada_medido"
  medidas: MateriaMedida[]
  naoMedidas: Materia[]
  /** Perguntamos, mas as respostas não valeram (rápidas demais). */
  naoMedidasTentadas: Materia[]
  /** Ainda não perguntamos nada. */
  naoMedidasNovas: Materia[]
  cobertura: { percentual: number; edicoes: number; questoesNaJanela: number }
  descartadasTotal: number
  respostasTotal: number
  modulos: ModuloStatus[]
  proximoModulo: {
    id: string
    label: string
    questoes: number
    materiasPendentes: number
    /** 1 questão por matéria é medição mais rasa que 2 — a tela precisa dizer. */
    questoesPorMateria: number
  } | null
  foco: { id: string; nome: string } | null
}

export default function ResultadoPage() {
  const router = useRouter()
  const [data, setData] = useState<ResultadoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lembrete, setLembrete] = useState<"idle" | "enviando" | "ok">("idle")

  // O botão era um <Link href="/dashboard"> — não lembrava ninguém de nada.
  // Agora agenda de fato, e o texto só muda depois que o servidor confirmou.
  async function pedirLembrete() {
    setLembrete("enviando")
    try {
      const res = await fetch("/api/diagnostico/lembrete", { method: "POST" })
      if (!res.ok) throw new Error("falhou")
      setLembrete("ok")
    } catch {
      setLembrete("idle")
      toast.error("Não foi possível agendar o lembrete. Tente de novo.")
    }
  }

  useEffect(() => {
    fetch("/api/diagnostico/resultado")
      .then((r) => r.json())
      .then((json) => {
        if (!json.completed) {
          router.replace("/dashboard/diagnostico-inicial")
          return
        }
        setData(json)
        setLoading(false)
      })
      .catch(() => router.replace("/dashboard"))
  }, [router])

  if (loading || !data) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center">
          <Sparkles className="mx-auto h-8 w-8 animate-pulse text-primary" />
          <p className="mt-3 text-sm text-muted-foreground">Montando seu mapa...</p>
        </div>
      </div>
    )
  }

  // Concluiu o módulo mas nenhuma resposta durou tempo suficiente pra valer.
  // Dizer isso é melhor do que mostrar um mapa vazio sem explicação.
  if (data.estado === "nada_medido") {
    // A rota de sessão já reabre sozinha o módulo com matérias pendentes, então
    // aqui é só um link — não precisa de reset explícito.
    const paraRefazer = data.proximoModulo
    return (
      <div className="fixed inset-0 z-50 overflow-auto bg-background">
        <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
            <AlertTriangle className="mx-auto h-6 w-6 text-amber-500" />
            <h1 className="mt-3 text-xl font-bold text-foreground">Não conseguimos medir</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              As respostas vieram rápidas demais pra dizer alguma coisa sobre o seu nível — foram{" "}
              {data.descartadasTotal} em menos de 3 segundos. Preferimos admitir isso a te entregar
              um diagnóstico inventado.
            </p>
            {paraRefazer && (
              <Button asChild className="mt-5 w-full" size="lg">
                <Link href={`/dashboard/diagnostico-inicial?modulo=${paraRefazer.id}`}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Refazer com calma ({paraRefazer.questoes} questões)
                </Link>
              </Button>
            )}
            <Button asChild variant="ghost" className="mt-2 w-full">
              <Link href="/dashboard">Ir pro dashboard</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { cobertura, medidas, naoMedidas, proximoModulo } = data
  const focoId = data.foco?.id

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-background">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {/* Header — a cobertura é a manchete, não rodapé */}
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" />
            Seu mapa
          </span>
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            Medimos {medidas.length} {medidas.length === 1 ? "matéria" : "matérias"} que valem{" "}
            <span className="text-primary">~{cobertura.percentual}%</span> da prova
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Peso calculado sobre as {cobertura.edicoes} edições mais recentes da FGV
            {" "}({cobertura.questoesNaJanela} questões). Medição rasa: poucas questões por matéria,
            o suficiente pra apontar direção — não pra cravar seu nível.
          </p>
        </div>

        {/* Placar por matéria */}
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="space-y-4">
            {medidas.map((m) => (
              <div key={m.subject_id}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">{m.nome}</p>
                  <p className={`text-sm font-mono font-semibold ${taxaTextColor(m.taxa)}`}>
                    {m.acertos}/{m.total}
                  </p>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${taxaBarColor(m.taxa)}`}
                    style={{ width: `${Math.max(m.taxa, 3)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          {data.descartadasTotal > 0 && (
            <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
              {data.descartadasTotal} de {data.respostasTotal}{" "}
              {data.descartadasTotal === 1 ? "resposta ficou" : "respostas ficaram"} de fora da conta
              por terem sido enviadas em menos de 3 segundos — rápido demais pra ter sido leitura.
            </p>
          )}
        </div>

        {/* O que NÃO foi medido — o motivo pra voltar amanhã */}
        {naoMedidas.length > 0 && (
          <div className="mt-6 rounded-xl border border-dashed border-border bg-muted/30 p-5 sm:p-6">
            <p className="text-sm font-semibold text-foreground">
              Faltam {naoMedidas.length} {naoMedidas.length === 1 ? "matéria" : "matérias"} pro seu
              mapa ficar completo
            </p>

            {/* Perguntamos e não deu pra medir — culpa da pressa, não do usuário
                não ter chegado lá. É uma situação diferente da de baixo. */}
            {data.naoMedidasTentadas.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-amber-500">
                  Perguntamos, mas não deu pra medir ({data.naoMedidasTentadas.length})
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {data.naoMedidasTentadas.map((m) => m.nome).join(" · ")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  As respostas dessas vieram rápidas demais. Dá pra refazer só elas.
                </p>
              </div>
            )}

            {data.naoMedidasNovas.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Ainda não perguntamos ({data.naoMedidasNovas.length})
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {data.naoMedidasNovas.map((m) => m.nome).join(" · ")}
                </p>
              </div>
            )}

            <p className="mt-4 text-xs text-muted-foreground">
              Enquanto não medirmos, não dizemos nada sobre elas — nem que estão boas, nem que estão
              ruins.
            </p>

            {proximoModulo && (
              <>
                {/* Declarar a PROFUNDIDADE, não só a quantidade. O Módulo 2 mede
                    1 questão por matéria contra as 2 do Módulo 1 — sem dizer
                    isso, o usuário vê o mesmo placar e assume a mesma
                    confiança nas duas medições. */}
                <p className="mt-4 rounded-lg border border-border bg-background/60 p-3 text-xs leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Medição mais rasa:</span>{" "}
                  o {proximoModulo.label} faz{" "}
                  {proximoModulo.questoesPorMateria === 1
                    ? "1 questão por matéria"
                    : `${proximoModulo.questoesPorMateria} questões por matéria`}
                  {" "}— metade da profundidade do Módulo 1. Serve pra dizer por onde começar, não
                  pra cravar seu nível nelas.
                </p>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button asChild className="flex-1">
                    <Link href={`/dashboard/diagnostico-inicial?modulo=${proximoModulo.id}`}>
                      {proximoModulo.label} — {proximoModulo.questoes}{" "}
                      {proximoModulo.questoes === 1 ? "questão" : "questões"}
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={pedirLembrete}
                    disabled={lembrete !== "idle"}
                  >
                    {lembrete === "ok"
                      ? "Lembrete agendado ✓"
                      : lembrete === "enviando"
                        ? "Agendando..."
                        : "Me lembra amanhã"}
                  </Button>
                </div>

                {lembrete === "ok" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Amanhã você recebe um e-mail com o que falta medir. Um só — não vamos repetir.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* CTA principal — treino da matéria mais fraca medida */}
        <div className="mt-8">
          <Button asChild className="w-full" size="lg">
            <Link
              href={focoId ? `/dashboard/treino?quantidade=5&materia=${focoId}` : "/dashboard/treino?quantidade=5"}
            >
              {data.foco ? `Começar por ${data.foco.nome}` : "Começar a treinar"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="w-full mt-2">
            <Link href="/dashboard">Ir pro dashboard</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
