import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"

interface QuestionRow {
  id: string
  enunciado: string
  alternativa_a: string
  alternativa_b: string
  alternativa_c: string
  alternativa_d: string
  subject_id: string
}

const BASELINE_SUBJECTS = ["Ética", "Direito Constitucional"]

export async function GET() {
  const { user, supabase, error } = await requireUser()
  if (error) return error

  const { data: userRow } = await supabase
    .from("users")
    .select("onboarding_data")
    .eq("id", user.id)
    .single()

  const dificuldades: string[] = userRow?.onboarding_data?.dificuldades ?? []

  if (dificuldades.length === 0) {
    return NextResponse.json(
      { error: "ONBOARDING_REQUIRED" },
      { status: 400 },
    )
  }

  const { data: simAttempts } = await supabase
    .from("simulado_attempts")
    .select("id")
    .eq("user_id", user.id)

  const attemptIds = (simAttempts ?? []).map((a) => a.id)

  const [{ data: simResp }, { data: treinoResp }] = await Promise.all([
    attemptIds.length > 0
      ? supabase.from("simulado_respostas").select("question_id").in("attempt_id", attemptIds)
      : Promise.resolve({ data: [] }),
    supabase.from("question_attempts").select("question_id").eq("user_id", user.id),
  ])

  const respondidas = new Set<string>([
    ...(simResp ?? []).map((r) => r.question_id),
    ...(treinoResp ?? []).map((r) => r.question_id),
  ])

  const selecionadas: QuestionRow[] = []
  const usadasIds = new Set<string>()

  async function pegarQuestoesDeSubjects(subjectIds: string[], qtd: number): Promise<QuestionRow[]> {
    if (subjectIds.length === 0 || qtd === 0) return []
    const excluir = [...respondidas, ...usadasIds]

    let query = supabase
      .from("questions")
      .select("id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, subject_id")
      .in("subject_id", subjectIds)
      .limit(qtd * 5)

    if (excluir.length > 0) {
      query = query.not("id", "in", `(${excluir.join(",")})`)
    }

    const { data } = await query
    const embaralhadas = (data ?? []).sort(() => Math.random() - 0.5)

    const resultado: QuestionRow[] = []
    const subjectsUsadas = new Set<string>()

    for (const q of embaralhadas) {
      if (resultado.length >= qtd) break
      if (subjectsUsadas.has(q.subject_id) && subjectIds.length > 1 && resultado.length < subjectIds.length) {
        continue
      }
      resultado.push(q)
      subjectsUsadas.add(q.subject_id)
    }

    for (const q of embaralhadas) {
      if (resultado.length >= qtd) break
      if (resultado.some((r) => r.id === q.id)) continue
      resultado.push(q)
    }

    return resultado
  }

  if (dificuldades.length > 0) {
    const fracas = await pegarQuestoesDeSubjects(dificuldades, 3)
    fracas.forEach((q) => { selecionadas.push(q); usadasIds.add(q.id) })
  }

  const { data: baselineSubjects } = await supabase
    .from("subjects")
    .select("id, name")
    .in("name", BASELINE_SUBJECTS)

  const baselineIds = (baselineSubjects ?? []).map((s) => s.id)
  if (baselineIds.length > 0) {
    const restante = 5 - selecionadas.length
    const baseline = await pegarQuestoesDeSubjects(baselineIds, restante)
    baseline.forEach((q) => { selecionadas.push(q); usadasIds.add(q.id) })
  }

  if (selecionadas.length < 5) {
    const restante = 5 - selecionadas.length
    let query = supabase
      .from("questions")
      .select("id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, subject_id")
      .limit(restante * 5)

    const excluir = [...respondidas, ...usadasIds]
    if (excluir.length > 0) {
      query = query.not("id", "in", `(${excluir.join(",")})`)
    }

    const { data } = await query
    const extras = (data ?? []).sort(() => Math.random() - 0.5).slice(0, restante)
    extras.forEach((q) => { selecionadas.push(q); usadasIds.add(q.id) })
  }

  const subjectIds = [...new Set(selecionadas.map((q) => q.subject_id))]
  const { data: subjectsData } = await supabase
    .from("subjects")
    .select("id, name")
    .in("id", subjectIds.length > 0 ? subjectIds : ["null"])

  const subjectMap = Object.fromEntries((subjectsData ?? []).map((s) => [s.id, s.name]))

  const questions = selecionadas.slice(0, 5).map((q) => ({
    id: q.id,
    enunciado: q.enunciado,
    alternativa_a: q.alternativa_a,
    alternativa_b: q.alternativa_b,
    alternativa_c: q.alternativa_c,
    alternativa_d: q.alternativa_d,
    subject_id: q.subject_id,
    subject_name: subjectMap[q.subject_id] ?? "Geral",
  }))

  return NextResponse.json({ questions })
}
