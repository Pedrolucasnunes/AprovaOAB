// Métricas de ativação — as definições num lugar só.
//
// Existe porque toda análise deste projeto saiu de arqueologia sobre
// `question_attempts`, e várias perguntas simples do brief eram impossíveis de
// responder ("quantos clicam no CTA da tela de resultado?") ou só respondíveis
// com ressalva grande. Aqui cada funil tem uma definição escrita, não uma query
// ad-hoc que ninguém consegue reproduzir depois.
//
// DUAS NATUREZAS, E O RÓTULO IMPORTA:
//
//   "retroativa"  -> question_attempts / diagnostic_sessions / users.
//                    Vale desde sempre.
//   "prospectiva" -> user_events. Vale desde o deploy da Fase D.
//
// Misturar sem rótulo produz número enganoso: um painel que só lê eventos
// mostraria "3 usuários iniciaram o Módulo 1" e pareceria que o produto morreu,
// quando a instrumentação começou ontem. Cada bloco carrega a sua natureza pra
// tela poder ser honesta sobre o que o número cobre.
//
// COORTE-JANELA, não antes/depois: "% que fez X dentro de N dias do cadastro",
// contando só usuários que já viveram a janela inteira. Comparar "total que já
// iniciou" entre grupos mede tempo de exposição, não comportamento. Mesma
// metodologia congelada em scripts/ativacao.mjs, que segue sendo o retrato da
// baseline da Fase 0 — este módulo é o painel vivo.
import { getDiagnosticoConfig } from "@/lib/config"
import { parseDbDate, ymdBrasil } from "@/lib/datas"
import { fetchAllRows } from "@/lib/supabase-paginate"
import { supabaseAdmin } from "@/lib/supabase-admin"

export type Natureza = "retroativa" | "prospectiva"

const DIA_MS = 86_400_000

export interface FunilCoorte {
  natureza: Natureza
  /** Usuários que já viveram a janela inteira — o denominador honesto. */
  maduros: number
  /** Cadastrados dentro da janela, ainda não contáveis. */
  imaturos: number
  iniciaramM1: number
  concluiramM1: number
  fizeramTreino: number
  /** Concluiu o M1 E fez treino depois — o handoff. */
  handoff: number
}

export interface AbandonoPorPosicao {
  natureza: Natureza
  /** Sessões em andamento agrupadas pela questão onde pararam. */
  histograma: { posicao: number; sessoes: number }[]
  emAndamento: number
  totalSessoes: number
  /** Tamanho nominal do M1 — dá eixo ao histograma (1 barra em 16, não 1 em 1). */
  tamanhoModulo: number
}

export interface Modulo2 {
  natureza: Natureza
  /** De user_events — só depois do deploy da Fase D. */
  aberturasPorEvento: number
  /** De question_attempts.diagnostic_module — vale desde sempre. */
  usuariosComRespostaM2: number
  concluiram: number
}

export interface Retorno {
  natureza: Natureza
  /** Usuários com atividade em 2+ dias distintos (fuso BR). */
  voltaramOutroDia: number
  ativos: number
  /** Distribuição: quantos usuários tiveram N dias de atividade. */
  distribuicaoDias: { dias: number; usuarios: number }[]
}

export interface LimiteDiario {
  natureza: Natureza
  /** Chegou a `limite` respostas de treino num dia (histórico). */
  atingiramTeto: { free: number; pro: number }
  /** Quantos DIAS cada usuário free bateu o teto. */
  frequenciaFree: { dias: number; usuarios: number }[]
  /** Distribuição de questões por dia-usuário ativo, free vs pro. */
  distribuicaoPorDia: { faixa: string; free: number; pro: number }[]
  /** Tentativas RECUSADAS — só do evento, desde o deploy. */
  barrados: { total: number; usuarios: number; porMotivo: Record<string, number> }
  limite: number
  /** Média de questões/dia dos Pro nos dias em que passaram do teto. */
  mediaProAcimaDoTeto: number | null
}

