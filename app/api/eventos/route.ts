import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireUser } from "@/lib/auth-server"
import { EVENTOS_DO_CLIENTE, track, type Evento } from "@/lib/events"
import { rateLimit } from "@/lib/rate-limit"

// Única porta de entrada do cliente para `user_events`.
//
// Existe por um motivo só: o clique no CTA da parede não tem como nascer no
// servidor — ele acontece ANTES de qualquer requisição, e é justamente a
// métrica que diz se a parede converte. Todo o resto continua sendo emitido
// server-side, onde não dá pra forjar.
//
// `lib/analytics.ts` (dataLayer do GTM) não serve aqui: ele manda pro GA4, e a
// análise deste produto sai do `/admin/metricas`, que lê `user_events`. Dado
// que não chega no painel é dado que não vai ser olhado.

const MAX_PROPS = 12
const MAX_TEXTO = 120

const schema = z.object({
  event: z.string().min(1).max(64),
  // Props achatadas de propósito: valor aninhado vira objeto de tamanho
  // arbitrário gravado por um cliente, e isso é payload, não telemetria.
  props: z
    .record(z.string().max(40), z.union([z.string().max(MAX_TEXTO), z.number(), z.boolean(), z.null()]))
    .refine((p) => Object.keys(p).length <= MAX_PROPS, `no máximo ${MAX_PROPS} props`)
    .default({}),
})

export async function POST(req: NextRequest) {
  // Teto generoso: telemetria não pode virar o motivo de uma tela travar.
  const rl = await rateLimit(req, "eventos", 60, 60)
  if (!rl.success) {
    return NextResponse.json({ error: "Muitas requisições." }, { status: 429 })
  }

  const { user, error } = await requireUser()
  if (error) return error

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 })
  }

  const { event, props } = parsed.data

  // Lista fechada, não filtro por prefixo: nome livre deixaria qualquer usuário
  // logado inventar métrica no painel.
  if (!EVENTOS_DO_CLIENTE.includes(event as Evento)) {
    return NextResponse.json({ error: "Evento não aceito" }, { status: 400 })
  }

  await track(user.id, event as Evento, props)

  return NextResponse.json({ ok: true }, { status: 202 })
}
