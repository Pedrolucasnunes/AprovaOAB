import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { getDiagnosticoConfig } from "@/lib/config"
import { coberturaDeSubjects } from "@/lib/exames"
import { logError } from "@/lib/logger"
import { classificarTaxa, type NivelTaxa } from "@/lib/metrics"
import { recomputarResultados } from "@/lib/services/diagnostico"
import { fetchAllRows, fetchByIds } from "@/lib/supabase-paginate"
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

  // Duas situações bem diferentes que a tela precisa separar:
  //   "perguntamos e não deu pra medir" (respostas rápidas demais)
  //   "ainda não perguntamos nada"
  // Juntar as duas numa lista só faz a segunda parecer culpa do usuário e a
  // primeira desaparecer.
  const tentadas = await fetchAllRows<{ question_id: string; time_spent_ms: number | null }>(() =>
    supabaseAdmin
      .from("question_attempts")
      .select("question_id, time_spent_ms")
      .eq("user_id", user.id)
      .eq("is_diagnostic", true),
  )

  // O total de descartes NÃO pode sair da soma das linhas medidas: matéria com
  // todas as respostas descartadas não tem linha, e os descartes dela sumiriam
  // da conta. Era o que fazia a tela dizer "3 respostas" quando foram 13.
  const descartadasTotal = tentadas.filter(
    (a) => a.time_spent_ms !== null && a.time_spent_ms < config.minTempoRespostaMs,
  ).length

  const questoesTentadas = await fetchByIds<{ id: string; subject_id: string }>(
    (ids) => supabaseAdmin.from("questions").select("id, subject_id").in("id", ids),
    [...new Set(tentadas.map((a) => a.question_id))],
  )
  const subjectsTentados = new Set(questoesTentadas.map((q) => q.subject_id))

  const porNome = (a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome, "pt-BR")
  const naoMedidasBase = (subjects ?? [])
    .filter((s) => !medidasIds.has(s.id as string))
    .map((s) => ({ subject_id: s.id as string, nome: s.name as string }))

  const naoMedidasTentadas = naoMedidasBase.filter((s) => subjectsTentados.has(s.subject_id)).sort(porNome)
  const naoMedidasNovas = naoMedidasBase.filter((s) => !subjectsTentados.has(s.subject_id)).sort(porNome)
  const naoMedidas = [...naoMedidasTentadas, ...naoMedidasNovas]

  const cobertura = await coberturaDeSubjects(
    medidas.map((m) => m.subject_id),
    config.janelaEdicoes,
  )

  const statusPorModulo = new Map((sessoes ?? []).map((s) => [s.modulo as string, s]))
  const modulos = config.modulos.map((m) => {
    const s = statusPorModulo.get(m.id)
    const pendentes = m.subjects.filter((id) => !medidasIds.has(id))
    return {
      id: m.id,
      label: m.label,
      materias: m.subjects.length,
      // Quantas questões FALTAM, não o tamanho nominal do módulo. Numa
      // repescagem o usuário responde só as matérias pendentes.
      questoes: pendentes.length * m.questoesPorMateria,
      status: (s?.status as string | undefined) ?? "nao_iniciado",
      posicao: (s?.posicao as number | undefined) ?? 0,
      total: (s?.question_ids as string[] | undefined)?.length ?? m.subjects.length * m.questoesPorMateria,
      materiasMedidas: m.subjects.length - pendentes.length,
      materiasPendentes: pendentes.length,
    }
  })

  // Chegamos aqui só se o usuário TEM tentativas de diagnóstico. Zero matérias
  // medidas significa que todas as respostas vieram rápidas demais. Estado
  // próprio, em vez de uma tela vazia sem explicação nem saída.
  //
  // Não exige sessão concluída de propósito: os usuários legados (m0) não têm
  // sessão nenhuma, e 8 dos 28 caem exatamente aqui.
  // O próximo módulo é o que tem matéria PENDENTE, não o que não foi concluído.
  // Antes, um Módulo 1 respondido inteiro mas com 5 matérias sem medir contava
  // como concluído, e a tela oferecia o Módulo 2 — que não cobre nenhuma delas.
  const proximo = modulos.find((m) => m.materiasPendentes > 0) ?? null

  return NextResponse.json({
    completed: true,
    estado: medidas.length === 0 ? "nada_medido" : "ok",
    medidas,
    naoMedidas,
    naoMedidasTentadas,
    naoMedidasNovas,
    cobertura: {
      percentual: Math.round(cobertura.percentual),
      edicoes: cobertura.edicoes.length,
      questoesNaJanela: cobertura.questoesNaJanela,
    },
    descartadasTotal,
    respostasTotal: tentadas.length,
    modulos,
    proximoModulo: proximo ? { id: proximo.id, label: proximo.label, questoes: proximo.questoes } : null,
    foco: medidas[0] ? { id: medidas[0].subject_id, nome: medidas[0].nome } : null,
  })
}
