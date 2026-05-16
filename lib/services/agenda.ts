// lib/services/agenda.ts
// Lógica de geração da Agenda Inteligente

export interface AgendaEvent {
  user_id: string
  title:   string
  type:    "study" | "simulado" | "revisao" | "prova"
  date:    string   // YYYY-MM-DD
  time:    string   // HH:MM
  is_auto: boolean
  subject: string | null
  reason:  string | null
}

export interface UserAvailability {
  day_of_week: number   // 0 = Dom … 6 = Sáb
  start_time:  string   // HH:MM
  end_time:    string   // HH:MM
}

interface DisciplinaClassificada {
  subject_id: string
  nome:       string
  taxa:       number
  categoria:  "critica" | "media" | "boa"
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number)
  return new Date(y, m - 1, d).getDay()
}


/** Retorna horário a ~50% da janela disponível (para segunda sessão) */
function midpointTime(start: string, end: string): string {
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  const startMins = sh * 60 + sm
  const endMins   = eh * 60 + em
  const mid = startMins + Math.floor((endMins - startMins) / 2)
  return `${String(Math.floor(mid / 60)).padStart(2, "0")}:${String(mid % 60).padStart(2, "0")}`
}

// ─────────────────────────────────────────────────────────────────────────────
// Classifica disciplinas por taxa de acerto
// ─────────────────────────────────────────────────────────────────────────────
function classificar(
  desempenho: { subject_id: string; nome: string; taxa_acerto: number }[]
) {
  const criticas: DisciplinaClassificada[] = []
  const medias:   DisciplinaClassificada[] = []
  const boas:     DisciplinaClassificada[] = []

  for (const d of desempenho) {
    const item: DisciplinaClassificada = {
      subject_id: d.subject_id,
      nome:       d.nome,
      taxa:       d.taxa_acerto,
      categoria:  d.taxa_acerto < 40 ? "critica" : d.taxa_acerto <= 70 ? "media" : "boa",
    }
    if      (item.categoria === "critica") criticas.push(item)
    else if (item.categoria === "media")   medias.push(item)
    else                                   boas.push(item)
  }

  criticas.sort((a, b) => a.taxa - b.taxa)
  medias.sort((a, b)   => a.taxa - b.taxa)

  return { criticas, medias, boas }
}

