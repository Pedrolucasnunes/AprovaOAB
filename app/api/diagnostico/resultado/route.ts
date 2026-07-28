import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { getDiagnosticoConfig } from "@/lib/config"
import { coberturaDeSubjects } from "@/lib/exames"
import { logError } from "@/lib/logger"
import { classificarTaxa, type NivelTaxa } from "@/lib/metrics"
import { recomputarResultados } from "@/lib/services/diagnostico"
import { supabaseAdmin } from "@/lib/supabase-admin"

// Resultado do diagnóstico: o que foi medido, o que NÃO foi, e quanto da prova
// isso representa.
//
// Declarar a cobertura é o produto, não detalhe de copy. 8 matérias com 2
// questões cada não "medem o candidato"; medem 63% da prova de forma rasa. Dizer
// isso faz a ferramenta parecer rigorosa em vez de incompleta — e cria, dentro
// do produto, o motivo pra voltar amanhã (o Módulo 2), que hoje não existe em
// lugar nenhum.
//
// Tem que funcionar com o Módulo 2 nunca feito: ele é opcional, não pré-requisito.

interface MateriaMedida {
  subject_id: string
  nome: string
  acertos: number
  total: number
  descartadas: number
  taxa: number
  nivel: NivelTaxa
}

export async function GET() {
  const { user, error } = await requireUser()
  if (error) return error

  const config = await getDiagnosticoConfig()

  const [{ data: resultados }, { data: sessoes }, { data: subjects }] = await Promise.all([
    supabaseAdmin
      .from("diagnostic_subject_results")
      .select("subject_id, modulo, acertos, total, descartadas")
      .eq("user_id", user.id),
    supabaseAdmin
      .from("diagnostic_sessions")
      .select("modulo, status, posicao, question_ids")
      .eq("user_id", user.id),
    supabaseAdmin.from("subjects").select("id, name"),
  ])

  const nomePorId = new Map((subjects ?? []).map((s) => [s.id as string, s.name as string]))
  let linhas = resultados ?? []

  // Sem linhas consolidadas, duas situações muito diferentes:
  //   1. nunca fez diagnóstico  -> completed: false
  //   2. fez, mas o mapa nunca foi gravado -> consolida agora
  //
  // O caso 2 é a regra, não a exceção: os 28 usuários com diagnóstico legado
  // (m0) nunca passaram por uma conclusão de módulo, que é onde o responder
  // chama o recompute. Também cobre falha de consolidação no POST, que é
  // logada e segue — a leitura conserta.
  if (linhas.length === 0) {
    const { count } = await supabaseAdmin
      .from("question_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_diagnostic", true)

    if ((count ?? 0) === 0) {
      return NextResponse.json({ completed: false })
    }

    try {
      linhas = await recomputarResultados(user.id)
    } catch (err) {
      logError(err, { area: "diagnostico-resultado-recompute", userId: user.id })
    }
  }

  const medidas: MateriaMedida[] = linhas
    .map((r) => {
      const taxa = (r.acertos / r.total) * 100
      return {
        subject_id: r.subject_id,
        nome: nomePorId.get(r.subject_id) ?? "Matéria",
        acertos: r.acertos,
        total: r.total,
        descartadas: r.descartadas,
        taxa,
        nivel: classificarTaxa(taxa),
      }
    })
    .sort((a, b) => a.taxa - b.taxa)

  const medidasIds = new Set(medidas.map((m) => m.subject_id))
  const naoMedidas = (subjects ?? [])
    .filter((s) => !medidasIds.has(s.id as string))
    .map((s) => ({ subject_id: s.id as string, nome: s.name as string }))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))

  const cobertura = await coberturaDeSubjects(
    medidas.map((m) => m.subject_id),
    config.janelaEdicoes,
  )

  const statusPorModulo = new Map((sessoes ?? []).map((s) => [s.modulo as string, s]))
  const modulos = config.modulos.map((m) => {
    const s = statusPorModulo.get(m.id)
    const medidasDoModulo = medidas.filter((x) => m.subjects.includes(x.subject_id)).length
    return {
      id: m.id,
      label: m.label,
      materias: m.subjects.length,
      questoes: m.subjects.length * m.questoesPorMateria,
      status: (s?.status as string | undefined) ?? "nao_iniciado",
      posicao: (s?.posicao as number | undefined) ?? 0,
      total: (s?.question_ids as string[] | undefined)?.length ?? m.subjects.length * m.questoesPorMateria,
      materiasMedidas: medidasDoModulo,
    }
  })

  // Chegamos aqui só se o usuário TEM tentativas de diagnóstico. Zero matérias
  // medidas significa que todas as respostas vieram rápidas demais. Estado
  // próprio, em vez de uma tela vazia sem explicação nem saída.
  //
  // Não exige sessão concluída de propósito: os usuários legados (m0) não têm
  // sessão nenhuma, e 8 dos 28 caem exatamente aqui.
  const proximo = modulos.find((m) => m.status !== "concluida") ?? null

  return NextResponse.json({
    completed: true,
    estado: medidas.length === 0 ? "nada_medido" : "ok",
    medidas,
    naoMedidas,
    cobertura: {
      percentual: Math.round(cobertura.percentual),
      edicoes: cobertura.edicoes.length,
      questoesNaJanela: cobertura.questoesNaJanela,
    },
    descartadasTotal: medidas.reduce((s, m) => s + m.descartadas, 0),
    modulos,
    proximoModulo: proximo ? { id: proximo.id, label: proximo.label, questoes: proximo.questoes } : null,
    foco: medidas[0] ? { id: medidas[0].subject_id, nome: medidas[0].nome } : null,
  })
}
