import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { rateLimit } from "@/lib/rate-limit"
import { checkDailyLimit } from "@/lib/check-daily-limit"
import { fetchAllRows, fetchByIds } from "@/lib/supabase-paginate"
import { EVENTOS, track } from "@/lib/events"
import { TAXA_CRITICA } from "@/lib/metrics"
import { placarPorMateria, taxaDoPlacar } from "@/lib/services/desempenho"
import { logError } from "@/lib/logger"

type QuestaoTreino = {
  id: string
  enunciado: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  subject_id: string
  topic_id: string | null
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, "treino", 30, 60)
  if (!rl.success) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde alguns segundos." }, { status: 429 })
  }

  const { user, supabase, error } = await requireUser()
  if (error) return error

  const userId = user.id

  let body: { quantidade?: unknown; materia?: unknown; origem?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  }

  const { quantidade, materia } = body
  const totalQuestoes = [5, 10, 20, 30].includes(Number(quantidade)) ? Number(quantidade) : 10
  const materiaFiltrada = typeof materia === "string" && materia.length > 0 ? materia : null
  // De onde o treino foi disparado. "diagnostico" = o CTA da tela de resultado.
  // É assim que respondemos "quantos concluem o Módulo 1 e clicam no CTA?" —
  // pergunta do brief original que hoje é impossível de responder.
  const origem = typeof body.origem === "string" && body.origem.length <= 32 ? body.origem : "treino"

  // Limite diário do plano free — verificado antes de montar o treino
  const { data: userPlanoRow } = await supabase
    .from("users")
    .select("plano")
    .eq("id", userId)
    .single()

  const plano = (userPlanoRow?.plano ?? "free") as "free" | "pro" | "aprovacao"
  const limit = await checkDailyLimit(supabase, userId, plano)

  if (limit.exceeded) {
    void track(userId, EVENTOS.LIMITE_DIARIO_ATINGIDO, {
      origem: "treino",
      motivo: "teto",
      limite: limit.limit,
      count: limit.count,
      quantidade_pedida: totalQuestoes,
    })
    return NextResponse.json(
      { error: "Você já completou suas 10 questões de hoje.", limiteDiario: true, upgrade: true },
      { status: 403 }
    )
  }

  // Free: bloqueia se o treino pedido for maior do que resta do limite diário —
  // em vez de montar um treino que o usuário seria barrado de terminar no meio.
  const restante = limit.limit - limit.count
  if (plano === "free" && totalQuestoes > restante) {
    // Motivo distinto do "teto" de propósito: aqui a intenção foi barrada ANTES
    // de gastar a cota — o usuário pediu 20 tendo 3 disponíveis. É sinal de
    // demanda mais forte que bater no limite depois de consumir tudo.
    void track(userId, EVENTOS.LIMITE_DIARIO_ATINGIDO, {
      origem: "treino",
      motivo: "treino_maior_que_restante",
      limite: limit.limit,
      count: limit.count,
      restante,
      quantidade_pedida: totalQuestoes,
    })
    return NextResponse.json(
      {
        error: `Você tem só ${restante} ${restante === 1 ? "questão restante" : "questões restantes"} hoje no plano Grátis. Escolha um treino menor ou volte amanhã.`,
        limiteDiario: true,
        upgrade: true,
        restante,
      },
      { status: 403 }
    )
  }

  let sessaoFocada = totalQuestoes === 5 && !materiaFiltrada
  let qtdRisco = sessaoFocada ? totalQuestoes : Math.round(totalQuestoes * 0.7)
  let qtdGeral = totalQuestoes - qtdRisco

  // 1. Questões já acertadas pelo usuário (simulados + treino avulso em paralelo).
  //    Paginado: um usuário ativo pode passar de 1000 acertos.
  const attemptIds = (
    await fetchAllRows<{ id: string }>(
      () => supabase.from("simulado_attempts").select("id").eq("user_id", userId),
    )
  ).map((a) => a.id)

  const [simAcertou, treinoAttempts] = await Promise.all([
    fetchByIds<{ question_id: string }>(
      (ids) => supabase.from("simulado_respostas").select("question_id").eq("acertou", true).in("attempt_id", ids),
      attemptIds,
    ),
    // Só os acertos importam aqui: alimentam a exclusão de repetição. A
    // priorização por matéria saiu daqui e virou placarPorMateria (passo 2.5).
    fetchAllRows<{ question_id: string; acertou: boolean }>(
      () => supabase.from("question_attempts").select("question_id, acertou").eq("user_id", userId),
    ),
  ])

  const idsJaAcertou = new Set<string>([
    ...simAcertou.map((r) => r.question_id),
    ...treinoAttempts.filter((a) => a.acertou).map((r) => r.question_id),
  ])

  // Sorteia `n` questões de um escopo (matérias ou banco todo), excluindo ids já usados.
  // Filtra em JS (sem .not(id in ...) na URL, que estoura com muitos UUIDs) e pagina os
  // candidatos (o banco passa de 1000). Busca os campos completos só das escolhidas.
  const QFIELDS =
    "id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, subject_id, topic_id"
  async function sortearQuestoes(
    n: number,
    subjectIds: string[] | null,
    excluir: Set<string>,
  ): Promise<QuestaoTreino[]> {
    if (n <= 0) return []
    try {
      const candidatos = await fetchAllRows<{ id: string }>(() => {
        let q = supabase.from("questions").select("id")
        if (subjectIds) q = q.in("subject_id", subjectIds)
        return q
      })
      const escolhidos = candidatos
        .map((c) => c.id)
        .filter((id) => !excluir.has(id))
        .sort(() => Math.random() - 0.5)
        .slice(0, n)
      return await fetchByIds<QuestaoTreino>(
        (ids) => supabase.from("questions").select(QFIELDS).in("id", ids),
        escolhidos,
      )
    } catch (err) {
      logError(err, { area: "treino", userId, phase: "sortear-questoes" })
      return []
    }
  }

  // 1.5. Modo focado — uma matéria específica (vindo do mini-diagnóstico)
  if (materiaFiltrada) {
    const questoesFocadas = await sortearQuestoes(totalQuestoes, [materiaFiltrada], idsJaAcertou)

    const { data: subjectFocada } = await supabase
      .from("subjects")
      .select("id, name")
      .eq("id", materiaFiltrada)
      .single()

    const subjectName = subjectFocada?.name ?? "Geral"
    const questoesComMateria = questoesFocadas.map((q) => ({
      ...q,
      subject_name: subjectName,
    }))

    console.log(`[treino] modo focado: ${questoesFocadas.length} questões de ${subjectName}`)

    void track(userId, EVENTOS.TREINO_INICIADO, {
      quantidade: totalQuestoes,
      servidas: questoesFocadas.length,
      risco: questoesFocadas.length,
      geral: 0,
      materia_filtrada: true,
      origem,
    })

    return NextResponse.json({
      distribuicao: {
        total: questoesFocadas.length,
        risco: questoesFocadas.length,
        geral: 0,
      },
      questoes: questoesComMateria,
    }, { status: 200 })
  }

  // 2. Matérias em risco — SIMULADO PRIMEIRO (medição limpa, no formato e
  // peso da prova). A view materias_risco agrega só respostas de simulado.
  const { data: materiasRisco } = await supabase
    .from("materias_risco")
    .select("subject_id, taxa")
    .eq("user_id", userId)
    .order("taxa", { ascending: true })
    .limit(3)

  let subjectIdsRisco = (materiasRisco ?? []).map((m) => m.subject_id)

  // 2.5. Fallback pra quem não tem simulado (free, ou Pro recém-chegado):
  // prioriza pelo placar acumulado — diagnóstico + treino + simulado, com o
  // filtro de baixa confiança já aplicado. É o que torna o "Treino Estratégico"
  // do free estratégico de verdade.
  //
  // Antes isso agregava question_attempts cru: sem filtro de tempo, o clique de
  // menos de 3s que a tela do diagnóstico descartava como ruído era o mesmo que
  // elegia a matéria pra dirigir 70% do treino. As duas telas discordavam sobre
  // as mesmas respostas.
  //
  // Sem piso de amostra, de propósito: isto é ORDENAÇÃO. Recomendar a partir de
  // pouca amostra é aceitável — carimbar o usuário de "crítico" não é, e esse
  // gate mora no rótulo (ver lib/services/desempenho.ts).
  const placar = await placarPorMateria(supabase, userId)

  if (subjectIdsRisco.length === 0 && placar.size > 0) {
    subjectIdsRisco = [...placar.values()]
      .map((p) => ({ sid: p.subject_id, taxa: taxaDoPlacar(p) }))
      .filter((m): m is { sid: string; taxa: number } => m.taxa !== null && m.taxa < TAXA_CRITICA)
      .sort((a, b) => a.taxa - b.taxa)
      .slice(0, 3)
      .map((m) => m.sid)
  }

  // Fallback: sessão focada sem matérias em risco → vira distribuição padrão (100% gerais pra 5q)
  if (sessaoFocada && subjectIdsRisco.length === 0) {
    sessaoFocada = false
    qtdRisco = 0
    qtdGeral = totalQuestoes
  }

  // 3. Questões das matérias em risco (70%)
  let questoesRisco: QuestaoTreino[] = []

  if (subjectIdsRisco.length > 0) {
    questoesRisco = await sortearQuestoes(qtdRisco, subjectIdsRisco, idsJaAcertou)
  }

  // 4. Questões gerais (30%) — exclui as já acertadas e as já escolhidas no bloco de risco.
  //
  // Preferem matéria AUSENTE do placar: zero respostas válidas de qualquer
  // fonte, ou seja, genuinamente desconhecida. Antes, "matéria não medida" era
  // silenciosamente idêntica a "matéria medida e OK" — nunca entrava no risco e
  // nunca era priorizada, então podia ficar invisível pra sempre. Assim o
  // próprio treino vai completando o mapa, sem depender do Módulo 2.
  const idsJaSelecionados = new Set<string>([...idsJaAcertou, ...questoesRisco.map((q) => q.id)])

  // "Não medida" = sem entrada no placar OU com entrada de total 0 (perguntamos
  // e todas as respostas caíram no filtro de tempo). As duas são desconhecimento
  // igual — a segunda só tem a tentativa registrada.
  const { data: todasSubjects } = await supabase.from("subjects").select("id")
  const naoMedidas = (todasSubjects ?? [])
    .map((s) => s.id as string)
    .filter((id) => (placar.get(id)?.total ?? 0) === 0)

  const questoesGeralSelecionadas =
    naoMedidas.length > 0 ? await sortearQuestoes(qtdGeral, naoMedidas, idsJaSelecionados) : []

  // Pool de não medidas esgotado (ou inexistente): completa com o banco inteiro.
  if (questoesGeralSelecionadas.length < qtdGeral) {
    const jaEscolhidas = new Set<string>([
      ...idsJaSelecionados,
      ...questoesGeralSelecionadas.map((q) => q.id),
    ])
    questoesGeralSelecionadas.push(
      ...(await sortearQuestoes(qtdGeral - questoesGeralSelecionadas.length, null, jaEscolhidas)),
    )
  }

  // 5. Monta lista final
  const questoesFinal = [...questoesRisco, ...questoesGeralSelecionadas]
    .sort(() => Math.random() - 0.5)

  // 6. Busca nomes das matérias
  const subjectIdsFinal = [...new Set(questoesFinal.map((q) => q.subject_id))]
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")
    .in("id", subjectIdsFinal.length > 0 ? subjectIdsFinal : ["null"])

  const subjectMap = Object.fromEntries((subjects ?? []).map((s) => [s.id, s.name]))

  const questoesComMateria = questoesFinal.map((q) => ({
    ...q,
    subject_name: subjectMap[q.subject_id] ?? "Desconhecida",
  }))

  console.log(`[treino] ${questoesFinal.length} questões montadas — risco=${questoesRisco.length} geral=${questoesGeralSelecionadas.length}`)

  // `servidas` separado de `quantidade`: quando o banco não tem questão inédita
  // suficiente o treino sai menor, e sem esse par o encolhimento fica invisível.
  void track(userId, EVENTOS.TREINO_INICIADO, {
    quantidade: totalQuestoes,
    servidas: questoesFinal.length,
    risco: questoesRisco.length,
    geral: questoesGeralSelecionadas.length,
    materia_filtrada: false,
    sessao_focada: sessaoFocada,
    origem,
  })

  return NextResponse.json({
    distribuicao: {
      total: questoesFinal.length,
      risco: questoesRisco.length,
      geral: questoesGeralSelecionadas.length,
    },
    questoes: questoesComMateria,
  }, { status: 200 })
}