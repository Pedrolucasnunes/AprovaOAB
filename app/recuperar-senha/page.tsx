"use client"

import Link from "next/link"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Mail, Check } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

export default function RecuperarSenhaPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const throttleRes = await fetch("/api/auth/throttle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset", email }),
      })

      if (throttleRes.status === 429) {
        setIsLoading(false)
        const { error: throttleError } = await throttleRes.json().catch(() => ({}))
        setError(throttleError ?? "Muitas tentativas. Aguarde alguns minutos.")
        return
      }
    } catch {
      // Falha de rede no throttle — segue o fluxo (Supabase tem rate limit próprio)
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })

    setIsLoading(false)

    if (resetError) {
      setError("Não foi possível enviar o e-mail. Tente novamente.")
      return
    }

    setSent(true)
  }

  if (sent) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <div className="flex flex-1 items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md border-border text-center">
            <CardHeader className="space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-bold text-foreground">E-mail enviado</CardTitle>
              <CardDescription>
                Se o endereço <span className="font-medium text-foreground">{email}</span> estiver
                cadastrado, você receberá um link para redefinir sua senha em breve.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-muted-foreground">
                Verifique também sua caixa de spam.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/login">Voltar ao login</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="absolute left-4 top-4 lg:left-8 lg:top-8">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar ao login
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md border-border">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">Recuperar senha</CardTitle>
              <CardDescription className="mt-2 text-muted-foreground">
                Digite seu e-mail e enviaremos um link para redefinir sua senha.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-input"
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Enviando..." : "Enviar link de recuperação"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
