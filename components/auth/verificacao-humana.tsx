"use client"

import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react"
import { TURNSTILE_SITE_KEY } from "@/lib/turnstile"

/**
 * A verificação humana (Turnstile) dos formulários de conta.
 *
 * Existe porque a chave pública do Supabase está no site, e com ela qualquer
 * script chama o login, o cadastro e o envio de código DIRETO no Supabase, sem
 * passar pelos limites de tentativa das rotas `/api/auth/*`. Com a proteção
 * ligada no painel, o Supabase recusa pedido sem um comprovante deste widget, e
 * só um navegador de verdade consegue tirar um.
 *
 * Quase sempre é invisível (`interaction-only`): só aparece uma caixa para
 * marcar quando a Cloudflare desconfia da visita.
 *
 * Como os formulários usam:
 *   const token = await ref.current?.obterToken()   // espera até ficar pronto
 *   ...pedido ao Supabase com `captchaToken: token`...
 *   ref.current?.renovar()                           // cada comprovante vale UMA vez
 *
 * Sem comprovante (script bloqueado, Cloudflare fora), o pedido segue sem ele e
 * o Supabase decide: com a proteção desligada passa, ligada volta
 * `captcha_failed`, que as telas traduzem com `MENSAGEM_VERIFICACAO`. Travar o
 * envio aqui seria pior: antes de a proteção ser ligada no painel, quem tem o
 * script bloqueado por extensão perderia o login à toa.
 */

type ApiTurnstile = {
  render(el: HTMLElement, opcoes: Record<string, unknown>): string
  reset(id: string): void
  remove(id: string): void
}

declare global {
  interface Window {
    turnstile?: ApiTurnstile
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

/** Quanto o envio espera o comprovante antes de seguir sem ele. */
const ESPERA_MAXIMA_MS = 10_000

let carregamento: Promise<ApiTurnstile> | null = null

// Um script por página, mesmo com vários formulários montando e desmontando.
function carregarTurnstile(): Promise<ApiTurnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  if (!carregamento) {
    carregamento = new Promise<ApiTurnstile>((resolve, reject) => {
      const script = document.createElement("script")
      script.src = SCRIPT
      script.async = true
      script.onload = () =>
        window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile ausente"))
      script.onerror = () => {
        carregamento = null // deixa a próxima montagem tentar de novo
        script.remove()
        reject(new Error("Falha ao carregar o Turnstile"))
      }
      document.head.appendChild(script)
    })
  }
  return carregamento
}

export type VerificacaoHumanaHandle = {
  /** O comprovante atual, esperando até `ESPERA_MAXIMA_MS` se ainda não saiu. */
  obterToken(): Promise<string | null>
  /** Descarta o comprovante usado e pede outro. Chamar depois de todo envio. */
  renovar(): void
}

export function VerificacaoHumana({
  acao,
  ref,
}: {
  /** Rótulo que aparece no painel da Cloudflare (letras, números, `-` e `_`). */
  acao: string
  ref?: Ref<VerificacaoHumanaHandle>
}) {
  const caixaRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<string | null>(null)
  const apiRef = useRef<ApiTurnstile | null>(null)
  const tokenRef = useRef<string | null>(null)
  const esperandoRef = useRef(new Set<(token: string | null) => void>())
  // A caixa só ocupa espaço quando a Cloudflare pede interação. Fora disso ela
  // não pode empurrar o layout do formulário.
  const [interativo, setInterativo] = useState(false)

  useEffect(() => {
    let ativo = true
    const esperando = esperandoRef.current

    const entregar = (token: string | null) => {
      tokenRef.current = token
      if (!token) return
      for (const resolver of esperando) resolver(token)
      esperando.clear()
    }

    carregarTurnstile()
      .then((api) => {
        const caixa = caixaRef.current
        if (!ativo || !caixa) return
        apiRef.current = api
        widgetRef.current = api.render(caixa, {
          sitekey: TURNSTILE_SITE_KEY,
          action: acao,
          appearance: "interaction-only",
          language: "pt-br",
          theme: "auto",
          // O tamanho normal tem 300px fixos e estoura o cartão em celular
          // estreito (o da troca de senha e o modal ficam com ~280px).
          size: caixa.clientWidth >= 300 ? "flexible" : "compact",
          callback: (token: string) => entregar(token),
          "expired-callback": () => entregar(null),
          "error-callback": () => entregar(null),
          "timeout-callback": () => entregar(null),
          "before-interactive-callback": () => setInterativo(true),
          "after-interactive-callback": () => setInterativo(false),
        })
      })
      .catch(() => {
        // Sem o script, os pedidos vão sem comprovante (ver o cabeçalho).
      })

    return () => {
      ativo = false
      if (widgetRef.current && apiRef.current) apiRef.current.remove(widgetRef.current)
      widgetRef.current = null
      tokenRef.current = null
      for (const resolver of esperando) resolver(null)
      esperando.clear()
    }
  }, [acao])

  useImperativeHandle(
    ref,
    () => ({
      obterToken() {
        if (tokenRef.current) return Promise.resolve(tokenRef.current)
        return new Promise<string | null>((resolve) => {
          const resolver = (token: string | null) => {
            clearTimeout(limite)
            esperandoRef.current.delete(resolver)
            resolve(token)
          }
          const limite = setTimeout(() => resolver(null), ESPERA_MAXIMA_MS)
          esperandoRef.current.add(resolver)
        })
      },
      renovar() {
        tokenRef.current = null
        if (widgetRef.current && apiRef.current) apiRef.current.reset(widgetRef.current)
      },
    }),
    [],
  )

  return <div ref={caixaRef} className={interativo ? "flex justify-center pb-1" : undefined} />
}
