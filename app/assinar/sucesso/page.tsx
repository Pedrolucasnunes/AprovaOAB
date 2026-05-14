"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Sparkles,
  Loader2,
  Clock,
  AlertTriangle,
  Check,
  ArrowRight,
  RefreshCw,
} from "lucide-react"

type Status = "verifying" | "confirmed" | "timeout" | "error"
type Plano = "pro" | "aprovacao"

const POLL_INTERVAL_MS = 1500
const MAX_ATTEMPTS = 10 // ~15s

const FEATURES_POR_PLANO: Record<Plano, string[]> = {
  pro: [
    "Questões ilimitadas",
    "Simulados completos da OAB (80 questões)",
    "Calendário inteligente de estudos",
  ],
  aprovacao: [
    "Tudo do plano Pro",
    "Análise avançada de desempenho",
    "Suporte prioritário",
  ],
}

const NOME_PLANO: Record<Plano, string> = {
  pro: "Pro",
  aprovacao: "Aprovação",
}

export default function AssinaturaSuccessPage() {
  return (
    <Suspense fallback={<VerifyingCard />}>
      <SuccessContent />
    </Suspense>
  )
}

function VerifyingCard() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md border-border text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <CardTitle className="text-xl font-bold text-foreground">
            Confirmando seu pagamento...
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Isso costuma levar alguns segundos. Não feche esta página.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("session_id")

  const [status, setStatus] = useState<Status>("verifying")
  const [plano, setPlano] = useState<Plano | null>(null)
  const attemptsRef = useRef(0)

  useEffect(() => {
    if (!sessionId) {
      router.replace("/dashboard")
      return
    }

    let cancelled = false

    async function poll() {
      if (cancelled) return

      try {
        const res = await fetch(
          `/api/stripe/session-status?session_id=${encodeURIComponent(sessionId!)}`,
          { cache: "no-store" }
        )
        const data = await res.json()

        if (cancelled) return

        if (res.status === 403 || res.status === 404) {
          setStatus("error")
          return
        }

        if (!res.ok) {
          attemptsRef.current += 1
          if (attemptsRef.current >= MAX_ATTEMPTS) {
            setStatus("error")
            return
          }
          setTimeout(poll, POLL_INTERVAL_MS)
          return
        }

        if (data.confirmed && (data.plano === "pro" || data.plano === "aprovacao")) {
          setPlano(data.plano)
          setStatus("confirmed")
          return
        }

        attemptsRef.current += 1
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setStatus("timeout")
          return
        }

        setTimeout(poll, POLL_INTERVAL_MS)
      } catch {
        if (cancelled) return
        attemptsRef.current += 1
        if (attemptsRef.current >= MAX_ATTEMPTS) {
          setStatus("error")
          return
        }
        setTimeout(poll, POLL_INTERVAL_MS)
      }
    }

    poll()

    return () => {
      cancelled = true
    }
  }, [sessionId, router])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {status === "verifying" && (
        <Card className="w-full max-w-md border-border text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              Confirmando seu pagamento...
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Isso costuma levar alguns segundos. Não feche esta página.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {status === "confirmed" && plano && (
        <Card className="w-full max-w-lg border-primary/30 bg-primary/5">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/15">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">
              Bem-vindo ao plano {NOME_PLANO[plano]}!
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Seu acesso completo está ativo. Aqui está o que você desbloqueou:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <ul className="space-y-2.5">
              {FEATURES_POR_PLANO[plano].map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{feature}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 pt-2">
              <Button asChild className="w-full gap-2">
                <Link href="/dashboard">
                  Ir pro meu painel
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/dashboard/simulados">Fazer meu primeiro simulado</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {status === "timeout" && (
        <Card className="w-full max-w-md border-amber-500/30 bg-amber-500/5 text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15">
              <Clock className="h-8 w-8 text-amber-500" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              Estamos processando seu pagamento
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Seu pagamento foi recebido. Em alguns minutos seu plano deve estar ativo. Recarregue esta página ou vá pro dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => window.location.reload()} className="w-full gap-2">
              <RefreshCw className="h-4 w-4" />
              Atualizar página
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/dashboard">Ir pro dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {status === "error" && (
        <Card className="w-full max-w-md border-destructive/30 bg-destructive/5 text-center">
          <CardHeader className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-destructive/15">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              Não conseguimos confirmar
            </CardTitle>
            <CardDescription className="text-muted-foreground">
              Houve um problema ao confirmar sua sessão. Se você concluiu o pagamento, seu plano pode estar ativo. Vá pro dashboard ou entre em contato com o suporte.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/dashboard">Ir pro dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
