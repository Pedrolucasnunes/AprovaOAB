"use client"

import Link from "next/link"
import { AlertTriangle, CalendarDays, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PAREDE_CTA_CLICADO, trackClient } from "@/lib/events-client"
import {
  estadoDaParede,
  frasePeriodo,
  type DiasNoTeto,
  type EstadoParede,
  type SessaoParede,
} from "@/lib/limite-diario"

// A parede do limite diário — UMA superfície, três variantes de renderização.
//
// Antes eram seis blocos com copy própria (dois no treino, dois nas questões,
// mais o card de "poucas questões restantes" e o recuo silencioso do seletor).
// Eles já discordavam entre si: um citava a matéria fraca, outro o calendário,
// outro as questões avulsas, e um não citava nada. Mudar a mensagem exigia
// editar seis lugares, e por isso ela nunca mudava.
//
// Princípio da copy: mostrar o que a pessoa conquistou antes do que ela não
// pode fazer, e nunca terminar a sessão com uma parede seca. O caminho gratuito
// fica visível nos dois estados — ninguém pode sair com a sensação de ter sido
// expulso.
//
// Preço não aparece aqui de propósito: ele muda, e a fonte única é
// `lib/planos.ts`. Parede que cita valor é parede que envelhece errado.

export type OrigemParede =
  | "treino_modal"
  | "treino_card"
  | "treino_restante"
  | "questoes_banner"
  | "questoes_inline"
  | "simulado_hero"

type Destino = "desempenho" | "calendario" | "trial" | "planos" | "questoes"

export interface ParedeProps {
  /** Teto do dia, vindo do servidor (`app_config`) — nunca hardcoded na tela. */
  limite: number
  diasNoTeto: DiasNoTeto
  trialDisponivel: boolean
  origem: OrigemParede
  /** Resumo das respostas SALVAS da sessão que acabou de ser barrada. */
  sessao?: SessaoParede | null
  /** Top-1 da lista de risco, quando a tela tem. */
  materiaFraca?: string | null
}

export interface ConteudoParede {
  estado: EstadoParede
  titulo: string
  corpo: string
  cta: { label: string; href: string; destino: Destino }
  /** A saída gratuita. Sempre presente no estado de oferta. */
  alternativa: string | null
}

const ROTAS: Record<Destino, string> = {
  desempenho: "/dashboard/desempenho",
  calendario: "/dashboard/calendario",
  trial: "/dashboard/perfil/trial",
  planos: "/#planos",
  questoes: "/dashboard/questoes",
}

/**
 * Toda a decisão de copy num lugar só. Pura — dá pra ler os quatro ramos sem
 * abrir nenhuma tela.
 */
export function conteudoDaParede({
  limite,
  diasNoTeto,
  trialDisponivel,
  sessao,
  materiaFraca,
}: ParedeProps): ConteudoParede {
  const estado = estadoDaParede(diasNoTeto.total)

  if (estado === "habito") {
    // Primeiras vezes: a pessoa tem meia hora de produto. Vender aqui é cedo —
    // o que empurra é o hábito de voltar.
    return {
      estado,
      titulo: "Por hoje é isso.",
      corpo: resumoDaSessao(sessao, limite),
      cta: { label: "Ver meu desempenho", href: ROTAS.desempenho, destino: "desempenho" },
      alternativa: null,
    }
  }

  // Estado de oferta: a restrição já foi sentida várias vezes.
  const frequencia = frasePeriodo(diasNoTeto.total, diasNoTeto.ultimos7)

  return {
    estado,
    titulo: frequencia
      ? `${frequencia} que você bate no limite.`
      : "Você está batendo no limite com frequência.",
    corpo: materiaFraca
      ? `Quem estuda nesse ritmo costuma querer mais de ${limite} por dia — e o seu ponto mais fraco hoje é ${materiaFraca}.`
      : `Quem estuda nesse ritmo costuma querer mais de ${limite} por dia.`,
    cta: trialDisponivel
      ? { label: "Testar Pro 7 dias grátis", href: ROTAS.trial, destino: "trial" }
      : { label: "Ver o plano completo", href: ROTAS.planos, destino: "planos" },
    alternativa: `Ou volta amanhã — as ${limite} do dia seguinte continuam suas.`,
  }
}

/**
 * "10 questões de Direito Constitucional — 3 certas."
 *
 * Sem elogio e sem repreensão: o número é informação, do mesmo jeito que na
 * tela de resultado do diagnóstico. Matéria só é citada quando a sessão inteira
 * foi de uma — senão eleger uma seria inventar foco que não houve.
 */
function resumoDaSessao(sessao: SessaoParede | null | undefined, limite: number): string {
  if (!sessao) {
    return `Você completou suas ${limite} questões de hoje. Amanhã tem mais ${limite}, e o plano continua de onde parou.`
  }

  const plural = sessao.total === 1 ? "questão" : "questões"
  const certas = sessao.acertos === 1 ? "1 certa" : `${sessao.acertos} certas`
  const onde = sessao.materia ? ` de ${sessao.materia}` : ""

  // "Isso fecha suas N de hoje" existe pra não deixar o número da sessão ser
  // lido como o número do dia: quem respondeu 6 no banco de questões e 4 aqui
  // veria "4 questões" e se perguntaria por que foi barrado em 4.
  return `${sessao.total} ${plural}${onde} — ${certas}. Isso fecha suas ${limite} de hoje; amanhã tem mais ${limite} e o treino continua de onde parou.`
}