export interface Metricas {
  janelaDias: number
  /** Primeiro evento registrado — o "vale desde" dos blocos prospectivos. */
  eventosDesde: string | null
  totalUsuarios: number
  descartadasPorTempo: number
  respostasDiagnostico: number
  funil: FunilCoorte
  abandono: AbandonoPorPosicao
  modulo2: Modulo2
  retorno: Retorno
  limiteDiario: LimiteDiario
}

interface AttemptRow {
  user_id: string
  created_at: string
  is_diagnostic: boolean
  time_spent_ms: number | null
  diagnostic_module: string | null
}

export async function calcularMetricas(janelaDias = 7): Promise<Metricas> {
  const { minTempoRespostaMs, modulos } = await getDiagnosticoConfig()
  const m1 = modulos.find((m) => m.id === "m1")
  const tamanhoModulo = m1 ? m1.subjects.length * m1.questoesPorMateria : 16

  const [usersRows, attempts, sessoes, eventos, limitesCfg] = await Promise.all([
    fetchAllRows<{ id: string; created_at: string; role: string; plano: string }>(() =>
      supabaseAdmin.from("users").select("id, created_at, role, plano"),
    ),
    fetchAllRows<AttemptRow>(() =>
      supabaseAdmin
        .from("question_attempts")
        .select("user_id, created_at, is_diagnostic, time_spent_ms, diagnostic_module"),
    ),
    fetchAllRows<{ user_id: string; modulo: string; status: string; posicao: number; question_ids: string[] }>(
      () =>
        supabaseAdmin
          .from("diagnostic_sessions")
          .select("user_id, modulo, status, posicao, question_ids"),
    ),
    fetchAllRows<{ user_id: string | null; event: string; props: Record<string, unknown>; created_at: string }>(
      () => supabaseAdmin.from("user_events").select("user_id, event, props, created_at"),
    ),
    supabaseAdmin.from("app_config").select("value").eq("key", "limites").maybeSingle(),
  ])

  const limite =
    (limitesCfg.data?.value as { freeDailyLimit?: number } | null)?.freeDailyLimit ?? 10

  // Admins fora de tudo: são nós testando, não usuários.
  const usuarios = usersRows.filter((u) => u.role !== "admin")
  const planoPorUser = new Map(usuarios.map((u) => [u.id, u.plano]))
  const criadoEm = new Map(usuarios.map((u) => [u.id, parseDbDate(u.created_at)]))

  const agora = Date.now()
  /** Respostas < minTempoRespostaMs são clique, não resposta. Nulo conta como válida. */
  const valida = (a: AttemptRow) => !(a.time_spent_ms !== null && a.time_spent_ms < minTempoRespostaMs)
  const maduro = (uid: string) => {
    const c = criadoEm.get(uid)
    return c ? agora - c.getTime() >= janelaDias * DIA_MS : false
  }
  const naJanela = (uid: string, a: AttemptRow) => {
    const c = criadoEm.get(uid)
    return c ? parseDbDate(a.created_at).getTime() - c.getTime() <= janelaDias * DIA_MS : false
  }

  const porUser = new Map<string, { diag: AttemptRow[]; treino: AttemptRow[] }>()
  for (const u of usuarios) porUser.set(u.id, { diag: [], treino: [] })
  for (const a of attempts) {
    const bucket = porUser.get(a.user_id)
    if (!bucket) continue
    ;(a.is_diagnostic ? bucket.diag : bucket.treino).push(a)
  }

  const descartadasPorTempo = attempts.filter((a) => !valida(a)).length
  const respostasDiagnostico = attempts.filter((a) => a.is_diagnostic).length

  // ── 1 e 2. Funil de ativação, coorte-janela ──────────────────────────────
  const idsMaduros = usuarios.map((u) => u.id).filter(maduro)
  const concluidasPorUser = new Map<string, Set<string>>()
  for (const s of sessoes) {
    if (s.status !== "concluida") continue
    if (!concluidasPorUser.has(s.user_id)) concluidasPorUser.set(s.user_id, new Set())
    concluidasPorUser.get(s.user_id)!.add(s.modulo)
  }

  let iniciaramM1 = 0
  let concluiramM1 = 0
  let fizeramTreino = 0
  let handoff = 0
  for (const uid of idsMaduros) {
    const b = porUser.get(uid)!
    const diagNaJanela = b.diag.filter((a) => naJanela(uid, a) && valida(a))
    const treinoNaJanela = b.treino.filter((a) => naJanela(uid, a))

    if (diagNaJanela.length > 0) iniciaramM1 += 1
    // Conclusão pela SESSÃO quando existe; pelos legados (m0, sem sessão) cai na
    // contagem de respostas válidas — mesmo critério do /api/dashboard.
    const concluiu = concluidasPorUser.get(uid)?.has("m1") ?? diagNaJanela.length >= 5
    if (concluiu) concluiramM1 += 1
    if (treinoNaJanela.length > 0) fizeramTreino += 1
    if (concluiu && treinoNaJanela.length > 0) handoff += 1
  }

  // ── Onde abandonam: posição das sessões paradas ───────────────────────────
  const emAndamento = sessoes.filter(
    (s) => s.status === "em_andamento" && planoPorUser.has(s.user_id),
  )
  const contagemPosicao = new Map<number, number>()
  for (const s of emAndamento) {
    contagemPosicao.set(s.posicao, (contagemPosicao.get(s.posicao) ?? 0) + 1)
  }

  // ── 3. Módulo 2 ──────────────────────────────────────────────────────────
  const usuariosComRespostaM2 = new Set(
    attempts.filter((a) => a.diagnostic_module === "m2" && planoPorUser.has(a.user_id)).map((a) => a.user_id),
  ).size

  // ── 4. Retorno em outro dia ──────────────────────────────────────────────
  const diasPorUser = new Map<string, Set<string>>()
  for (const a of attempts) {
    if (!planoPorUser.has(a.user_id)) continue
    if (!diasPorUser.has(a.user_id)) diasPorUser.set(a.user_id, new Set())
    diasPorUser.get(a.user_id)!.add(ymdBrasil(parseDbDate(a.created_at)))
  }
  const distDias = new Map<number, number>()
  let voltaramOutroDia = 0
  for (const dias of diasPorUser.values()) {
    const n = dias.size
    // Agrupa a cauda: "5+" em vez de uma barra por valor.
    const bucket = n >= 5 ? 5 : n
    distDias.set(bucket, (distDias.get(bucket) ?? 0) + 1)
    if (n >= 2) voltaramOutroDia += 1
  }

  // ── 5. Limite diário ─────────────────────────────────────────────────────
  // Só respostas de TREINO contam: o diagnóstico é isento do limite, e incluí-lo
  // faria parecer que o usuário bateu o teto quando ele só fez o diagnóstico.
  const porUserDia = new Map<string, number>()
  for (const a of attempts) {
    if (a.is_diagnostic) continue
    if (!planoPorUser.has(a.user_id)) continue
    const chave = `${a.user_id}|${ymdBrasil(parseDbDate(a.created_at))}`
    porUserDia.set(chave, (porUserDia.get(chave) ?? 0) + 1)
  }

  const diasNoTetoPorUser = new Map<string, number>()
  const faixas = [
    { faixa: "1–3", min: 1, max: 3 },
    { faixa: "4–6", min: 4, max: 6 },
    { faixa: `7–${limite - 1}`, min: 7, max: limite - 1 },
    { faixa: `${limite}+`, min: limite, max: Infinity },
  ]
  const dist = faixas.map((f) => ({ faixa: f.faixa, free: 0, pro: 0 }))
  let somaProAcima = 0
  let diasProAcima = 0

  for (const [chave, n] of porUserDia) {
    const uid = chave.split("|")[0]
    const ehFree = planoPorUser.get(uid) === "free"
    const idx = faixas.findIndex((f) => n >= f.min && n <= f.max)
    if (idx >= 0) {
      if (ehFree) dist[idx].free += 1
      else dist[idx].pro += 1
    }
    if (n >= limite) {
      // Pro não tem teto: pra ele `limite` não é limite, é uso. A distribuição
      // ACIMA do teto é a melhor estimativa de demanda reprimida que existe.
      if (ehFree) diasNoTetoPorUser.set(uid, (diasNoTetoPorUser.get(uid) ?? 0) + 1)
      else {
        somaProAcima += n
        diasProAcima += 1
      }
    }
  }

  const proNoTeto = new Set(
    [...porUserDia.entries()]
      .filter(([chave, n]) => n >= limite && planoPorUser.get(chave.split("|")[0]) !== "free")
      .map(([chave]) => chave.split("|")[0]),
  )

  const freqFree = new Map<number, number>()
  for (const dias of diasNoTetoPorUser.values()) {
    freqFree.set(dias, (freqFree.get(dias) ?? 0) + 1)
  }

  const eventosLimite = eventos.filter((e) => e.event === "limite_diario_atingido")
  const porMotivo: Record<string, number> = {}
  for (const e of eventosLimite) {
    const motivo = String(e.props?.motivo ?? "desconhecido")
    porMotivo[motivo] = (porMotivo[motivo] ?? 0) + 1
  }

  const primeiroEvento = eventos.reduce<string | null>((min, e) => {
    return !min || e.created_at < min ? e.created_at : min
  }, null)

  return {
    janelaDias,
    eventosDesde: primeiroEvento,
    totalUsuarios: usuarios.length,
    descartadasPorTempo,
    respostasDiagnostico,
    funil: {
      natureza: "retroativa",
      maduros: idsMaduros.length,
      imaturos: usuarios.length - idsMaduros.length,
      iniciaramM1,
      concluiramM1,
      fizeramTreino,
      handoff,
    },
    abandono: {
      natureza: "retroativa",
      histograma: [...contagemPosicao.entries()]
        .map(([posicao, sessoes]) => ({ posicao, sessoes }))
        .sort((a, b) => a.posicao - b.posicao),
      emAndamento: emAndamento.length,
      totalSessoes: sessoes.filter((s) => planoPorUser.has(s.user_id)).length,
      tamanhoModulo,
    },
    modulo2: {
      natureza: "retroativa",
      aberturasPorEvento: eventos.filter(
        (e) => e.event === "diagnostico_modulo_iniciado" && e.props?.modulo === "m2",
      ).length,
      usuariosComRespostaM2,
      concluiram: [...concluidasPorUser.values()].filter((s) => s.has("m2")).length,
    },
    retorno: {
      natureza: "retroativa",
      voltaramOutroDia,
      ativos: diasPorUser.size,
      distribuicaoDias: [...distDias.entries()]
        .map(([dias, usuarios]) => ({ dias, usuarios }))
        .sort((a, b) => a.dias - b.dias),
    },
    limiteDiario: {
      natureza: "retroativa",
      atingiramTeto: { free: diasNoTetoPorUser.size, pro: proNoTeto.size },
      frequenciaFree: [...freqFree.entries()]
        .map(([dias, usuarios]) => ({ dias, usuarios }))
        .sort((a, b) => a.dias - b.dias),
      distribuicaoPorDia: dist,
      barrados: {
        total: eventosLimite.length,
        usuarios: new Set(eventosLimite.map((e) => e.user_id).filter(Boolean)).size,
        porMotivo,
      },
      limite,
      mediaProAcimaDoTeto: diasProAcima > 0 ? Number((somaProAcima / diasProAcima).toFixed(1)) : null,
    },
  }
}
