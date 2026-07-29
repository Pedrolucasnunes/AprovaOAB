"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CalendarDays, Sparkles } from "lucide-react"

// Onboarding enxuto: welcome -> data da prova -> CTA do diagnóstico.
//
// Os passos de nível, matérias difíceis e tempo diário foram removidos. Eles
// coletavam dados que NINGUÉM lia: `nivel` e `tempo_diario` nunca tiveram um
// leitor sequer, e `dificuldades` só servia ao diagnóstico antigo pra escolher
// 3 das 5 questões — o Módulo 1 é blueprint fixo de 8 matérias vindo do
// app_config e não depende mais disso.
//
// Não é economia de código: este wizard é o maior buraco de ativação medido
// (33 de 57 usuários pararam nele), e três das seis telas cobravam esforço sem
// devolver nada. A premissa da reforma é que medição bate autodeclaração —
// pedir pro candidato adivinhar as próprias matérias fracas antes de medir
// contradizia isso.

type Step = "welcome" | "exam-date" | "diagnostico-cta"

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril",
  "Maio", "Junho", "Julho", "Agosto",
  "Setembro", "Outubro", "Novembro", "Dezembro",
]

const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 3 }, (_, i) => currentYear + i)

export function OnboardingModal() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState<Step>("welcome")

  const [month, setMonth] = useState("")
  const [year, setYear] = useState(String(currentYear))
  const [noDate, setNoDate] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (searchParams.get("onboarding") !== "true") return
    setIsOpen(true)

    // Prefill: quem já escolheu a data e fechou não recomeça em branco.
    fetch("/api/user/onboarding")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (typeof json?.exam_date === "string") {
          const [ano, mes] = json.exam_date.split("-")
          setYear(ano)
          setMonth(MONTHS[Number(mes) - 1] ?? "")
        }
      })
      .catch(() => {})
  }, [searchParams])

  function computeExamDate(): string | null {
    const monthIndex = MONTHS.indexOf(month) + 1
    return noDate || !month ? null : `${year}-${String(monthIndex).padStart(2, "0")}`
  }

  /** Grava sem bloquear a navegação — o save final é que é awaited. */
  function salvarParcial(patch: Record<string, unknown>) {
    void fetch("/api/user/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {})
  }

  async function persist(): Promise<boolean> {
    try {
      const res = await fetch("/api/user/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exam_date: computeExamDate(), completo: true }),
      })
      return res.ok
    } catch {
      return false
    }
  }

  async function concluir(destino: string) {
    setSaving(true)
    const ok = await persist()
    setSaving(false)
    if (!ok) {
      toast.error("Não foi possível salvar. Tente de novo.")
      return
    }
    setIsOpen(false)
    router.replace(destino)
  }

  // Fechar não grava nada: a data já foi salva no passo dela.
  function handleDismiss() {
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
                Vamos medir seu nível
              </h2>
              {/* ~15 min = 16 questões × 56s (mediana medida). Se mudar
                  questoesPorMateria no app_config, revisar este número. */}
              <p className="text-sm text-muted-foreground text-pretty">
                Em cerca de 15 minutos vamos medir:
              </p>
              <ul className="text-sm text-foreground text-left space-y-1 mx-auto inline-block">
                <li>• as 8 matérias mais pesadas da prova</li>
                <li>• onde você está mais fraco entre elas</li>
                <li>• por onde começar a estudar</li>
              </ul>
            </div>
            <Button className="w-full" onClick={() => setStep("exam-date")}>
              Começar
            </Button>
            <button
              onClick={handleDismiss}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              Pular por agora
            </button>
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
              <Button variant="outline" className="flex-1" onClick={() => setStep("welcome")}>
                Voltar
              </Button>
              <Button
                className="flex-1"
                disabled={!noDate && !month}
                onClick={() => {
                  salvarParcial({ exam_date: computeExamDate() })
                  setStep("diagnostico-cta")
                }}
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
                São 16 questões, 2 de cada uma das 8 matérias mais pesadas. Pode fechar no
                meio — seu progresso fica salvo.
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => concluir("/dashboard/diagnostico-inicial")}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Fazer diagnóstico agora"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => concluir("/dashboard")}
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
