import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"

interface Card {
  tipo: "materia" | "tempo" | "seguranca"
  titulo: string
  texto: string
  tom: "ok" | "atencao" | "critico"
}

interface PlanoDia {
  label: string
  atividade: string
  subject_id: string | null
}

export async function GET() {
  const { user, supabase, error } = await requireUser()
  if (error) return error

  const { data: userRow } = await supabase
    .from("users")
    .select("onboarding_data")
    .eq("id", user.id)
    .single()

  const dificuldades: string[] = userRow?.onboarding_data?.dificuldades ?? []

  const { data: attempts } = await supabase
    .from("question_attempts")
    .select("question_id, acertou, time_spent_ms, changed_answer")
    .eq("user_id", user.id)
    .eq("is_diagnostic", true)
    .order("created_at", { ascending: true })

  if (!attempts || attempts.length < 5) {
    return NextResponse.json({ completed: false })
  }

  const ultimas = attempts.slice(-5)
  const questionIds = ultimas.map((a) => a.question_id)

  const { data: questions } = await supabase
    .from("questions")
    .select("id, subject_id")
    .in("id", questionIds)

  const subjectIds = [...new Set((questions ?? []).map((q) => q.subject_id))]

  const { data: subjectsData } = await supabase
    .from("subjects")
    .select("id, name")
    .in("id", subjectIds.length > 0 ? subjectIds : ["null"])

  const subjectMap = Object.fromEntries((subjectsData ?? []).map((s) => [s.id, s.name]))
  const questionSubjectMap = Object.fromEntries((questions ?? []).map((q) => [q.id, q.subject_id]))

  // ── Card 1: confirmação/refutação de matéria declarada ──
  const cards: Card[] = []
  const porMateria: Record<string, { acertos: number; total: number }> = {}

  for (const a of ultimas) {
    const sId = questionSubjectMap[a.question_id]
    if (!sId) continue
    if (!porMateria[sId]) porMateria[sId] = { acertos: 0, total: 0 }
    porMateria[sId].total++
    if (a.acertou) porMateria[sId].acertos++
  }

  let card1: Card | null = null

  for (const dificuldadeId of dificuldades) {
    const stat = porMateria[dificuldadeId]
    if (!stat || stat.total === 0) continue
    const taxa = stat.acertos / stat.total
    const nome = subjectMap[dificuldadeId] ?? "essa matéria"
    if (taxa < 0.5) {
      card1 = {
        tipo: "materia",
        titulo: "Matéria confirmada",
        texto: `Você indicou ${nome} como difícil. Confirmamos: ${stat.acertos}/${stat.total} acertos no diagnóstico. Foco aqui.`,
        tom: "critico",
      }
      break
    }
  }

  if (!card1) {
    for (const dificuldadeId of dificuldades) {
      const stat = porMateria[dificuldadeId]
      if (!stat || stat.total === 0) continue
      if (stat.acertos === stat.total) {
        const nome = subjectMap[dificuldadeId] ?? "essa matéria"
        card1 = {
          tipo: "materia",
          titulo: "Surpresa positiva",
          texto: `Você indicou ${nome} como difícil, mas acertou ${stat.acertos}/${stat.total}. Pode estar mais preparado do que pensa.`,
          tom: "ok",
        }
        break
      }
    }
  }

  if (!card1) {
    const piorMateria = Object.entries(porMateria).sort(
      ([, a], [, b]) => a.acertos / a.total - b.acertos / b.total,
    )[0]
    if (piorMateria) {
      const [sId, stat] = piorMateria
      const nome = subjectMap[sId] ?? "uma matéria"
      card1 = {
        tipo: "materia",
        titulo: "Ponto de atenção",
        texto: `${nome}: ${stat.acertos}/${stat.total} acertos no diagnóstico inicial. Vale dedicar mais tempo aqui.`,
        tom: stat.acertos / stat.total < 0.5 ? "critico" : "atencao",
      }
    }
  }

  if (card1) cards.push(card1)

  // ── Card 2: padrão de tempo ──
  const temposValidos = ultimas
    .map((a) => a.time_spent_ms)
    .filter((t): t is number => typeof t === "number" && t > 0)

  if (temposValidos.length > 0) {
    const mediaMs = temposValidos.reduce((s, t) => s + t, 0) / temposValidos.length
    const mediaS = Math.round(mediaMs / 1000)

    let cardTempo: Card
    if (mediaS < 30) {
      cardTempo = {
        tipo: "tempo",
        titulo: "Leitura ágil",
        texto: `Tempo médio ~${mediaS}s. Padrão rápido — atenção pra não perder detalhes em questões longas.`,
        tom: "atencao",
      }
    } else if (mediaS <= 90) {
      cardTempo = {
        tipo: "tempo",
        titulo: "Ritmo equilibrado",
        texto: `Tempo médio ~${mediaS}s/questão. Bom equilíbrio entre leitura e decisão.`,
        tom: "ok",
      }
    } else {
      cardTempo = {
        tipo: "tempo",
        titulo: "Leitura cuidadosa",
        texto: `Tempo médio ~${mediaS}s/questão. Bom pra precisão — atenção pra prova de 5h, vai precisar acelerar.`,
        tom: "atencao",
      }
    }
    cards.push(cardTempo)
  }

  // ── Card 3: hesitação ──
  const trocas = ultimas.filter((a) => a.changed_answer).length
  let cardSeg: Card
  if (trocas === 0) {
    cardSeg = {
      tipo: "seguranca",
      titulo: "Confiança nas escolhas",
      texto: "Você não trocou de alternativa em nenhuma questão — sinal de segurança no que escolheu.",
      tom: "ok",
    }
  } else if (trocas <= 2) {
    cardSeg = {
      tipo: "seguranca",
      titulo: "Hesitação normal",
      texto: `Trocou de alternativa em ${trocas}/5 — hesitação esperada nas primeiras questões.`,
      tom: "ok",
    }
  } else {
    cardSeg = {
      tipo: "seguranca",
      titulo: "Insegurança na interpretação",
      texto: `Trocou de alternativa em ${trocas}/5 — sinal de insegurança em interpretação. Vamos trabalhar isso.`,
      tom: "atencao",
    }
  }
  cards.push(cardSeg)

  // ── Mini-plano ──
  const materiasOrdenadas = Object.entries(porMateria)
    .sort(([, a], [, b]) => a.acertos / a.total - b.acertos / b.total)
    .map(([sId]) => ({ id: sId, nome: subjectMap[sId] ?? "Geral" }))

  const maisFraca = materiasOrdenadas[0] ?? null
  const segundaFraca = materiasOrdenadas[1] ?? maisFraca

  const plano: PlanoDia[] = [
    {
      label: "Hoje",
      atividade: maisFraca
        ? `5 questões de ${maisFraca.nome}`
        : "5 questões de revisão",
      subject_id: maisFraca?.id ?? null,
    },
    {
      label: "Amanhã",
      atividade: "Revisão rápida + 5 questões mistas",
      subject_id: null,
    },
    {
      label: "Depois de amanhã",
      atividade: segundaFraca
        ? `5 questões de ${segundaFraca.nome}`
        : "5 questões mistas",
      subject_id: segundaFraca?.id ?? null,
    },
  ]

  return NextResponse.json({
    completed: true,
    cards,
    plano,
    foco: maisFraca,
  })
}
