"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Mail } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { BotaoGoogle } from "@/components/auth/botao-google"
import { Separador } from "@/components/auth/separador"
import { ReenviarAtivacaoModal } from "@/components/auth/reenviar-ativacao-modal"

/**
 * O formulário de entrada. Saiu de `app/login/page.tsx` para que a página
 * pudesse virar Server Component — é lá que a contagem regressiva do painel
 * precisa ser calculada.
 *
 * A lógica veio inteira e sem reescrita: o desvio do fragmento `otp_expired`,
 * o throttle do reenvio, o repasse do intervalo de 60s do GoTrue e os
 * atalhos de teclado do código de 6 dígitos têm motivo documentado logo abaixo
 * e nenhum deles muda por causa do layout novo.
 */
export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const senhaRedefinida = searchParams.get("senha_redefinida") === "1"
  // Chega aqui quem clicou num link de ativação já vencido (ver app/auth/callback).
  const ativacaoExpirada = searchParams.get("ativacao") === "expirada"
  const [email, setEmail] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null)
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [otpError, setOtpError] = useState<string | null>(null)
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  // O GoTrue devolve o erro do link vencido ora na query, ora no fragmento
  // (`#error_code=otp_expired`), e fragmento não chega ao servidor — por isso
  // `app/auth/callback` sozinho não cobre os dois casos. O fragmento sobrevive
  // aos redirects até aqui; é traduzido para a query, que é a forma que o resto
  // da tela já entende, e some da barra de endereço no caminho.
  useEffect(() => {
    const hash = window.location.hash
    if (!/expired/i.test(hash)) return
    router.replace("/login?ativacao=expirada")
  }, [router])

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
  }

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const next = [...otp]
    next[index] = value.slice(-1)
    setOtp(next)
    if (value && index < 5) inputsRef.current[index + 1]?.focus()
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!text) return
    e.preventDefault()
    const next = [...otp]
    text.split("").forEach((char, i) => { next[i] = char })
    setOtp(next)
    inputsRef.current[Math.min(text.length, 5)]?.focus()
  }

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const token = otp.join("")
    if (token.length < 6) {
      setOtpError("Digite os 6 dígitos do código.")
      return
    }
    setOtpLoading(true)
    setOtpError(null)

    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email: unverifiedEmail!,
      token,
      type: "signup",
    })

    if (verifyError) {
      setOtpError("Código inválido ou expirado. Solicite um novo código.")
      setOtpLoading(false)
      return
    }

    const needsOnboarding = !data.user?.user_metadata?.onboarding_completed
    router.push(needsOnboarding ? "/dashboard?onboarding=true" : "/dashboard")
  }

  const handleResend = async () => {
    if (!unverifiedEmail) return
    setResendLoading(true)
    setResendSuccess(false)
    setOtp(["", "", "", "", "", ""])
    setOtpError(null)

    try {
      const throttleRes = await fetch("/api/auth/throttle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend", email: unverifiedEmail }),
      })

      if (throttleRes.status === 429) {
        const { error: throttleError } = await throttleRes.json().catch(() => ({}))
        setOtpError(throttleError ?? "Muitas tentativas. Aguarde alguns minutos.")
        setResendLoading(false)
        return
      }
    } catch {
      // Falha de rede no throttle — segue o fluxo (Supabase tem rate limit próprio)
    }

    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: unverifiedEmail,
    })
    setResendLoading(false)

    // O erro precisa aparecer. Antes era descartado aqui, e o caso mais comum
    // é o intervalo de 60s do GoTrue entre dois e-mails: a pessoa clicava em
    // "Reenviar código" e a tela não mudava nada — que é indistinguível de o
    // botão estar quebrado.
    if (resendError) {
      const espera = /after (\d+) seconds?/i.exec(resendError.message)?.[1]
      setOtpError(
        espera
          ? `Aguarde ${espera}s antes de pedir outro código.`
          : "Não foi possível reenviar agora. Tente de novo em alguns instantes.",
      )
      return
    }
    setResendSuccess(true)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setUnverifiedEmail(null)
    setResendSuccess(false)

    const formData = new FormData(e.currentTarget)
    const password = formData.get("password") as string

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    const json = await res.json()

    if (json.requiresVerification) {
      setUnverifiedEmail(json.email ?? email)
      setIsLoading(false)
      return
    }

    if (!res.ok) {
      setError(json.error ?? "Erro ao fazer login.")
      setIsLoading(false)
      return
    }

    if (json.isAdmin) {
      window.location.href = "/admin"
      return
    }

    const params = new URLSearchParams(window.location.search)
    const redirect = params.get("redirect")
    if (redirect) {
      window.location.href = redirect
      return
    }

    window.location.href = json.needsOnboarding ? "/dashboard?onboarding=true" : "/dashboard"
  }

  if (unverifiedEmail) {
    return (
      <div className="space-y-6">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-7 w-7 text-primary" aria-hidden />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Conta não verificada
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Digite o código de 6 dígitos enviado para{" "}
              <span className="font-medium text-foreground">{unverifiedEmail}</span>.
            </p>
          </div>
        </div>

        <form onSubmit={handleVerifyOtp} className="space-y-4">
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

          {otpError && <p className="text-sm text-destructive">{otpError}</p>}

          {resendSuccess && (
            <p className="text-sm text-primary">Código reenviado! Verifique sua caixa de entrada.</p>
          )}

          <Button type="submit" className="w-full" disabled={otpLoading}>
            {otpLoading ? "Verificando..." : "Verificar código"}
          </Button>
        </form>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading}
            className="cursor-pointer text-primary hover:underline disabled:opacity-50"
          >
            {resendLoading ? "Enviando..." : "Reenviar código"}
          </button>
          <button
            type="button"
            onClick={() => { setUnverifiedEmail(null); setResendSuccess(false); setOtp(["", "", "", "", "", ""]) }}
            className="cursor-pointer text-muted-foreground hover:text-foreground"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Bem-vindo de volta
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Entre na sua conta para continuar estudando.
        </p>
      </div>

      {/* O Google vem antes do formulário de e-mail porque é o caminho da
          maioria: 30 das 74 contas da base entraram por ele. Estava embaixo. */}
      <BotaoGoogle label="Continuar com Google" onClick={handleGoogleLogin} />

      <Separador>ou com e-mail</Separador>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="seu@email.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-input"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link href="/recuperar-senha" className="text-xs text-primary hover:underline">
              Esqueceu a senha?
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Digite sua senha"
              required
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
        </div>

        {senhaRedefinida && (
          <p className="text-sm text-primary">Senha redefinida com sucesso! Faça login.</p>
        )}

        {ativacaoExpirada && (
          <p className="text-sm text-muted-foreground">
            Esse link de ativação venceu. Peça um código novo em &ldquo;Não recebi o e-mail
            de ativação da conta&rdquo;, logo abaixo.
          </p>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <div className="space-y-1 border-t border-border pt-5 text-sm text-muted-foreground">
        <p>
          Não tem uma conta?{" "}
          <Link href="/cadastro" className="font-medium text-primary hover:underline">
            Criar conta
          </Link>
        </p>
        <p>
          Não recebi o e-mail de ativação da conta.{" "}
          <ReenviarAtivacaoModal
            emailInicial={email}
            abertoInicialmente={ativacaoExpirada}
          />
        </p>
      </div>
    </div>
  )
}
