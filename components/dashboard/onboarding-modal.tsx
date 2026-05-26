"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CalendarDays, Sparkles, Target, BookOpen, Clock } from "lucide-react"

type Step = "welcome" | "nivel" | "dificuldades" | "exam-date" | "tempo" | "diagnostico-cta"
type Nivel = "iniciante" | "intermediario" | "avancado"
type Tempo = "1h" | "2-3h" | "4h+"

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho", "Agosto",
  "Setembro", "Outubro", "Novembro", "Dezembro",
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 3 }, (_, i) => currentYear + i)

const NIVEIS: { value: Nivel; label: string; desc: string }[] = [
  { value: "iniciante", label: "Estou começando agora", desc: "Primeiros meses de estudo." },
  { value: "intermediario", label: "Já estudo há alguns meses", desc: "Estou em ritmo, mas com lacunas." },
  { value: "avancado", label: "Já fiz a OAB antes", desc: "Quero focar nos pontos fracos." },
]

const TEMPOS: { value: Tempo; label: string; desc: string }[] = [
  { value: "1h", label: "Tenho 1h por dia", desc: "Estudo concentrado, pouco tempo." },
  { value: "2-3h", label: "Tenho 2-3h por dia", desc: "Rotina equilibrada." },
  { value: "4h+", label: "4h+ ou estudo full-time", desc: "Foco total na aprovação." },
]

interface Subject {
  id: string
  name: string
}

