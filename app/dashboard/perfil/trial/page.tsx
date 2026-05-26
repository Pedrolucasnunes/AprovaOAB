"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Sparkles, CheckCircle2, CreditCard, CalendarClock, XCircle,
  ArrowRight, Loader2, ArrowLeft,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import Link from "next/link"

const TRIAL_ENABLED = process.env.NEXT_PUBLIC_TRIAL_ENABLED === "true"
const TRIAL_DAYS = 7

export default function TrialPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [iniciando, setIniciando] = useState(false)
  const [bloqueio, setBloqueio] = useState<string | null>(null)

  useEffect(() => {
    async function init() {
      if (!TRIAL_ENABLED) {
        setBloqueio("O trial está temporariamente indisponível.")
        setLoading(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace("/login")
        return
      }

      const { data } = await supabase
        .from("users")
        .select("plano, trial_used, subscription_status")
        .eq("id", user.id)
        .single()

      if (data?.plano && data.plano !== "free") {
        setBloqueio("Você já tem um plano ativo.")
      } else if (data?.trial_used) {
        setBloqueio("Você já utilizou seu período de trial.")
      }

      setLoading(false)
    }
    init()
  }, [router])

  const comecarTrial = async () => {
    setIniciando(true)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano: "pro", trial: true }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error(data.error ?? "Erro ao iniciar o trial.")
        setIniciando(false)
      }
    } catch {
      toast.error("Erro inesperado.")
      setIniciando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (bloqueio) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Button variant="ghost" asChild className="-ml-2">
          <Link href="/dashboard/perfil"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao perfil</Link>
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Trial indisponível</CardTitle>
            <CardDescription>{bloqueio}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/dashboard/perfil">Voltar ao perfil</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const cobrancaDate = new Date(Date.now() + TRIAL_DAYS * 86_400_000)
    .toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Button variant="ghost" asChild className="-ml-2">
        <Link href="/dashboard/perfil"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar ao perfil</Link>
      </Button>

      <div>
        <Badge className="bg-primary/10 text-primary border-primary/20 mb-3" variant="outline">
          <Sparkles className="h-3 w-3 mr-1" /> 7 dias grátis
        </Badge>
        <h1 className="text-3xl font-extrabold text-foreground">
          Teste o Plano Pro grátis
        </h1>
        <p className="text-muted-foreground mt-2">
          Acesso completo por {TRIAL_DAYS} dias. Cancele a qualquer momento.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">O que está incluído</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            "Questões ilimitadas no treino estratégico (sem limite diário)",
            "Simulados completos da OAB (80 questões, 5 horas)",
            "Plano de estudos dinâmico baseado no seu desempenho",
            "Histórico completo e análise por matéria",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-foreground">{item}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">Como funciona a cobrança</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <CreditCard className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Cartão de crédito necessário</p>
              <p className="text-sm text-muted-foreground">
                Você cadastra o cartão agora, mas <strong>nada é cobrado hoje</strong>.
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-start gap-3">
            <CalendarClock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Primeira cobrança: {cobrancaDate}</p>
              <p className="text-sm text-muted-foreground">
                R$ 19/mês a partir do dia {TRIAL_DAYS + 1}, automaticamente — se você não cancelar antes.
              </p>
            </div>
          </div>
          <Separator />
          <div className="flex items-start gap-3">
            <XCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">Cancele em 1 clique</p>
              <p className="text-sm text-muted-foreground">
                Vá em <strong>Perfil → Gerenciar assinatura</strong> a qualquer momento dentro dos {TRIAL_DAYS} dias.
                Sem ligação, sem email, sem cobrança.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse sm:flex-row gap-3">
        <Button variant="outline" asChild className="flex-1">
          <Link href="/dashboard/perfil">Agora não</Link>
        </Button>
        <Button onClick={comecarTrial} disabled={iniciando} className="flex-1">
          {iniciando
            ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Abrindo checkout...</>
            : <>Começar trial grátis <ArrowRight className="h-4 w-4 ml-1" /></>
          }
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Ao continuar, você concorda em ser cobrado automaticamente após o período de teste,
        salvo se cancelar antes do fim do trial.
      </p>
    </div>
  )
}