// ─────────────────────────────────────────────────────────────────────────────
// Função principal — gera eventos para os próximos 7 dias
// ─────────────────────────────────────────────────────────────────────────────
export function gerarEventos(
  userId:       string,
  desempenho:   { subject_id: string; nome: string; taxa_acerto: number }[],
  availability: UserAvailability[] = [],
  startDate?:   string   // YYYY-MM-DD — padrão: segunda da semana atual
): AgendaEvent[] {
  const { criticas, medias, boas } = classificar(desempenho)

  let cIdx = 0, mIdx = 0, bIdx = 0

  const pickCritical = (): DisciplinaClassificada | null =>
    criticas.length ? criticas[cIdx++ % criticas.length] : null

  const pickMedium = (): DisciplinaClassificada | null =>
    medias.length   ? medias[mIdx++ % medias.length]     : null

  const pickGood = (): DisciplinaClassificada | null =>
    boas.length     ? boas[bIdx++ % boas.length]         : null

  // Sequência determinística ponderada: 60% crítica | 30% média | 10% boa
  const weights: ("c" | "m" | "g")[] = [
    "c", "c", "c", "m", "c", "c", "m", "c", "m", "g",
    "c", "c", "m", "c", "c", "m", "c", "c", "m", "g",
  ]
  let wIdx = 0

  const pickWeighted = (): DisciplinaClassificada | null => {
    const w = weights[wIdx++ % weights.length]
    if (w === "c") return pickCritical() ?? pickMedium() ?? pickGood()
    if (w === "m") return pickMedium()   ?? pickCritical() ?? pickGood()
    return           pickGood()          ?? pickMedium()   ?? pickCritical()
  }

  const reasonFor = (d: DisciplinaClassificada): string => {
    if (d.categoria === "critica")
      return `Baixo desempenho: ${d.taxa.toFixed(0)}% de acerto. Prioridade máxima para subir a nota.`
    if (d.categoria === "media")
      return `Desempenho intermediário: ${d.taxa.toFixed(0)}% de acerto — reforço necessário para a aprovação.`
    return `Bom desempenho: ${d.taxa.toFixed(0)}% de acerto — manutenção para não perder o ritmo.`
  }

  const dateStr = (offsetDays: number): string => {
    const base = startDate
      ? (() => { const [y, m, d] = startDate.split("-").map(Number); return new Date(y, m - 1, d) })()
      : new Date()
    base.setDate(base.getDate() + offsetDays)
    const y = base.getFullYear()
    const m = String(base.getMonth() + 1).padStart(2, "0")
    const d = String(base.getDate()).padStart(2, "0")
    return `${y}-${m}-${d}`
  }

  // Resolve horários da sessão com base na disponibilidade do dia
  // Suporta múltiplos slots por dia (ex: 08:00-09:00 e 19:00-21:00)
  const resolveSessionTimes = (date: string) => {
    if (availability.length === 0) {
      return { session1: "08:00", session2: "19:00", hasAvail: true }
    }

    const dow       = getDayOfWeek(date)
    const daySlots  = availability
      .filter((a) => a.day_of_week === dow)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))

    if (!daySlots.length) return { session1: "08:00", session2: "19:00", hasAvail: false }

    // Sessão 1: início do primeiro slot
    const session1 = daySlots[0].start_time.slice(0, 5)

    // Sessão 2: início do segundo slot (se existir) ou ponto médio do primeiro
    const session2 = daySlots.length > 1
      ? daySlots[1].start_time.slice(0, 5)
      : midpointTime(daySlots[0].start_time, daySlots[0].end_time)

    return { session1, session2, hasAvail: true }
  }

  const events: AgendaEvent[] = []

  // ── Pré-cálculo da disponibilidade por dia ──────────────────────
  // Para cada índice 0–6 (0 = segunda), descobre o maior bloco contíguo livre.
  const toMin = (t: string): number => {
    const [h, m] = t.split(":").map(Number)
    return h * 60 + m
  }

  const dayInfo = Array.from({ length: 7 }, (_, day) => {
    const date  = dateStr(day)
    const dow   = getDayOfWeek(date)
    const slots = availability.filter((a) => a.day_of_week === dow)
    let longest = 0
    let longestStart = ""
    for (const s of slots) {
      const dur = toMin(s.end_time) - toMin(s.start_time)
      if (dur > longest) {
        longest      = dur
        longestStart = s.start_time.slice(0, 5)
      }
    }
    return { day, longest, longestStart, hasAvail: slots.length > 0 }
  })

  const hasConfig     = availability.length > 0
  const availableDays = dayInfo.filter((d) => d.hasAvail)

  // Dia do simulado: dia disponível com o maior bloco contíguo livre.
  // Desempate pela proximidade da quarta. Sem disponibilidade → quarta (índice 2).
  const simuladoDay = !hasConfig
    ? 2
    : [...availableDays].sort(
        (a, b) => b.longest - a.longest || Math.abs(a.day - 2) - Math.abs(b.day - 2)
      )[0]?.day ?? 2

  // Revisão geral: último dia disponível que não seja o do simulado.
  // Sem disponibilidade → domingo (índice 6). Sem outro dia livre → -1 (sem revisão geral).
  const revisaoDay = !hasConfig
    ? 6
    : (() => {
        const outros = availableDays.filter((d) => d.day !== simuladoDay).map((d) => d.day)
        return outros.length ? Math.max(...outros) : -1
      })()

  for (let day = 0; day < 7; day++) {
    const date = dateStr(day)
    const { session1, session2, hasAvail } = resolveSessionTimes(date)

    // Pula dias sem disponibilidade configurada (só quando o usuário definiu horários)
    if (!hasAvail && availability.length > 0) continue

    // ── Simulado completo (dia de maior bloco livre) ─────────────────
    if (day === simuladoDay) {
      events.push({
        user_id: userId,
        title:   "Simulado Completo OAB",
        type:    "simulado",
        date,
        time:    hasConfig ? (dayInfo[day].longestStart || session1) : session1,
        is_auto: true,
        subject: null,
        reason:  "Simulado semanal para medir seu progresso e simular as condições reais da prova.",
      })
      continue
    }

    // ── Treino + Revisão Geral (último dia disponível da semana) ─────
    if (day === revisaoDay) {
      const d = pickCritical() ?? pickMedium()
      if (d) {
        events.push({
          user_id: userId,
          title:   `Treino: ${d.nome}`,
          type:    "study",
          date,
          time:    session1,
          is_auto: true,
          subject: d.nome,
          reason:  reasonFor(d),
        })
      }
      events.push({
        user_id: userId,
        title:   "Revisão Geral da Semana",
        type:    "revisao",
        date,
        time:    session2,
        is_auto: true,
        subject: null,
        reason:  "Revisão de todos os conteúdos estudados na semana para consolidar o aprendizado.",
      })
      continue
    }

    // ── Dias regulares: 1ª sessão ────────────────────────────────────
    const morning = pickWeighted()
    if (morning) {
      events.push({
        user_id: userId,
        title:   `Treino: ${morning.nome}`,
        type:    "study",
        date,
        time:    session1,
        is_auto: true,
        subject: morning.nome,
        reason:  reasonFor(morning),
      })
    }

    // ── 2ª sessão: alternando treino e revisão ───────────────────────
    if (day % 2 === 1) {
      const ultimas = events
        .filter((e) => e.type === "study" && e.subject)
        .slice(-2)
        .map((e) => e.subject)
        .join(" e ")

      events.push({
        user_id: userId,
        title:   "Revisão do Bloco",
        type:    "revisao",
        date,
        time:    session2,
        is_auto: true,
        subject: null,
        reason:  `Revisão de ${ultimas || "conteúdos recentes"} para fixar o que foi aprendido.`,
      })
    } else {
      const evening = pickWeighted()
      if (evening) {
        events.push({
          user_id: userId,
          title:   `Treino: ${evening.nome}`,
          type:    "study",
          date,
          time:    session2,
          is_auto: true,
          subject: evening.nome,
          reason:  reasonFor(evening),
        })
      }
    }
  }

  return events
}
