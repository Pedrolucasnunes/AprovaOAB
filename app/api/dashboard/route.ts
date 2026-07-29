import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { inicioDoDiaBR, hojeStringBR, diaDaSemanaBR } from "@/lib/check-daily-limit"
import { fetchAllRows, fetchByIds } from "@/lib/supabase-paginate"
import { classificarTaxa, TAXA_CRITICA, MIN_TENTATIVAS_BANDA, MIN_RESPOSTAS_TAXA_GERAL } from "@/lib/metrics"
import { logError } from "@/lib/logger"
import { placarPorMateria, taxaDoPlacar } from "@/lib/services/desempenho"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET(req: NextRequest) {
  const { user, supabase, error } = await requireUser()
  if (error) return error

  const userId = user.id

  // 0. Estado do onboarding/diagnóstico + limite diário (fuso BR — América/São_Paulo)
  const inicioDoDia = inicioDoDiaBR()

  const [
    { count: diagnosticAttemptsCount },
    { count: questoesHojeCount },
    { data: userPlanoRow },
  ] = await Promise.all([
    supabase
      .from("question_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_diagnostic", true),
    supabase
      .from("question_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_diagnostic", false)
      .gte("created_at", inicioDoDia.toISOString()),
    supabase.from("users").select("plano, subscription_status, trial_used, trial_ends_at").eq("id", userId).single(),
  ])

  const onboardingCompleto = user.user_metadata?.onboarding_completed === true
  // "Passou pelo onboarding". Antes olhava onboarding_data.dificuldades, campo
  // que o wizard não coleta mais — todo usuário novo daria falso aqui e cairia
  // no card de "usuário antigo sem perfil". A fonte correta sempre foi a flag
  // do Auth; a lista de dificuldades era só um proxy dela.
  const temPerfilOnboarding = onboardingCompleto
  // Estado do diagnóstico vem da SESSÃO, não da contagem de tentativas.
  // Com o módulo em 16 questões, o antigo `count >= 5` marcava "concluído" com
  // o usuário na questão 6 — o banner sumia no meio do diagnóstico.
  // diagnostic_sessions tem RLS sem policies: leitura só via supabaseAdmin.
  const { data: sessoesDiag } = await supabaseAdmin
    .from("diagnostic_sessions")
    .select("modulo, status, posicao, question_ids")
    .eq("user_id", userId)

  const sessoes = sessoesDiag ?? []
  const emAndamento = sessoes.find((s) => s.status === "em_andamento") ?? null

  // Quem fez o diagnóstico de 5 questões antes dos módulos não tem sessão
  // nenhuma — pra esses, a contagem antiga continua sendo o sinal correto.
  const legadoConcluido = sessoes.length === 0 && (diagnosticAttemptsCount ?? 0) >= 5

  const diagnosticoCompleto = sessoes.some((s) => s.status === "concluida") || legadoConcluido
  const diagnosticoEmAndamento = emAndamento
    ? {
        modulo: emAndamento.modulo as string,
        posicao: emAndamento.posicao as number,
        total: (emAndamento.question_ids as string[]).length,
      }
    : null
  const questoesHoje = questoesHojeCount ?? 0
  const plano: "free" | "pro" | "aprovacao" = userPlanoRow?.plano ?? "free"
  const subscriptionStatus: "active" | "trialing" | "past_due" | "canceled" =
    userPlanoRow?.subscription_status ?? "active"
  const trialUsed: boolean = userPlanoRow?.trial_used ?? false
  const trialEndsAt: string | null = userPlanoRow?.trial_ends_at ?? null
  const examDate: string | null = (user.user_metadata?.exam_date as string | null) ?? null

  // 1. Tentativas avulsas (diagnóstico + treino + questões), direto da tabela.
  // CUIDADO: a view desempenho_materia NÃO serve aqui — verificado no banco,
  // ela retorna 1 linha por SIMULADO_RESPOSTA (desagregada, total sempre 1) e
  // NÃO inclui question_attempts. Avulsas só existem nesta tabela; a
  // agregação por matéria acontece no passo 5.5.
  const avulsasAttempts = await fetchAllRows<{
    question_id: string
    acertou: boolean
    is_diagnostic: boolean
  }>(
    () => supabase
      .from("question_attempts")
      .select("question_id, acertou, is_diagnostic")
      .eq("user_id", userId),
  )

  // A agregação POR MATÉRIA (passo 5.5) usa TODAS as tentativas, diagnóstico
  // incluído — é justamente ele que mede as matérias, e tirá-lo dali cegaria o
  // treino direcionado.
  //
  // Já a TAXA GERAL exclui o diagnóstico. Ele é régua, não treino: sai de
  // propósito nas 8 matérias mais pesadas, em dificuldade média/difícil, e o
  // candidato faz frio no primeiro dia. Misturado, ele empurra a taxa pra baixo
  // (36% de acerto no diagnóstico contra 49% no treino) e, com o módulo em 16
  // questões, passa a dominar o número de todo usuário novo. É o mesmo motivo
  // pelo qual o hero usa taxaSimulados em vez da geral.
  // CONTAGEM de atividade ("questões resolvidas"): tudo que o usuário
  // respondeu, diagnóstico incluído. Ele resolveu aquelas questões — sumir com
  // elas da contagem faz quem acabou de terminar o diagnóstico aparecer com
  // zero e ser tratado como usuário que nunca fez nada.
  const totalRespondidasAvulsas = avulsasAttempts.length
  const totalAcertosAvulsas = avulsasAttempts.filter((a) => a.acertou).length

  // BASE DA TAXA: só treino. É aqui, e só aqui, que o diagnóstico sai.
  const avulsasTreino = avulsasAttempts.filter((a) => !a.is_diagnostic)
  const treinoRespondidas = avulsasTreino.length
  const treinoAcertos = avulsasTreino.filter((a) => a.acertou).length

  // 2. Último simulado + todos os finalizados (para taxa geral OAB)
  const [
    { data: ultimoSimulado, error: simError },
    simuladosFinalizados,
  ] = await Promise.all([
    supabase
      .from("simulados")
      .select("id, created_at, acertos, erros, percentual, numero_questoes, titulo")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    // Pagina: um usuário ativo pode passar de 1000 simulados finalizados.
    fetchAllRows<{ acertos: number; numero_questoes: number }>(
      () => supabase
        .from("simulados")
        .select("acertos, numero_questoes")
        .eq("user_id", userId)
        .not("percentual", "is", null),
    ),
  ])

  if (simError && simError.code !== "PGRST116") {
    logError(simError, { area: "dashboard", userId, phase: "ultimo-simulado" })
  }

  // 3. Nomes das matérias
  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, name")

  const subjectMap = Object.fromEntries(
    (subjects ?? []).map((s) => [s.id, s.name])
  )

  // 4. (removido) A view materias_risco agrega só respostas de simulado e não
  //    filtra risco. A lista de risco agora sai da fusão do passo 5.5.

  // 5. Desempenho por matéria — apenas simulados
  const simAttempts = await fetchAllRows<{ id: string; question_id: string }>(
    () => supabase.from("simulado_attempts").select("id, question_id").eq("user_id", userId),
  )

  const simAttemptIds = simAttempts.map((a) => a.id)

  let desempenhoPorMateria: {
    subject_id: string; nome: string; total: number; acertos: number; taxa_acerto: number
  }[] = []
  // Respostas efetivamente dadas em simulados (brancos não geram linha).
  let totalRespostasSimulado = 0
  let totalAcertosRespostasSimulado = 0

  if (simAttemptIds.length > 0) {
    const simRespostas = await fetchByIds<{ question_id: string; acertou: boolean }>(
      (ids) => supabase.from("simulado_respostas").select("question_id, acertou").in("attempt_id", ids),
      simAttemptIds,
    )
    totalRespostasSimulado = simRespostas.length
    totalAcertosRespostasSimulado = simRespostas.filter((r) => r.acertou).length

    if (simRespostas.length > 0) {
      const qIds = [...new Set(simRespostas.map((r) => r.question_id))]

      const simQuestions = await fetchByIds<{ id: string; subject_id: string }>(
        (ids) => supabase.from("questions").select("id, subject_id").in("id", ids),
        qIds,
      )

      const qSubjectMap = Object.fromEntries(simQuestions.map((q) => [q.id, q.subject_id]))
      const subjectStats = new Map<string, { total: number; acertos: number }>()

      for (const r of simRespostas) {
        const sid = qSubjectMap[r.question_id]
        if (!sid) continue
        const s = subjectStats.get(sid) ?? { total: 0, acertos: 0 }
        s.total += 1
        if (r.acertou) s.acertos += 1
        subjectStats.set(sid, s)
      }

      desempenhoPorMateria = Array.from(subjectStats.entries())
        .map(([subject_id, s]) => ({
          subject_id,
          nome: subjectMap[subject_id] ?? "Matéria desconhecida",
          total: s.total,
          acertos: s.acertos,
          taxa_acerto: s.total > 0 ? parseFloat(((s.acertos / s.total) * 100).toFixed(2)) : 0,
        }))
        .sort((a, b) => a.taxa_acerto - b.taxa_acerto)
    }
  }

  const totalQuestoesFinalizados = (simuladosFinalizados ?? []).reduce((acc: number, s) => acc + (s.numero_questoes ?? 0), 0)
  const totalAcertosFinalizados  = (simuladosFinalizados ?? []).reduce((acc: number, s) => acc + (s.acertos ?? 0), 0)
  const taxaGeralSimulado = totalQuestoesFinalizados > 0
    ? parseFloat(((totalAcertosFinalizados / totalQuestoesFinalizados) * 100).toFixed(2))
    : 0

  // 5.5. Desempenho REAL por matéria = diagnóstico + avulsas + simulados, com o
  // filtro de baixa confiança aplicado. A fusão vive em lib/services/desempenho
  // porque /api/treino precisa exatamente da mesma base — quando eram dois
  // códigos, discordavam. Nenhuma view entrega isso: desempenho_materia e
  // materias_risco cobrem SÓ simulado, e as avulsas só existem em
  // question_attempts.
  const placar = await placarPorMateria(supabase, userId)

  const materiasTaxas = [...placar.values()]
    // total = 0 é matéria com TODAS as respostas descartadas: perguntamos e não
    // deu pra medir. Sem este filtro ela viraria taxa 0%, ou seja, o topo da
    // lista de risco — exatamente a contradição que esta fase existe pra fechar,
    // só que reintroduzida no dashboard.
    .filter((p) => p.total > 0)
    .map((p) => ({
      subject_id: p.subject_id,
      nome: subjectMap[p.subject_id] ?? "Matéria desconhecida",
      total: p.total,
      taxa: taxaDoPlacar(p) ?? 0,
      // ORDENAÇÃO usa `total` (acumulado). CLASSIFICAÇÃO usa só amostra de
      // treino: o diagnóstico mede 2 questões por matéria, o suficiente pra
      // apontar direção e insuficiente pra dizer a alguém que ele é crítico
      // numa disciplina.
      rotulavel: p.totalTreino >= MIN_TENTATIVAS_BANDA,
    }))
    .sort((a, b) => a.taxa - b.taxa)

  // Bandas/contagens da Agenda: só matérias rotuláveis.
  const materiasPorBanda = { criticas: 0, medias: 0, boas: 0 }
  for (const m of materiasTaxas) {
    if (!m.rotulavel) continue
    const nivel = classificarTaxa(m.taxa)
    if (nivel === "critica") materiasPorBanda.criticas++
    else if (nivel === "media") materiasPorBanda.medias++
    else materiasPorBanda.boas++
  }

  // Lista de risco (banda crítica), SEM piso de amostra: as recomendações
  // precisam funcionar já no pós-diagnóstico (2 respostas por matéria).
  const materiasRiscoAll = materiasTaxas.filter((m) => m.taxa < TAXA_CRITICA)
  const materiasRisco = materiasRiscoAll
    .slice(0, 5)
    .map(({ subject_id, nome, taxa, total, rotulavel }) => ({ subject_id, nome, taxa, total, rotulavel }))

  // O contador acompanha a LISTA, não as bandas. Com o rótulo exigindo amostra
  // de treino, `materiasPorBanda.criticas` é 0 pra quem só fez o diagnóstico —
  // e o card mostraria "0 disciplinas em risco" logo acima de uma lista com 4.
  const materiasRiscoCount = materiasRiscoAll.length

  // Resumo geral DE VERDADE: avulsas + respostas de simulado no mesmo
  // denominador — só questões EFETIVAMENTE respondidas ("resolvidas").
  // Brancos de simulado não entram aqui; a nota de prova (que pontua branco
  // como erro) é a taxaSimulados.
  const totalRespondidas = totalRespondidasAvulsas + totalRespostasSimulado
  const totalAcertos = totalAcertosAvulsas + totalAcertosRespostasSimulado

  // A taxa tem denominador PRÓPRIO, sem o diagnóstico — diferente do total
  // acima de propósito. `null` abaixo do piso de amostra: a tela mostra
  // convite, não um número. 2 respostas viram "0%" ou "100%", que é ruído com
  // cara de métrica.
  const baseTaxa = treinoRespondidas + totalRespostasSimulado
  const acertosTaxa = treinoAcertos + totalAcertosRespostasSimulado
  const taxaGeralAcerto = baseTaxa >= MIN_RESPOSTAS_TAXA_GERAL
    ? parseFloat(((acertosTaxa / baseTaxa) * 100).toFixed(2))
    : null

  // 6. Action cards — dados em paralelo (fuso BR)
  const todayDate   = new Date()
  const todayStr    = hojeStringBR()
  const todayDow    = diaDaSemanaBR()

  const [
    { data: todaySlot },
    { data: proximoSimEvent },
    { count: totalSimulados },
    { data: recentAttempts },
  ] = await Promise.all([
    // Horário disponível hoje
    supabase
      .from("user_availability")
      .select("start_time")
      .eq("user_id", userId)
      .eq("day_of_week", todayDow)
      .order("start_time", { ascending: true })
      .limit(1)
      .maybeSingle(),

    // Próximo simulado agendado
    supabase
      .from("calendar_events")
      .select("date, time")
      .eq("user_id", userId)
      .eq("type", "simulado")
      .gte("date", todayStr)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle(),

    // Total de simulados finalizados
    supabase
      .from("simulados")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("percentual", "is", null),

    // Últimas práticas avulsas (para insight)
    supabase
      .from("question_attempts")
      .select("question_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
  ])

  // Matéria em risco com prática mais antiga
  let insightMateria: { subject: string; taxa: number; diasSemTreino: number | null } | null = null

  if (materiasRiscoAll.length > 0) {
    if (recentAttempts && recentAttempts.length > 0) {
      const qIds = [...new Set(recentAttempts.map((a) => a.question_id))] as string[]
      const qRows = await fetchByIds<{ id: string; subject_id: string }>(
        (ids) => supabase.from("questions").select("id, subject_id").in("id", ids),
        qIds,
      )

      const qSubMap = Object.fromEntries(qRows.map((q) => [q.id, q.subject_id]))
      const lastPractice = new Map<string, Date>()

      for (const a of recentAttempts) {
        const sid = qSubMap[a.question_id]
        if (!sid) continue
        const d = new Date(a.created_at)
        if (!lastPractice.has(sid) || d > lastPractice.get(sid)!) lastPractice.set(sid, d)
      }

      let chosen: (typeof materiasRiscoAll)[0] | null = null
      let oldestDate: Date = todayDate

      for (const m of materiasRiscoAll) {
        const last = lastPractice.get(m.subject_id)
        if (!last) { chosen = m; break }
        if (last < oldestDate) { oldestDate = last; chosen = m }
      }

      if (chosen) {
        const last = lastPractice.get(chosen.subject_id)
        insightMateria = {
          subject:       chosen.nome,
          taxa:          chosen.taxa,
          diasSemTreino: last
            ? Math.floor((todayDate.getTime() - last.getTime()) / 86400000)
            : null,
        }
      }
    } else {
      const worst = materiasRiscoAll[0]
      insightMateria = {
        subject:       worst.nome,
        taxa:          worst.taxa,
        diasSemTreino: null,
      }
    }
  }

  const actionCards = {
    proximaAcao: materiasRisco[0] ? {
      subject: materiasRisco[0].nome,
      horario: todaySlot?.start_time?.slice(0, 5) ?? null,
    } : null,
    proximoSimulado: proximoSimEvent ? {
      date:   proximoSimEvent.date,
      time:   (proximoSimEvent.time ?? "09:00").slice(0, 5),
      numero: (totalSimulados ?? 0) + 1,
    } : null,
    insightMateria,
  }

  // 7. Evolução do desempenho
  const { data: historicoSimulados, error: historicoError } = await supabase
    .from("simulados")
    .select("created_at, percentual")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(20)

  if (historicoError) {
    logError(historicoError, { area: "dashboard", userId, phase: "historico" })
  }

  const evolucao = (historicoSimulados ?? []).map((s) => ({
    date: new Date(s.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
    nota: parseFloat(Number(s.percentual).toFixed(1)),
  }))

  return NextResponse.json({
    // taxaGeralAcerto/totalRespondidas agora são GERAIS de verdade: avulsas
    // (view desempenho_materia, agregada acima) + respostas de simulado, no
    // mesmo denominador. A taxa só de simulados sai como taxaSimulados — é
    // ela que mede "prontidão pra prova" (hero). totalSimuladosFinalizados
    // distingue "nota 0%" de "nunca finalizou um simulado".
    resumo: {
      totalRespondidas,
      totalAcertos,
      taxaGeralAcerto,
      taxaSimulados: taxaGeralSimulado,
      totalSimuladosFinalizados: (simuladosFinalizados ?? []).length,
    },
    ultimoSimulado: ultimoSimulado ?? null,
    materiasRisco,
    materiasRiscoCount,
    materiasPorBanda,
    desempenhoPorMateria,
    evolucao,
    actionCards,
    onboardingCompleto,
    temPerfilOnboarding,
    diagnosticoCompleto,
    diagnosticoEmAndamento,
    questoesHoje,
    plano,
    subscriptionStatus,
    trialUsed,
    trialEndsAt,
    examDate,
  }, {
    status: 200,
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
  })
}