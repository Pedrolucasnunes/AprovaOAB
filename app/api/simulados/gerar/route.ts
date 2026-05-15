import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { rateLimit } from "@/lib/rate-limit"
import { logError, logWarning } from "@/lib/logger"

// Distribuição da 1ª fase da OAB (FGV) — soma 80. Chave = nome da matéria em `subjects.name`.
// Eleitoral / Previdenciário / Financeiro ficam de fora (não são disciplinas autônomas da 1ª fase).
const BLUEPRINT_OAB: Record<string, number> = {
  "Ética Profissional": 8,
  "Filosofia do Direito": 2,
  "Direito Constitucional": 7,
  "Direitos Humanos": 3,
  "Direito Internacional": 3,
  "Direito Tributário": 5,
  "Direito Administrativo": 6,
  "Direito Ambiental": 2,
  "Direito Civil": 7,
  "Direito do Consumidor": 3,
  "Estatuto da Criança e do Adolescente": 2,
  "Direito Empresarial": 5,
  "Direito do Trabalho": 6,
  "Processo do Trabalho": 4,
  "Direito Penal": 6,
  "Processo Penal": 5,
  "Processo Civil": 6,
}

const TOTAL_QUESTOES = 80

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, "simulados-gerar", 10, 60)
  if (!rl.success) {
    return NextResponse.json({ error: "Muitas requisições. Aguarde alguns segundos." }, { status: 429 })
  }

  const { user, supabase, error } = await requireUser()
  if (error) return error

  const userId = user.id

  try {
    const { data: userData } = await supabaseAdmin
      .from("users")
      .select("plano")
      .eq("id", userId)
      .single()

    if (userData?.plano === "free") {
      return NextResponse.json(
        { error: "Simulados completos são exclusivos do plano Pro.", upgrade: true },
        { status: 403 }
      )
    }

    // Mapa nome → id das matérias, pra resolver o blueprint
    const { data: subjects, error: subjError } = await supabase
      .from("subjects")
      .select("id, name")

    if (subjError || !subjects) {
      logError(subjError ?? new Error("Falha ao buscar subjects"), {
        area: "simulados-gerar", userId, phase: "fetch-subjects",
      })
      return NextResponse.json({ error: "Erro ao montar simulado" }, { status: 500 })
    }

    const nomeParaId = Object.fromEntries(subjects.map((s) => [s.name, s.id]))

    // Para cada disciplina do blueprint: busca todos os ids e sorteia a cota.
    // Buscar a lista completa (máx ~224, abaixo do teto de 1000) garante sorteio sem viés.
    const blocos = await Promise.all(
      Object.entries(BLUEPRINT_OAB).map(async ([nome, cota]): Promise<string[]> => {
        const subjectId = nomeParaId[nome]
        if (!subjectId) {
          logWarning("matéria do blueprint não encontrada em subjects", {
            area: "simulados-gerar", userId, materia: nome,
          })
          return []
        }
        const { data, error: qError } = await supabase
          .from("questions")
          .select("id")
          .eq("subject_id", subjectId)

        if (qError) {
          logError(qError, { area: "simulados-gerar", userId, phase: "fetch-questions", materia: nome })
          return []
        }
        const ids = ((data ?? []) as { id: string }[]).map((q) => q.id)
        return shuffle(ids).slice(0, cota)
      })
    )

    const idsSelecionados = new Set<string>(blocos.flat())

    // Fallback defensivo: se alguma disciplina não preencheu a cota, completa com gerais.
    if (idsSelecionados.size < TOTAL_QUESTOES) {
      logWarning("blueprint não preencheu 80 questões, completando com gerais", {
        area: "simulados-gerar", userId, parcial: idsSelecionados.size,
      })
      const { data: extras } = await supabase.from("questions").select("id").limit(1000)
      for (const q of shuffle((extras ?? []) as { id: string }[])) {
        if (idsSelecionados.size >= TOTAL_QUESTOES) break
        idsSelecionados.add(q.id)
      }
    }

    if (idsSelecionados.size < TOTAL_QUESTOES) {
      logError(new Error(`Questões insuficientes: ${idsSelecionados.size}`), {
        area: "simulados-gerar", userId, count: idsSelecionados.size,
      })
      return NextResponse.json(
        { error: `Questões insuficientes: ${idsSelecionados.size} encontradas` },
        { status: 500 }
      )
    }

    // Embaralha a ordem final pra não agrupar as questões por matéria
    const questaoIds = shuffle([...idsSelecionados])

    const { data: simulado, error: sError } = await supabase
      .from("simulados")
      .insert({
        user_id: userId,
        numero_questoes: 80,
        titulo: "Simulado OAB",
        tipo: "oab_completo",
        // Explícito: simulado fresco tem nota NULL (= não finalizado).
        // Sobrepõe qualquer DEFAULT no banco — ver migration 20260515.
        acertos: null,
        erros: null,
        percentual: null,
      })
      .select("id")
      .single()

    if (sError || !simulado) {
      logError(sError ?? new Error("Falha ao criar simulado"), {
        area: "simulados-gerar", userId, phase: "insert-simulado",
      })
      return NextResponse.json({ error: sError?.message }, { status: 500 })
    }

    const attempts = questaoIds.map((id) => ({
      user_id: userId,
      simulado_id: simulado.id,
      question_id: id,
    }))

    const { error: aError } = await supabase
      .from("simulado_attempts")
      .insert(attempts)

    if (aError) {
      logError(aError, { area: "simulados-gerar", userId, simuladoId: simulado.id, phase: "insert-attempts" })
      await supabase.from("simulados").delete().eq("id", simulado.id)
      return NextResponse.json({ error: aError.message }, { status: 500 })
    }

    return NextResponse.json({ simuladoId: simulado.id }, { status: 201 })
  } catch (err) {
    logError(err, { area: "simulados-gerar", userId })
    return NextResponse.json({ error: "Erro ao gerar simulado" }, { status: 500 })
  }
}