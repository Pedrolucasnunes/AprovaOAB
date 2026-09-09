"use client"

import Link from "next/link"
import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Check, Mail } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { trackEvent } from "@/lib/analytics"
import { BotaoGoogle } from "@/components/auth/botao-google"
import { Separador } from "@/components/auth/separador"

type Step = "form" | "verify" | "success"

/**
 * A criação de conta, nos três passos que ela já tinha: formulário, código de
 * 6 dígitos e confirmação. Saiu de `app/cadastro/page.tsx` pelo mesmo motivo
 * do login — a página virou Server Component para o painel do calendário
 * poder calcular a contagem no servidor.
 *
 * Lógica intacta, incluindo os dois pontos do funil (`cadastro_form_enviado` e
 * `conta_ativada`) e o `signOut` depois da ativação, que é o que faz a pessoa
 * entrar pelo login em vez de cair logada sem passar pela tela.
 */
export function CadastroForm() {
  const [step, setStep] = useState<Step>("form")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [emailCadastro, setEmailCadastro] = useState("")
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  const handleGoogleLogin = async () => {
    trackEvent("cadastro_google_click")
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const passwordRequirements = [
    { label: "Mínimo 8 caracteres", valid: password.length >= 8 },
    { label: "Uma letra maiúscula", valid: /[A-Z]/.test(password) },
    { label: "Um número", valid: /[0-9]/.test(password) },
  ]

  const senhaValida = passwordRequirements.every((r) => r.valid)

  const handleSubmit = async (e: { preventDefault(): void; currentTarget: HTMLFormElement }) => {
    e.preventDefault()
    setError(null)

    if (!senhaValida) {
      setError("A senha não atende aos requisitos mínimos.")
      return
    }

    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const nome = formData.get("name") as string
    const email = formData.get("email") as string
    const senha = formData.get("password") as string

    await supabase.auth.signOut()

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: senha, name: nome }),
    })

    const json = await res.json()
    setIsLoading(false)

    if (!res.ok) {
      setError(json.error ?? "Não foi possível criar a conta.")
      return
    }

    setEmailCadastro(email)
    // Funil: dados preenchidos e código OTP enviado (passo 1 → 2)
    trackEvent("cadastro_form_enviado")
    setStep("verify")
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[index] = value.slice(-1)
    setOtp(next)
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus()
    }
  }

  const handleOtpKeyDown = (index: number, e: { key: string }) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: { clipboardData: DataTransfer; preventDefault(): void }) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!text) return
    e.preventDefault()
    const next = [...otp]
    text.split("").forEach((char, i) => { next[i] = char })
    setOtp(next)
    inputsRef.current[Math.min(text.length, 5)]?.focus()
  }

  const handleVerifyOtp = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError(null)
    const token = otp.join("")
    if (token.length < 6) {
      setError("Digite os 6 dígitos do código enviado.")
      return
    }

    setIsLoading(true)
    const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
      email: emailCadastro,
      token,
      type: "signup",
    })
    setIsLoading(false)

    if (verifyError) {
      setError("Código inválido ou expirado. Solicite um novo código.")
      return
    }

    // Boas-vindas (best-effort — não bloqueia a ativação da conta).
    // Passa o token da sessão recém-criada em vez de depender do cookie.
    try {
      const accessToken = verifyData.session?.access_token
      await fetch("/api/auth/welcome", {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      })
    } catch {
      // ignora — ativação não pode falhar por causa do e-mail
    }

    // Funil: OTP confirmado, conta ativada (passo 2 → 3 — fim do funil)
    trackEvent("conta_ativada")

    await supabase.auth.signOut()
    setStep("success")
  }

  const handleResend = async () => {
    setError(null)
    setResendSuccess(false)
    setResendLoading(true)
    setOtp(["", "", "", "", "", ""])

    try {
      const throttleRes = await fetch("/api/auth/throttle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend", email: emailCadastro }),
      })

      if (throttleRes.status === 429) {
        const { error: throttleError } = await throttleRes.json().catch(() => ({}))
        setError(throttleError ?? "Muitas tentativas. Aguarde alguns minutos.")
        setResendLoading(false)
        return
      }
    } catch {
      // Falha de rede no throttle — segue o fluxo (Supabase tem rate limit próprio)
    }

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: emailCadastro,
    })
    setResendLoading(false)

    // O sucesso precisa aparecer tanto quanto o erro: sem confirmação visível,
    // clicar em "Reenviar" não mudava nada na tela, a pessoa clicava de novo e
    // só então via uma mensagem — a do intervalo de 60s do GoTrue, que manda
    // "tentar novamente" justo quando tentar de novo é o que não funciona.
    if (resendError) {
      const espera = /after (\d+) seconds?/i.exec(resendError.message)?.[1]
      setError(
        espera
          ? `Aguarde ${espera}s antes de pedir outro código.`
          : "Não foi possível reenviar o código. Tente novamente.",
      )
      return
    }
    setResendSuccess(true)
  }

  if (step === "success") {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Check className="h-8 w-8 text-primary" aria-hidden />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Conta ativada!
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Seu e-mail foi verificado com sucesso. Agora você pode fazer login.
          </p>
        </div>
        <Button asChild className="w-full">
          <Link href="/login">Ir para o login</Link>
        </Button>
      </div>
    )
  }

  if (step === "verify") {
    return (
      <div className="space-y-6">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-7 w-7 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Verifique seu e-mail
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enviamos um código de 6 dígitos para{" "}
              <span className="font-medium text-foreground">{emailCadastro}</span>.
            </p>
          </div>
        </div>

        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div className="space-y-2">
            <Label className="block text-center">Código de verificação</Label>
            <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputsRef.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  aria-label={`Dígito ${i + 1} de 6`}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(i, e)}
                  className="h-12 w-10 rounded-md border border-input bg-input text-center text-lg font-semibold focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              ))}
            </div>
          </div>

          {error && <p className="text-center text-sm text-destructive">{error}</p>}

          {resendSuccess && (
            <p className="text-center text-sm text-primary">
              Código reenviado! Verifique sua caixa de entrada e o spam.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Verificando..." : "Verificar código"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          Não recebeu o código?{" "}
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            className="cursor-pointer font-medium text-primary hover:underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
          >
            {resendLoading ? "Enviando..." : "Reenviar"}
          </button>
        </p>

        <p className="text-center text-sm">
          <button
            type="button"
            onClick={() => { setStep("form"); setError(null); setResendSuccess(false) }}
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            Voltar ao cadastro
          </button>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Crie sua conta
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Comece sua jornada rumo à aprovação na OAB.
        </p>
      </div>

      {/* Mesma ordem do login: o caminho do Google vem primeiro. */}
      <BotaoGoogle label="Cadastrar com Google" onClick={handleGoogleLogin} />

      <Separador>ou com e-mail</Separador>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo</Label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Seu nome"
            required
            className="bg-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            required
            className="bg-input"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Crie uma senha"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-input pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {password && (
            <div className="mt-2 space-y-1">
              {passwordRequirements.map((req) => (
                <div key={req.label} className="flex items-center gap-2 text-xs">
                  <Check className={`h-3 w-3 ${req.valid ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={req.valid ? "text-primary" : "text-muted-foreground"}>
                    {req.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || (password.length > 0 && !senhaValida)}
        >
          {isLoading ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>

      <p className="text-xs leading-relaxed text-muted-foreground">
        Ao criar uma conta, você concorda com nossos{" "}
        <Link href="/termos-de-uso" className="text-primary hover:underline">Termos de Uso</Link>{" "}
        e{" "}
        <Link href="/politica-de-privacidade" className="text-primary hover:underline">Política de Privacidade</Link>.
      </p>

      <div className="border-t border-border pt-5 text-sm text-muted-foreground">
        Já tem uma conta?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Entrar
        </Link>
      </div>
    </div>
  )
}
