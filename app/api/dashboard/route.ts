import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { getDiagnosticoConfig, getLimitesConfig } from "@/lib/config"
import { inicioDoDiaBR, hojeStringBR, diaDaSemanaBR } from "@/lib/check-daily-limit"
import { parseDbDate } from "@/lib/datas"
import { proximaPrimeiraFase } from "@/lib/editais"
import { contarDiasNoTeto } from "@/lib/limite-diario"
import { fetchAllRows } from "@/lib/supabase-paginate"
import { classificarTaxa, TAXA_CRITICA, MIN_TENTATIVAS_BANDA, MIN_RESPOSTAS_TAXA_GERAL } from "@/lib/metrics"
import { logError } from "@/lib/logger"
import { carregarFontesPlacar, fundirPlacar, taxaDoPlacar } from "@/lib/services/desempenho"
import { proximoModuloPendente, subjectsMedidos } from "@/lib/services/diagnostico"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function GET(req: NextRequest) {
  const { user, supabase, plano, error } = await requireUser()
  if (error) return error

  const userId = user.id

  // 0. TUDO que não depende de mais nada vai junto.
  //
  // Esta rota é a mais chamada do app (dashboard, treino, questões, perfil e
  // calendário) e fazia 19 idas ao banco EM SEQUÊNCIA, cinco delas repetindo
  // consultas que já tinham sido feitas na mesma requisição. Com a função numa
  // região e o banco em outra, cada repetição custava ~135 ms.
  //
  // A regra aqui: só sobra fora deste bloco o que precisa do resultado dele.
  // As fontes do placar (tentativas, simulados, questões) são carregadas UMA
  // vez e todo o resto — contagens, taxas, insight — sai de memória.
  const inicioDoDia = inicioDoDiaBR()
  const todayDate   = new Date()
  const todayStr    = hojeStringBR()
  const todayDow    = diaDaSemanaBR()

  const [
    fontes,
    { data: userPlanoRow },
    { data: sessoesDiag },
    { data: subjects },
    { data: ultimoSimulado, error: simError },
    simuladosFinalizados,
    { data: historicoSimulados, error: historicoError },
    { data: todaySlot },
    { data: proximoSimEvent },
    medidosDiag,
    { minTempoRespostaMs },
    { freeDailyLimit },
  ] = await Promise.all([
    // Fontes do placar: question_attempts + simulado_attempts + simulado_respostas
    // + questions, com o `created_at` que o insight do passo 6 precisa.
    carregarFontesPlacar(supabase, userId),
    supabase.from("users").select("subscription_status, trial_used, trial_ends_at").eq("id", userId).single(),
    // diagnostic_sessions tem RLS sem policies: leitura só via supabaseAdmin.
    supabaseAdmin
      .from("diagnostic_sessions")
      .select("modulo, status, posicao, question_ids")
      .eq("user_id", userId),
    supabase.from("subjects").select("id, name"),
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
    supabase
      .from("simulados")
      .select("created_at, percentual")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(20),
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
    subjectsMedidos(userId),
    // É `cache()`ada por request, então adiantá-la aqui deixa de graça a
    // chamada do passo 5.5 e a de dentro do proximoModuloPendente.
    getDiagnosticoConfig(),
    // O limite diário vai pro cliente: as telas hardcodeavam 10 enquanto o
    // trigger do banco já lia `app_config`. Aqui é de graça — vai no mesmo
    // bloco paralelo e é `cache()`ada por request.
    getLimitesConfig(),
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
  const sessoes = sessoesDiag ?? []
  const emAndamento = sessoes.find((s) => s.status === "em_andamento") ?? null

  // Contagens que antes eram `count: exact` no banco: as tentativas já estão
  // todas em memória, com `is_diagnostic` e `created_at`.
  const diagnosticAttemptsCount = fontes.attempts.filter((a) => a.is_diagnostic).length
  const questoesHoje = fontes.attempts.filter(
    (a) => !a.is_diagnostic && parseDbDate(a.created_at) >= inicioDoDia,
  ).length

  // Quantas vezes o usuário já bateu no teto — é o que separa a parede de
  // "primeira vez" (empurra hábito) da de "toda semana" (vira oferta).
  // Derivado das mesmas tentativas que já estão em memória: nenhuma consulta
  // nova nesta rota, que é a mais chamada do app.
  const diasNoTeto = contarDiasNoTeto(fontes.attempts, freeDailyLimit, todayDate)

  // Quem fez o diagnóstico de 5 questões antes dos módulos não tem sessão
  // nenhuma — pra esses, a contagem antiga continua sendo o sinal correto.
  const legadoConcluido = sessoes.length === 0 && diagnosticAttemptsCount >= 5

  const diagnosticoCompleto = sessoes.some((s) => s.status === "concluida") || legadoConcluido

  // Módulo com matéria ainda não medida. Existe porque `diagnosticoCompleto`
  // não significa "mapa completo": ele fica true assim que UMA sessão conclui,
  // e todos os entry points do diagnóstico eram gateados em
  // `!diagnosticoCompleto` — então quem terminava o Módulo 1 perdia qualquer
  // caminho pro Módulo 2 fora da tela de resultado.
  //
  // O mapa e a contagem de tentativas já vieram no bloco paralelo — sem isso o
  // `mapaConsolidado` refazia as duas consultas aqui dentro.
  const proximoModuloDiag = diagnosticoCompleto
    ? await proximoModuloPendente(userId, {
        medidos: medidosDiag,
        attemptsDiagnostico: diagnosticAttemptsCount,
      })
    : null
  const diagnosticoEmAndamento = emAndamento
    ? {
        modulo: emAndamento.modulo as string,
        posicao: emAndamento.posicao as number,
        total: (emAndamento.question_ids as string[]).length,
      }
    : null
  const subscriptionStatus: "active" | "trialing" | "past_due" | "canceled" =
    userPlanoRow?.subscription_status ?? "active"
  const trialUsed: boolean = userPlanoRow?.trial_used ?? false
  const trialEndsAt: string | null = userPlanoRow?.trial_ends_at ?? null
  const examDate: string | null = (user.user_metadata?.exam_date as string | null) ?? null

  // Contagem regressiva da 1ª fase. ZERO ida a mais ao banco de propósito, na
  // rota mais chamada do app: `EDITAIS` é dado estático em memória e `examDate`
  // acabou de sair do user_metadata que o guard já trouxe.
  //
  // Vem `null` quando não há 1ª fase futura cadastrada — a tela tem que sumir
  // com o card nesse caso, nunca mostrar dias negativos. Ver proximaPrimeiraFase.
  const proximaProva = proximaPrimeiraFase(examDate, todayDate)

  // 1. Tentativas avulsas (diagnóstico + treino + questões).
  // CUIDADO: a view desempenho_materia NÃO serve aqui — verificado no banco,
  // ela retorna 1 linha por SIMULADO_RESPOSTA (desagregada, total sempre 1) e
  // NÃO inclui question_attempts. Avulsas só existem em question_attempts, que
  // já veio em `fontes` — buscar de novo aqui era a maior das repetições.
  const avulsasAttempts = fontes.attempts

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

  // 2. Último simulado + todos os finalizados (para taxa geral OAB) — vieram
  //    no bloco paralelo lá em cima.
  if (simError && simError.code !== "PGRST116") {
    logError(simError, { area: "dashboard", userId, phase: "ultimo-simulado" })
  }

  // 3. Nomes das matérias
  const subjectMap = Object.fromEntries(
    (subjects ?? []).map((s) => [s.id, s.name])
  )

  // 4. (removido) A view materias_risco agrega só respostas de simulado e não
  //    filtra risco. A lista de risco agora sai da fusão do passo 5.5.

  // 5. Desempenho por matéria — apenas simulados. As respostas e o mapa
  //    questão→matéria já estão em `fontes`.
  const simRespostas = fontes.simulado
  // Respostas efetivamente dadas em simulados (brancos não geram linha).
  const totalRespostasSimulado = simRespostas.length
  const totalAcertosRespostasSimulado = simRespostas.filter((r) => r.acertou).length

  let desempenhoPorMateria: {
    subject_id: string; nome: string; total: number; acertos: number; taxa_acerto: number
  }[] = []

  if (simRespostas.length > 0) {
    const subjectStats = new Map<string, { total: number; acertos: number }>()

    for (const r of simRespostas) {
      const sid = fontes.subjectDaQuestao.get(r.question_id)
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
  // As fontes já estão em memória: aqui só se aplica a regra.
  const placar = fundirPlacar(fontes, minTempoRespostaMs)

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
      // `acertos` vai junto pra UI poder mostrar o placar cru ("0/1") quando
      // não há amostra pra taxa. Um "0%" apoiado numa resposta é a mesma
      // afirmação que o badge de banda se recusou a fazer, só em número.
      acertos: p.acertos,
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
    .map(({ subject_id, nome, taxa, total, acertos, rotulavel }) => ({
      subject_id, nome, taxa, total, acertos, rotulavel,
    }))

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

  // 6. Action cards. As duas consultas vieram no bloco paralelo; as práticas
  //    recentes saem de `fontes.attempts` (que tem `created_at`) e o mapa
  //    questão→matéria de `fontes.subjectDaQuestao` — antes isso custava mais
  //    uma leitura de question_attempts e mais uma de questions.
  //
  //    O total de simulados finalizados é o tamanho de `simuladosFinalizados`:
  //    mesmo filtro (`percentual is not null`), então a contagem separada era
  //    a mesma pergunta feita duas vezes.
  const totalSimulados = (simuladosFinalizados ?? []).length

  // Matéria em risco com prática mais antiga
  let insightMateria: { subject: string; taxa: number; diasSemTreino: number | null } | null = null

  if (materiasRiscoAll.length > 0) {
    if (avulsasAttempts.length > 0) {
      const lastPractice = new Map<string, Date>()

      for (const a of avulsasAttempts) {
        const sid = fontes.subjectDaQuestao.get(a.question_id)
        if (!sid) continue
        const d = parseDbDate(a.created_at)
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

  // 7. Evolução do desempenho — veio no bloco paralelo.
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
    diagnosticoProximoModulo: proximoModuloDiag,
    questoesHoje,
    // O teto vem do servidor (app_config, mesma fonte do trigger) — as telas
    // não podem inventar o número que elas mesmas anunciam.
    limiteDiario: freeDailyLimit,
    diasNoTeto,
    plano,
    subscriptionStatus,
    trialUsed,
    trialEndsAt,
    examDate,
    proximaProva,
  }, {
    status: 200,
    headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" },
  })
}