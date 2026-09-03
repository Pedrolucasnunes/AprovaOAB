"use client"

import { TrendingDown, TrendingUp } from "lucide-react"
import {
  compararComAnterior,
  concentracaoDeErros,
  type ContagemResultado,
  type MateriaResultado,
} from "@/lib/simulado-resultado"
import { cn } from "@/lib/utils"
import { META_APROVACAO } from "@/lib/metrics"

interface ResultadoHeroProps {
  contagem: ContagemResultado
  /** Já agregado pela página — a mesma lista que alimenta "onde perdeu pontos". */
  materias: MateriaResultado[]
  numeroQuestoes: number
  notaDeCorte: number
  percentual: number
  anterior: { percentual: number; acertos: number; numeroQuestoes: number } | null
}

const RAIO = 70
const CIRCUNFERENCIA = 2 * Math.PI * RAIO

/**
 * O topo da tela de resultado: quanto foi, se passou, e o que explica o número.
 *
 * O medidor é um círculo INTEIRO começando às 12h, e não um arco de 180° ou
 * 270°, porque assim a nota de corte de 50% cai exatamente às 6h — o traço de
 * referência fica num ponto que se lê sem legenda.
 */
export function ResultadoHero({
  contagem,
  materias,
  numeroQuestoes,
  notaDeCorte,
  percentual,
  anterior,
}: ResultadoHeroProps) {
  const passou = contagem.acertos >= notaDeCorte
  const faltam = notaDeCorte - contagem.acertos
  const concentracao = concentracaoDeErros(materias)

  const comparacao = anterior
    ? compararComAnterior(
        { acertos: contagem.acertos, percentual, numeroQuestoes },
        anterior,
      )
    : null

  const stats = [
    { label: "Acertos", valor: contagem.acertos, cor: "text-primary" },
    { label: "Erros", valor: contagem.erros, cor: "text-destructive" },
    { label: "Em branco", valor: contagem.brancos, cor: "text-muted-foreground" },
    {
      label: "Nota de corte",
      valor: notaDeCorte,
      cor: "text-foreground",
      rodape: "acertos",
    },
  ]

  return (
    <section className="rounded-xl border border-border bg-card p-5 sm:p-7">
      <div className="flex flex-col items-center gap-7 lg:flex-row lg:items-center lg:gap-10">
        {/* ── Medidor ─────────────────────────────────────────── */}
        <div className="shrink-0 text-center">
          <div className="relative">
            <svg viewBox="0 0 180 180" className="h-44 w-44 -rotate-90">
              <circle
                cx="90"
                cy="90"
                r={RAIO}
                fill="none"
                strokeWidth="12"
                className="stroke-muted"
              />
              <circle
                cx="90"
                cy="90"
                r={RAIO}
                fill="none"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${(percentual / 100) * CIRCUNFERENCIA} ${CIRCUNFERENCIA}`}
                className={cn(passou ? "stroke-primary" : "stroke-destructive")}
              />
              {/* Traço da nota de corte: 50% de uma volta = 6h no mostrador.
                  O `rotate(90)` cancela o `-rotate-90` do <svg>: sem ele o
                  traço cai às 9h, que não é meia volta de lugar nenhum. */}
              <line
                x1="90"
                y1={90 + RAIO - 9}
                x2="90"
                y2={90 + RAIO + 9}
                strokeWidth="2"
                className="stroke-foreground/60"
                transform="rotate(90 90 90)"
              />
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p
                className={cn(
                  "text-4xl font-bold tabular-nums",
                  passou ? "text-primary" : "text-destructive",
                )}
              >
                {Math.round(percentual)}%
              </p>
              <p className="text-[0.65rem] tracking-widest text-muted-foreground uppercase">
                Aproveitamento
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                {contagem.acertos} de {numeroQuestoes} acertos
              </p>
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            <span className="mr-1.5 inline-block h-px w-3 bg-foreground/60 align-middle" />
            nota de corte da OAB: {META_APROVACAO}% ({notaDeCorte} acertos)
          </p>
        </div>

        {/* ── Leitura ─────────────────────────────────────────── */}
        <div className="min-w-0 flex-1 text-center lg:text-left">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.7rem] font-medium tracking-wide uppercase",
              passou
                ? "bg-primary/10 text-primary"
                : "bg-destructive/10 text-destructive",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                passou ? "bg-primary" : "bg-destructive",
              )}
            />
            {passou ? "Acima da nota de corte" : "Abaixo da nota de corte"}
          </span>

          {/* Fala do SIMULADO, não da prova. "Faltam 24 acertos pra você passar
              da 1ª fase" transforma uma medição num prognóstico sobre um exame
              que ainda não aconteceu. */}
          <h2 className="mt-3 text-2xl font-bold text-balance text-foreground sm:text-3xl">
            {passou
              ? `Você ficou ${contagem.acertos - notaDeCorte === 0 ? "exatamente na" : `${contagem.acertos - notaDeCorte} acerto${contagem.acertos - notaDeCorte > 1 ? "s" : ""} acima da`} nota de corte.`
              : `Faltam ${faltam} acerto${faltam > 1 ? "s" : ""} pra nota de corte.`}
          </h2>

          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Você acertou {contagem.acertos} de {numeroQuestoes} e a OAB exige{" "}
            {notaDeCorte}.
            {contagem.brancos > 0 && (
              <>
                {" "}
                Ficaram <strong className="text-foreground">{contagem.brancos} em branco</strong> —
                elas contam como erro na nota, mas não dizem nada sobre o que
                você sabe.
              </>
            )}
            {concentracao && (
              <>
                {" "}
                {concentracao.erros} dos seus {concentracao.totalErros} erros estão
                em só {concentracao.areas} áreas, então há um caminho curto pra
                ganhar pontos.
              </>
            )}
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-lg border border-border bg-background px-3 py-2.5 text-left"
              >
                <p className="text-[0.65rem] tracking-widest text-muted-foreground uppercase">
                  {stat.label}
                </p>
                <p className={cn("text-2xl font-bold tabular-nums", stat.cor)}>
                  {stat.valor}
                </p>
                {stat.rodape && (
                  <p className="text-[0.65rem] text-muted-foreground">{stat.rodape}</p>
                )}
              </div>
            ))}
          </div>

          {comparacao && comparacao.delta !== 0 && (
            <p
              className={cn(
                "mt-4 flex items-center justify-center gap-2 border-l-2 pl-3 text-sm lg:justify-start",
                comparacao.delta > 0
                  ? "border-primary text-muted-foreground"
                  : "border-destructive text-muted-foreground",
              )}
            >
              {comparacao.delta > 0 ? (
                <TrendingUp className="h-4 w-4 shrink-0 text-primary" />
              ) : (
                <TrendingDown className="h-4 w-4 shrink-0 text-destructive" />
              )}
              <span>
                <strong
                  className={comparacao.delta > 0 ? "text-primary" : "text-destructive"}
                >
                  {comparacao.delta > 0 ? "+" : ""}
                  {comparacao.delta}{" "}
                  {comparacao.unidade === "acertos"
                    ? Math.abs(comparacao.delta) === 1
                      ? "acerto"
                      : "acertos"
                    : "pontos percentuais"}
                </strong>{" "}
                em relação ao seu simulado anterior.
              </span>
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
