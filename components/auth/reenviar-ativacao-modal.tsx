"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Mail, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"

/** Segundos de espera entre dois envios. É o `max_frequency` do GoTrue. */
const ESPERA_SEGUNDOS = 60

/**
 * "Não recebi o e-mail de ativação" — o caminho para quem criou a conta,
 * não confirmou o e-mail e voltou dias depois.
 *
 * Duas decisões que o modal carrega:
 *
 * 1. **Ele também recebe o código, não só dispara o e-mail.** Reenviar sem ter
 *    onde digitar não resolveria nada: a tela de OTP do cadastro só existe na
 *    mesma aba do cadastro, e a do login só aparece depois de acertar a senha —
 *    que é justamente o que quem nunca usou a conta não lembra. Por isso o
 *    modal tem dois passos, e-mail → código.
 *
 * 2. **A confirmação é sempre a mesma frase**, exista a conta ou não, e a
 *    espera de 60s aparece para qualquer endereço digitado. Mensagem que
 *    mudasse conforme o e-mail existir transformaria este modal numa sonda de
 *    enumeração — a rota `/api/auth/reativar` segue a mesma regra do lado de lá.
 *
 * O código confirma a conta e já entra: é o mesmo `verifyOtp` que a tela de
 * login faz alguns pixels acima, e quem tem a caixa de entrada já poderia
 * entrar pelo "Esqueci a senha". Exigir a senha aqui poria atrito sem fechar
 * nada.
 */