/** Botão do CTA. Instrumenta o clique — é a métrica que diz se a parede converte. */
export function ParedeCta({
  conteudo,
  origem,
  diasNoTeto,
  variant = "default",
  className,
}: {
  conteudo: ConteudoParede
  origem: OrigemParede
  diasNoTeto: DiasNoTeto
  variant?: "default" | "outline"
  className?: string
}) {
  return (
    <Button asChild variant={variant} className={className}>
      <Link
        href={conteudo.cta.href}
        onClick={() =>
          trackClient(PAREDE_CTA_CLICADO, {
            estado: conteudo.estado,
            origem,
            destino: conteudo.cta.destino,
            dias_no_teto: diasNoTeto.total,
          })
        }
      >
        {conteudo.cta.destino === "trial" ? <Sparkles className="h-4 w-4" /> : null}
        {conteudo.cta.label}
      </Link>
    </Button>
  )
}

/** Card cheio — entrada do treino e topo do banco de questões. */
export function ParedeLimiteCard(props: ParedeProps & { secundario?: Destino }) {
  const conteudo = conteudoDaParede(props)
  const secundario = props.secundario

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            {conteudo.estado === "habito" ? (
              <CalendarDays className="h-5 w-5 text-primary" />
            ) : (
              <Sparkles className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{conteudo.titulo}</p>
            <p className="text-sm text-muted-foreground">{conteudo.corpo}</p>
            {conteudo.alternativa ? (
              <p className="pt-1 text-xs text-muted-foreground">{conteudo.alternativa}</p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <ParedeCta
            conteudo={conteudo}
            origem={props.origem}
            diasNoTeto={props.diasNoTeto}
            className="flex-1 gap-1.5"
          />
          {secundario ? (
            <Button asChild variant="outline" className="flex-1">
              <Link href={ROTAS[secundario]}>{LABEL_SECUNDARIO[secundario]}</Link>
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

const LABEL_SECUNDARIO: Record<Destino, string> = {
  desempenho: "Ver meu desempenho",
  calendario: "Ver meu calendário",
  trial: "Testar Pro 7 dias grátis",
  planos: "Ver o plano completo",
  questoes: "Ir para Questões avulsas",
}

/**
 * Aviso curto no ponto do clique. Existe porque o banner do topo não é visível
 * no modo foco do banco de questões e não explica que a resposta não foi salva.
 */
export function ParedeLimiteInline(props: ParedeProps & { avisoNaoSalvo?: boolean }) {
  const conteudo = conteudoDaParede(props)

  return (
    <p className="mt-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
      {props.avisoNaoSalvo ? (
        <span className="text-muted-foreground">Esta resposta não foi registrada. </span>
      ) : null}
      <strong className="font-semibold">{conteudo.titulo}</strong> {conteudo.corpo}{" "}
      <Link
        href={conteudo.cta.href}
        onClick={() =>
          trackClient(PAREDE_CTA_CLICADO, {
            estado: conteudo.estado,
            origem: props.origem,
            destino: conteudo.cta.destino,
            dias_no_teto: props.diasNoTeto.total,
          })
        }
        className="text-primary underline underline-offset-2"
      >
        {conteudo.cta.label}
      </Link>
    </p>
  )
}

/**
 * Cota insuficiente para o menor treino — o usuário AINDA TEM saldo, então isto
 * não é a parede: é aviso de que o treino não cabe.
 *
 * `pedido` é o que ele tinha selecionado antes do recuo automático. Mostrá-lo é
 * o ponto: até agora o app rebaixava 20 para 5 em silêncio, destruindo a
 * intenção sem nunca reconhecê-la — e essa intenção é justamente o sinal de
 * demanda que queremos enxergar.
 */
export function ParedeRestante({
  restante,
  pedido,
  menorTreino,
  trialDisponivel,
  diasNoTeto,
  limite,
  materiaFraca,
}: {
  restante: number
  pedido: number | null
  menorTreino: number
  trialDisponivel: boolean
  diasNoTeto: DiasNoTeto
  limite: number
  materiaFraca?: string | null
}) {
  const conteudo = conteudoDaParede({
    limite,
    diasNoTeto,
    trialDisponivel,
    origem: "treino_restante",
    materiaFraca,
  })

  return (
    <Card>
      <CardContent className="space-y-4 p-6 text-center">
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">
            {pedido ? `Você pediu ${pedido} questões — cabem ${restante} hoje` : "Poucas questões restantes hoje"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Sobrou {restante} {restante === 1 ? "questão" : "questões"} da sua cota de {limite} no
            plano Grátis — menos que o menor treino ({menorTreino} questões). Dá pra responder em
            Questões avulsas, ou voltar amanhã para um treino completo.
          </p>
        </div>
        <div className="flex flex-col gap-2 pt-2 sm:flex-row">
          <Button asChild className="flex-1">
            <Link href={ROTAS.questoes}>Ir para Questões avulsas</Link>
          </Button>
          <ParedeCta
            conteudo={conteudo}
            origem="treino_restante"
            diasNoTeto={diasNoTeto}
            variant="outline"
            className="flex-1 gap-1.5"
          />
        </div>
      </CardContent>
    </Card>
  )
}