export function OnboardingModal() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<Step>("welcome")

  const [nivel, setNivel] = useState<Nivel | null>(null)
  const [dificuldades, setDificuldades] = useState<string[]>([])
  const [month, setMonth] = useState("")
  const [year, setYear] = useState(String(currentYear))
  const [noDate, setNoDate] = useState(false)
  const [tempo, setTempo] = useState<Tempo | null>(null)

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (searchParams.get("onboarding") !== "true") return
    setIsOpen(true)

    supabase
      .from("subjects")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) setSubjects(data)
      })
  }, [searchParams])

  function toggleDificuldade(id: string) {
    setDificuldades((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 4) return prev
      return [...prev, id]
    })
  }

  function buildPayload() {
    const monthIndex = MONTHS.indexOf(month) + 1
    const examDate = noDate || !month
      ? null
      : `${year}-${String(monthIndex).padStart(2, "0")}`

    return {
      exam_date: examDate,
      nivel,
      dificuldades,
      tempo_diario: tempo,
    }
  }

  async function persist(): Promise<boolean> {
    try {
      const res = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      })
      return res.ok
    } catch {
      return false
    }
  }

  async function startDiagnostico() {
    setSaving(true)
    const ok = await persist()
    setSaving(false)
    if (!ok) {
      toast.error("Não foi possível salvar. Tente de novo.")
      return
    }
    setIsOpen(false)
    router.replace("/dashboard/diagnostico-inicial")
  }

  async function skipDiagnostico() {
    setSaving(true)
    const ok = await persist()
    setSaving(false)
    if (!ok) {
      toast.error("Não foi possível salvar. Tente de novo.")
      return
    }
    setIsOpen(false)
    router.replace("/dashboard")
  }

  async function handleDismiss() {
    setSaving(true)
    const res = await fetch("/api/user/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exam_date: null }),
    }).catch(() => null)
    setSaving(false)

    if (!res || !res.ok) {
      toast.error("Não foi possível salvar. Tente de novo.")
      return
    }
    setIsOpen(false)
    router.replace("/dashboard")
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !saving) handleDismiss() }}>
      <DialogContent className="max-w-md" showCloseButton={false}>
        <DialogTitle className="sr-only">Onboarding</DialogTitle>

        {step === "welcome" && (
          <div className="flex flex-col items-center text-center gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Vamos criar seu diagnóstico
              </h2>
              <p className="text-sm text-muted-foreground text-pretty">
                Em 4 minutos vamos identificar:
              </p>
              <ul className="text-sm text-foreground text-left space-y-1 mx-auto inline-block">
                <li>• suas matérias críticas</li>
                <li>• seus padrões de erro</li>
                <li>• por onde começar a estudar</li>
              </ul>
            </div>
            <Button className="w-full" onClick={() => setStep("nivel")}>
              Começar diagnóstico
            </Button>
            <button
              onClick={handleDismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Pular por agora
            </button>
          </div>
        )}

        {step === "nivel" && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Em que ponto você está?</h3>
                <p className="text-xs text-muted-foreground">Isso ajuda a calibrar a primeira leitura.</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {NIVEIS.map((n) => (
                <button
                  key={n.value}
                  type="button"
                  onClick={() => setNivel(n.value)}
                  className={`text-left rounded-lg border p-3 transition-colors cursor-pointer ${
                    nivel === n.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">{n.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setStep("welcome")}>
                Voltar
              </Button>
              <Button
                className="flex-1"
                disabled={!nivel}
                onClick={() => setStep("dificuldades")}
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === "dificuldades" && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <BookOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Onde você sente mais dificuldade?</h3>
                <p className="text-xs text-muted-foreground">Escolha de 1 a 4 matérias.</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
              {subjects.map((s) => {
                const selected = dificuldades.includes(s.id)
                const disabled = !selected && dificuldades.length >= 4
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleDificuldade(s.id)}
                    disabled={disabled}
                    className={`text-left rounded-lg border px-3 py-2 transition-colors cursor-pointer ${
                      selected
                        ? "border-primary bg-primary/5 text-foreground"
                        : disabled
                          ? "border-border opacity-40 cursor-not-allowed"
                          : "border-border hover:border-primary/40 text-foreground"
                    }`}
                  >
                    <p className="text-xs font-medium">{s.name}</p>
                  </button>
                )
              })}
            </div>

            <p className="text-xs text-muted-foreground">
              Selecionadas: {dificuldades.length}/4
            </p>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep("nivel")}>
                Voltar
              </Button>
              <Button
                className="flex-1"
                disabled={dificuldades.length === 0}
                onClick={() => setStep("exam-date")}
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === "exam-date" && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Quando é sua prova da OAB?</h3>
                <p className="text-xs text-muted-foreground">Usaremos pra priorizar seu plano.</p>
              </div>
            </div>

            <div className="flex gap-3">
              <select
                value={month}
                onChange={(e) => { setMonth(e.target.value); setNoDate(false) }}
                disabled={noDate}
                className="flex-1 h-9 rounded-md border border-input bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 cursor-pointer"
              >
                <option value="">Mês</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => { setYear(e.target.value); setNoDate(false) }}
                disabled={noDate}
                className="w-24 h-9 rounded-md border border-input bg-input px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 cursor-pointer"
              >
                {YEARS.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground select-none">
              <input
                type="checkbox"
                checked={noDate}
                onChange={(e) => { setNoDate(e.target.checked); if (e.target.checked) setMonth("") }}
                className="h-4 w-4 rounded border-input accent-primary"
              />
              Ainda não sei a data
            </label>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setStep("dificuldades")}>
                Voltar
              </Button>
              <Button
                className="flex-1"
                disabled={!noDate && !month}
                onClick={() => setStep("tempo")}
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === "tempo" && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Quanto tempo você tem por dia?</h3>
                <p className="text-xs text-muted-foreground">Pra calibrar o ritmo do plano.</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              {TEMPOS.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTempo(t.value)}
                  className={`text-left rounded-lg border p-3 transition-colors cursor-pointer ${
                    tempo === t.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <p className="text-sm font-medium text-foreground">{t.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setStep("exam-date")}>
                Voltar
              </Button>
              <Button
                className="flex-1"
                disabled={!tempo}
                onClick={() => setStep("diagnostico-cta")}
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === "diagnostico-cta" && (
          <div className="flex flex-col items-center text-center gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">Tudo pronto</h3>
              <p className="text-sm text-muted-foreground text-pretty">
                Agora vamos identificar seus primeiros padrões. Responda 5 questões rápidas pra começar.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={startDiagnostico}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Fazer mini-diagnóstico agora"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={skipDiagnostico}
              disabled={saving}
            >
              Mais tarde — ir pro dashboard
            </Button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  )
}
