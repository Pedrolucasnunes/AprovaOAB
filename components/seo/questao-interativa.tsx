"use client"

import { useState } from "react"
import { CheckCircle2, XCircle } from "lucide-react"
import { GatedExplanation } from "@/components/seo/gated-explanation"

type Alt = { letra: string; texto: string }

// Alternativas interativas: o usuário tenta responder antes de ver o gabarito.
// SEO: o gabarito é SEMPRE renderizado no HTML do servidor — só fica escondido
// via CSS (`hidden`) até o clique. Nada é buscado por API depois, então o Googlebot
// enxerga a resposta normalmente.
export function QuestaoInterativa({
  alternativas,
  respostaCorreta,
  materia,
}: {
  alternativas: Alt[]
  respostaCorreta: string
  materia: string
}) {
  const [selecionada, setSelecionada] = useState<string | null>(null)
  const answered = selecionada !== null
  const acertou = answered && selecionada === respostaCorreta

  return (
    <div>
      <div className="space-y-2">
        {alternativas.map((alt) => {
          const isCorreta = alt.letra === respostaCorreta
          const corretaRevelada = answered && isCorreta
          const erradaSelecionada = answered && selecionada === alt.letra && !isCorreta
          const desbotada = answered && !isCorreta && selecionada !== alt.letra

          return (
            <button
              key={alt.letra}
              type="button"
              disabled={answered}
              onClick={() => !answered && setSelecionada(alt.letra)}
              className={`flex w-full items-start gap-3 rounded-lg border px-4 py-3 text-left transition-all duration-150 ${
                corretaRevelada
                  ? "border-primary/40 bg-primary/8"
                  : erradaSelecionada
                    ? "border-destructive/40 bg-destructive/8"
                    : desbotada
                      ? "border-border/50 opacity-50"
                      : "cursor-pointer border-border hover:border-primary/40 hover:bg-muted/40"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold ${
                  corretaRevelada
                    ? "bg-primary text-primary-foreground"
                    : erradaSelecionada
                      ? "bg-destructive text-destructive-foreground"
                      : "bg-muted text-foreground"
                }`}
              >
                {alt.letra}
              </span>
              <span className="flex-1 text-sm leading-relaxed text-foreground">{alt.texto}</span>
              {corretaRevelada && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
              {erradaSelecionada && <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />}
            </button>
          )
        })}
      </div>

      {/* Dica antes de responder */}
      {!answered && (
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Selecione uma alternativa para ver o gabarito.
        </p>
      )}

      {/* Gabarito + comentário gated — sempre no DOM (SEO), revelado via CSS após responder */}
      <div className={answered ? "mt-6" : "hidden"} aria-hidden={!answered}>
        <div
          className={`rounded-lg border p-4 ${
            acertou ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"
          }`}
        >
          <p className={`text-sm font-semibold ${acertou ? "text-primary" : "text-destructive"}`}>
            Gabarito: alternativa {respostaCorreta}
            {answered && (acertou ? " — você acertou! 🎉" : " — não foi dessa vez")}
          </p>
        </div>

        <GatedExplanation materia={materia} />
      </div>
    </div>
  )
}
