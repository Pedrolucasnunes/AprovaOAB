"use client"

import { useRef, type RefObject } from "react"

/**
 * O campo do código que chega por e-mail (cadastro, login de conta pendente e o
 * modal de reenvio). Eram três cópias do mesmo bloco, cada uma com o 6 escrito
 * à mão em cinco lugares.
 *
 * São DOIS números de propósito. O tamanho do código é configuração do painel
 * do Supabase ("Email OTP Length"), não do código do site, e código já enviado
 * continua valendo depois da troca. Com 8 casas e mínimo de 6, a tela aceita os
 * dois tamanhos: primeiro sobe o deploy, depois troca o painel, e ninguém fica
 * no meio sem conseguir digitar. Quem digita 6 de um código de 8 recebe o
 * "código inválido" do próprio Supabase.
 */
export const CASAS_CODIGO = 8
export const MINIMO_CODIGO = 6

export const codigoVazio = () => Array<string>(CASAS_CODIGO).fill("")

/** Tem dígitos suficientes para ir ao servidor? */
export const codigoPronto = (valor: string[]) => valor.join("").length >= MINIMO_CODIGO

export function CampoCodigo({
  valor,
  onChange,
  inputsRef,
}: {
  valor: string[]
  onChange: (valor: string[]) => void
  /** Só para quem precisa devolver o foco à primeira casa depois de um erro. */
  inputsRef?: RefObject<(HTMLInputElement | null)[]>
}) {
  const interno = useRef<(HTMLInputElement | null)[]>([])
  const refs = inputsRef ?? interno

  const mudar = (i: number, texto: string) => {
    if (!/^\d*$/.test(texto)) return
    const proximo = [...valor]
    proximo[i] = texto.slice(-1)
    onChange(proximo)
    if (texto && i < CASAS_CODIGO - 1) refs.current[i + 1]?.focus()
  }

  const voltar = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !valor[i] && i > 0) refs.current[i - 1]?.focus()
  }

  // Colar substitui o código inteiro: colar por cima de um código pela metade
  // deixava sobra das casas antigas no fim.
  const colar = (e: React.ClipboardEvent) => {
    const texto = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CASAS_CODIGO)
    if (!texto) return
    e.preventDefault()
    const proximo = codigoVazio()
    texto.split("").forEach((c, i) => { proximo[i] = c })
    onChange(proximo)
    refs.current[Math.min(texto.length, CASAS_CODIGO - 1)]?.focus()
  }

  // Casas menores no celular: 8 casas de 40px com o espaçamento antigo dão
  // 376px e estouravam a tela de 360px.
  return (
    <div className="flex justify-center gap-1.5 sm:gap-2" onPaste={colar}>
      {valor.map((digito, i) => (
        <input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digito}
          aria-label={`Dígito ${i + 1} de ${CASAS_CODIGO}`}
          onChange={(e) => mudar(i, e.target.value)}
          onKeyDown={(e) => voltar(i, e)}
          className="h-11 w-8 rounded-md border border-input bg-input text-center text-lg font-semibold focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:h-12 sm:w-10"
        />
      ))}
    </div>
  )
}
