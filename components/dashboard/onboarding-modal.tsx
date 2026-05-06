"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CalendarDays, CheckCircle2 } from "lucide-react"

type Step = "welcome" | "exam-date" | "done"

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
  const [plano, setPlano] = useState<string>("free")

  useEffect(() => {
    if (searchParams.get("onboarding") !== "true") return
    setIsOpen(true)

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from("users")
        .select("plano")
        .eq("id", user.id)
        .single()
      if (data?.plano) setPlano(data.plano)
    })
  }, [searchParams])

  const isFree = plano === "free"
  const recommendedPath = isFree ? "/dashboard/questoes" : "/dashboard/simulados"

  async function saveAndRedirect(goToRecommended: boolean) {
    setSaving(true)
    const monthIndex = MONTHS.indexOf(month) + 1
    const examDate = noDate || !month
      ? null
      : `${year}-${String(monthIndex).padStart(2, "0")}`

    await fetch("/api/user/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exam_date: examDate }),
    })

    setSaving(false)
    setIsOpen(false)
    router.replace(goToRecommended ? recommendedPath : "/dashboard")
  }

  function handleDismiss() {
    setIsOpen(false)
    router.replace("/dashboard")
    fetch("/api/user/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ exam_date: null }),
    }).catch(() => {})
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDismiss() }}>
      <DialogContent className="max-w-md" showCloseButton={false}>
        <DialogTitle className="sr-only">Onboarding</DialogTitle>

        {step === "welcome" && (
          <div className="flex flex-col items-center text-center gap-5">
            <img
              src="/Sem fundo.png"
              alt="AprovaOAB"
              className="h-16 w-16 object-contain"
            />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">
                Bem-vindo ao AprovaOAB!
              </h2>
              <p className="text-sm text-muted-foreground text-pretty">
                Vamos personalizar sua experiência com 2 perguntas rápidas para
                que você estude de forma inteligente e maximize suas chances de
                aprovação.
              </p>
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary">
                <CalendarDays className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Quando é sua prova da OAB?
                </h3>
                <p className="text-xs text-muted-foreground">
                  Usaremos isso para priorizar seu plano de estudos.
                </p>
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
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setStep("welcome")}
              >
                Voltar
              </Button>
              <Button
                className="flex-1"
                disabled={!noDate && !month}
                onClick={() => setStep("done")}
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center text-center gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle2 className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground">Tudo pronto!</h3>
              <p className="text-sm text-muted-foreground text-pretty">
                {isFree
                  ? "Comece respondendo suas 10 questões diárias — vamos mapear seus pontos fortes e fracos por disciplina conforme você joga."
                  : "Recomendamos começar com um simulado diagnóstico para mapearmos seus pontos fortes e fracos por disciplina."}
              </p>
            </div>
            <Button
              className="w-full"
              onClick={() => saveAndRedirect(true)}
              disabled={saving}
            >
              {saving
                ? "Salvando..."
                : isFree
                  ? "Começar com 10 questões"
                  : "Fazer diagnóstico agora"}
            </Button>
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => saveAndRedirect(false)}
              disabled={saving}
            >
              Explorar a plataforma primeiro
            </Button>
          </div>
        )}

      </DialogContent>
    </Dialog>
  )
}
