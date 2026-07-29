import { NextResponse } from "next/server"
import { requireUser } from "@/lib/auth-server"
import { getDiagnosticoConfig } from "@/lib/config"
import { coberturaDeSubjects } from "@/lib/exames"
import { classificarTaxa, type NivelTaxa } from "@/lib/metrics"
import { placarPorMateria } from "@/lib/services/desempenho"
import { mapaConsolidado, proximoModuloPendente } from "@/lib/services/diagnostico"
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
  // O caso 2 é a regra, não a exceção: os ~23 usuários com diagnóstico legado
  // (m0) nunca passaram por uma conclusão de módulo, que é onde o responder
  // chama o recompute. Também cobre falha de consolidação no POST, que é
  // logada e segue — a leitura conserta.
  //
  // `mapaConsolidado` é a MESMA materialização que o dashboard usa via
  // proximoModuloPendente. Quando só esta rota consolidava, o card do dashboard
  // dizia "faltam 8 matérias" e esta tela mostrava 3 medidas, pro mesmo usuário.
  if (linhas.length === 0) {
    const medidosIds = await mapaConsolidado(user.id)
    if (medidosIds.size === 0) {
      const { count } = await supabaseAdmin
        .from("question_attempts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_diagnostic", true)

      if ((count ?? 0) === 0) {
        return NextResponse.json({ completed: false })
      }
    }

    const { data: recarregadas } = await supabaseAdmin
      .from("diagnostic_subject_results")
      .select("subject_id, modulo, acertos, total, descartadas")
      .eq("user_id", user.id)
    linhas = recarregadas ?? []
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
  //
  // Escopo "diagnostico": esta tela é o retrato do que O DIAGNÓSTICO mediu, e
  // não pode mudar quando o usuário treina depois. Mesma função do placar que
  // ordena o treino — uma régua de confiança só, num lugar só.
  const placarDiag = await placarPorMateria(supabaseAdmin, user.id, "diagnostico")

  // O total de descartes NÃO pode sair da soma das linhas medidas: matéria com
  // todas as respostas descartadas não tem linha em diagnostic_subject_results,
  // e os descartes dela sumiriam da conta. Era o que fazia a tela dizer "3
  // respostas" quando foram 13. O placar mantém a entrada mesmo com total = 0.
  const descartadasTotal = [...placarDiag.values()].reduce((acc, p) => acc + p.descartadas, 0)
  const respostasTotal = [...placarDiag.values()].reduce((acc, p) => acc + p.total + p.descartadas, 0)
  const subjectsTentados = new Set(placarDiag.keys())

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
  //
  // O próximo módulo sai do MESMO helper que o dashboard usa. Antes essa regra
  // ("o próximo é o que tem matéria pendente, não o que não foi concluído") só
  // existia aqui, e o dashboard não tinha nenhuma — os entry points do
  // diagnóstico eram todos gateados em `!diagnosticoCompleto`, então o Módulo 2
  // ficava inalcançável pra quem fechasse esta tela.
  const proximo = await proximoModuloPendente(user.id)

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
    respostasTotal,
    modulos,
    // `questoesPorMateria` vai pra tela poder declarar a PROFUNDIDADE: o Módulo
    // 2 mede 1 questão por matéria contra as 2 do Módulo 1. Sem isso o usuário
    // vê o mesmo placar e assume a mesma confiança nas duas medições.
    proximoModulo: proximo,
    foco: medidas[0] ? { id: medidas[0].subject_id, nome: medidas[0].nome } : null,
  })
}