export function ReenviarAtivacaoModal({
  emailInicial = "",
  abertoInicialmente = false,
}: {
  emailInicial?: string
  abertoInicialmente?: boolean
}) {
  const router = useRouter()
  const [abertoPeloBotao, setAbertoPeloBotao] = useState(false)
  const [dispensado, setDispensado] = useState(false)
  // Derivado, não sincronizado por efeito: `abertoInicialmente` só fica
  // verdadeiro depois da montagem (quem chega de link vencido traz o erro no
  // fragmento da URL, que só o cliente lê), e um efeito para copiá-lo em estado
  // renderizaria duas vezes à toa.
  const open = abertoPeloBotao || (abertoInicialmente && !dispensado)
  const [passo, setPasso] = useState<"email" | "codigo">("email")
  const [email, setEmail] = useState(emailInicial)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [espera, setEspera] = useState(0)
  const [otp, setOtp] = useState(["", "", "", "", "", ""])
  const [verificando, setVerificando] = useState(false)
  const inputsRef = useRef<(HTMLInputElement | null)[]>([])

  // Contagem da espera entre envios.
  useEffect(() => {
    if (espera <= 0) return
    const id = setTimeout(() => setEspera((s) => s - 1), 1000)
    return () => clearTimeout(id)
  }, [espera])

  function abrir(v: boolean) {
    if (v) {
      setAbertoPeloBotao(true)
      setDispensado(false)
      // Aproveita o e-mail já digitado no formulário de login, sem sobrescrever
      // o que a pessoa tiver corrigido aqui dentro.
      if (!email && emailInicial) setEmail(emailInicial)
      return
    }
    setAbertoPeloBotao(false)
    setDispensado(true)
    // Fechar zera o passo, mas preserva o e-mail digitado e a espera em curso:
    // reabrir não pode virar um jeito de burlar o intervalo entre envios.
    setPasso("email")
    setOtp(["", "", "", "", "", ""])
    setErro(null)
  }

  async function enviar(e?: { preventDefault(): void }) {
    e?.preventDefault()
    if (espera > 0 || enviando) return
    setErro(null)
    setEnviando(true)

    const res = await fetch("/api/auth/reativar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }).catch(() => null)

    setEnviando(false)

    if (!res) {
      setErro("Não foi possível enviar agora. Verifique sua conexão e tente de novo.")
      return
    }
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: null }))
      setErro(error ?? "Não foi possível enviar agora. Tente novamente.")
      return
    }

    setEspera(ESPERA_SEGUNDOS)
    setPasso("codigo")
    setOtp(["", "", "", "", "", ""])
  }

  function onOtpChange(i: number, valor: string) {
    if (!/^\d*$/.test(valor)) return
    const next = [...otp]
    next[i] = valor.slice(-1)
    setOtp(next)
    if (valor && i < 5) inputsRef.current[i + 1]?.focus()
  }

  function onOtpKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !otp[i] && i > 0) inputsRef.current[i - 1]?.focus()
  }

  function onOtpPaste(e: React.ClipboardEvent) {
    const texto = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!texto) return
    e.preventDefault()
    const next = [...otp]
    texto.split("").forEach((c, i) => { next[i] = c })
    setOtp(next)
    inputsRef.current[Math.min(texto.length, 5)]?.focus()
  }

  async function verificar(e: React.FormEvent) {
    e.preventDefault()
    const token = otp.join("")
    if (token.length < 6) {
      setErro("Digite os 6 dígitos do código.")
      return
    }
    setErro(null)
    setVerificando(true)

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    })
    setVerificando(false)

    if (error) {
      setErro("Código inválido ou expirado. Peça um novo código abaixo.")
      setOtp(["", "", "", "", "", ""])
      inputsRef.current[0]?.focus()
      return
    }

    const precisaOnboarding = !data.user?.user_metadata?.onboarding_completed
    router.push(precisaOnboarding ? "/dashboard?onboarding=true" : "/dashboard")
  }

  return (
    <>
      <button
        type="button"
        onClick={() => abrir(true)}
        className="cursor-pointer font-medium text-primary hover:underline"
      >
        Reenviar
      </button>

      <Dialog open={open} onOpenChange={abrir}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="text-center">
              {passo === "email" ? "Reenviar e-mail de ativação" : "Digite o código"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {passo === "email" ? (
                "Informe o e-mail que você usou no cadastro. Enviamos um novo código de 6 dígitos."
              ) : (
                <>
                  Se <span className="font-medium text-foreground">{email}</span> tiver uma conta
                  esperando ativação, o código acabou de sair. Confira também o spam.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          {passo === "email" ? (
            <form onSubmit={enviar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-ativacao">E-mail</Label>
                <Input
                  id="email-ativacao"
                  type="email"
                  autoComplete="email"
                  placeholder="seu@email.com"
                  required
                  value={email}
                  onChange={(ev) => setEmail(ev.target.value)}
                  className="bg-input"
                />
              </div>

              {erro && <p className="text-sm text-destructive">{erro}</p>}

              <Button type="submit" className="w-full" disabled={enviando || espera > 0}>
                {enviando ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : espera > 0 ? (
                  `Aguarde ${espera}s para enviar de novo`
                ) : (
                  "Enviar"
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={verificar} className="space-y-4">
              <div className="space-y-2">
                <Label className="block text-center">Código de verificação</Label>
                <div className="flex justify-center gap-2" onPaste={onOtpPaste}>
                  {otp.map((digito, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputsRef.current[i] = el }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digito}
                      onChange={(ev) => onOtpChange(i, ev.target.value)}
                      onKeyDown={(ev) => onOtpKeyDown(i, ev)}
                      className="h-12 w-10 rounded-md border border-input bg-input text-center text-lg font-semibold focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  ))}
                </div>
              </div>

              {erro && <p className="text-center text-sm text-destructive">{erro}</p>}

              <Button type="submit" className="w-full" disabled={verificando}>
                {verificando ? "Verificando..." : "Ativar conta"}
              </Button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => enviar()}
                  disabled={espera > 0 || enviando}
                  className="cursor-pointer text-primary hover:underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
                >
                  {espera > 0 ? `Reenviar em ${espera}s` : "Reenviar código"}
                </button>
                <button
                  type="button"
                  onClick={() => { setPasso("email"); setErro(null) }}
                  className="cursor-pointer text-muted-foreground hover:text-foreground"
                >
                  Trocar e-mail
                </button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
