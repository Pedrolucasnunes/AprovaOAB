// Relatório agregado de uma turma institucional.
//
//   node scripts/turma-relatorio.mjs unp
//   node scripts/turma-relatorio.mjs unp --min-alunos 8
//
// Saída: texto puro, pra ser lido de perto e transcrito à mão pro PDF. Não há
// tela e não há acesso da instituição ao banco — é decisão do piloto, e é o que
// sustenta a promessa feita à coordenação.
//
// LGPD POR CONSTRUÇÃO: este script não seleciona `nome` nem `email` de lugar
// nenhum. Não é uma regra que alguém precisa lembrar de seguir na hora de
// imprimir — o dado pessoal simplesmente não é buscado.
//
// ---------------------------------------------------------------------------
// DE ONDE VÊM OS NÚMEROS, E POR QUE NÃO DA TABELA DERIVADA
//
// `diagnostic_subject_results` já tem o mapa por matéria com o filtro de <3s
// aplicado, e seria a fonte óbvia. Ela não serve sozinha porque é materializada
// PREGUIÇOSAMENTE: `recomputarResultados` roda na conclusão do módulo e
// `mapaConsolidado` na leitura do dashboard. Quem responde 5 das 16 questões,
// fecha a aba e não volta não passa por nenhum dos dois.
//
// Medido na base em 15/ago/2026: 32 usuários têm resposta de diagnóstico e só
// 22 têm linha na tabela derivada. Oito dos ausentes são legítimos (todas as
// respostas abaixo de 3s, então não há matéria medida), mas DOIS têm respostas
// válidas de Módulo 1 e sumiriam do relatório — justamente o aluno que abandona
// no meio, que é quem o piloto mais precisa contar.
//
// Então a agregação sai de `question_attempts`, e a régua NÃO é reescrita:
// `minTempoRespostaMs` vem do `app_config`, a mesma fonte que o app lê, e o
// bloco final CONFERE este cálculo contra `diagnostic_subject_results` para
// todo aluno que tenha linha lá. Divergência aparece como erro visível em vez
// de silêncio.
// ---------------------------------------------------------------------------
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const env = {}
try {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "")
  }
} catch (e) {
  console.error("Não consegui ler .env.local:", e.message)
  process.exit(1)
}

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local")
  process.exit(1)
}
const db = createClient(url, key, { auth: { persistSession: false } })

// ------------------------------------------------------------------ constantes
// A 1ª fase aprova com 40 de 80 questões. Espelha META_APROVACAO de
// lib/metrics.ts — é fato sobre o exame, não configuração do produto.
const LINHA_DE_CORTE = 50

// Pisos de amostra. São ESCOLHA DE JULGAMENTO, não constante derivada: abaixo
// deles a taxa existe, mas é anedota, e uma anedota ordenada numa tabela vira
// afirmação sobre a turma. Ajustáveis por CLI justamente porque são julgamento.
const MIN_ALUNOS_MATERIA = 5
const MIN_RESPOSTAS_ALUNO = 8 // metade do Módulo 1

// ------------------------------------------------------------------ utilidades
const YMD = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})
const hojeBrasil = () => YMD.format(new Date())

/** PostgREST tem teto de URL: quebra `.in()` em lotes. */
async function porLotes(ids, tamanho, fn) {
  const out = []
  for (let i = 0; i < ids.length; i += tamanho) {
    const { data, error } = await fn(ids.slice(i, i + tamanho))
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
  }
  return out
}

const pct = (a, b) => (b > 0 ? ((100 * a) / b).toFixed(1) : "—")
const linha = (c = "─", n = 74) => c.repeat(n)

// Saída por `process.exitCode` e não `process.exit()`: no Windows, encerrar à
// força com socket do Supabase aberto imprime um "Assertion failed ... uv" do
// libuv DEPOIS da mensagem de erro. O script funciona, mas parece ter quebrado.
async function main() {
  const argv = process.argv.slice(2)
  const slug = argv.find((a) => !a.startsWith("--"))
  const arg = (nome, padrao) => {
    const i = argv.indexOf(`--${nome}`)
    return i >= 0 && argv[i + 1] ? Number(argv[i + 1]) : padrao
  }
  const minAlunos = arg("min-alunos", MIN_ALUNOS_MATERIA)
  const minRespostas = arg("min-respostas", MIN_RESPOSTAS_ALUNO)

  if (!slug) {
    console.error("Uso: node scripts/turma-relatorio.mjs <slug> [--min-alunos N] [--min-respostas N]")
    return 1
  }

  // ---------------------------------------------------------------- 1. a turma
  const { data: turma, error: erroTurma } = await db
    .from("turmas")
    .select("id, slug, instituicao, rotulo, aberta_ate, created_at")
    .eq("slug", slug)
    .maybeSingle()

  if (erroTurma) {
    console.error("Erro consultando turmas:", erroTurma.message)
    return 1
  }
  if (!turma) {
    const { data: todas } = await db.from("turmas").select("slug").order("slug")
    console.error(`Turma "${slug}" não existe.`)
    console.error("Turmas cadastradas:", (todas ?? []).map((t) => t.slug).join(", ") || "(nenhuma)")
    return 1
  }

  // ---------------------------------------------------------------- 2. config
  const { data: cfgRow, error: erroCfg } = await db
    .from("app_config")
    .select("value")
    .eq("key", "diagnostico")
    .maybeSingle()

  if (erroCfg || !cfgRow) {
    console.error("Não consegui ler app_config.diagnostico:", erroCfg?.message ?? "linha ausente")
    return 1
  }
  const cfg = cfgRow.value
  const MIN_TEMPO_MS = cfg.minTempoRespostaMs
  const moduloM1 = cfg.modulos.find((m) => m.id === "m1")
  if (!moduloM1) {
    console.error("app_config.diagnostico não tem módulo m1.")
    return 1
  }
  const SUBJECTS_M1 = moduloM1.subjects
  const QUESTOES_M1 = SUBJECTS_M1.length * moduloM1.questoesPorMateria

  // ---------------------------------------------------------------- 3. alunos
  const { data: membrosBrutos, error: erroMembros } = await db
    .from("users")
    .select("id, created_at, role") // sem nome, sem e-mail — ver cabeçalho
    .eq("turma_id", turma.id)
  if (erroMembros) {
    console.error("Erro consultando membros:", erroMembros.message)
    return 1
  }

  const admins = membrosBrutos.filter((m) => m.role === "admin").length
  const membros = membrosBrutos.filter((m) => m.role !== "admin")
  const ids = membros.map((m) => m.id)

  if (ids.length === 0) {
    console.log(`\nTurma "${turma.slug}" ainda não tem nenhum aluno marcado.`)
    console.log("Se o link já foi divulgado, confira se a coordenação usou a URL certa:")
    console.log(`  https://www.aprovaoab.app.br/turma/${turma.slug}`)
    console.log(`  https://www.aprovaoab.app.br/?turma=${turma.slug}`)
    return 0
  }

  // Confirmação de e-mail vem da Auth API (paginada — nunca assumir 1 página).
  const confirmados = new Set()
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
    if (error) {
      console.error("Erro na Auth API:", error.message)
      return 1
    }
    for (const u of data.users) if (u.email_confirmed_at) confirmados.add(u.id)
    if (data.users.length < 200) break
  }

  // ---------------------------------------------------------------- 4. respostas
  const attempts = await porLotes(ids, 50, (lote) =>
    db
      .from("question_attempts")
      .select("user_id, question_id, acertou, time_spent_ms, diagnostic_module")
      .eq("is_diagnostic", true)
      .in("user_id", lote),
  )

  const questionIds = [...new Set(attempts.map((a) => a.question_id))]
  const questoes = await porLotes(questionIds, 200, (lote) =>
    db.from("questions").select("id, subject_id").in("id", lote),
  )
  const subjectDaQuestao = new Map(questoes.map((q) => [q.id, q.subject_id]))

  const { data: subjects } = await db.from("subjects").select("id, name")
  const nomeDaMateria = new Map((subjects ?? []).map((s) => [s.id, s.name]))

  // ---------------------------------------------------------------- 5. agregação
  // Mesma regra de lib/services/desempenho.ts:
  //   - `time_spent_ms` NULO conta como válida (respostas anteriores à
  //     instrumentação; o filtro é prospectivo, de propósito);
  //   - abaixo do piso não conta em acertos/total, só em `descartadas`;
  //   - matéria com total = 0 é matéria NÃO MEDIDA, nunca matéria com 0%.
  const valida = (a) => a.time_spent_ms === null || a.time_spent_ms >= MIN_TEMPO_MS

  const porAluno = new Map(ids.map((id) => [id, { materias: new Map(), respostasM1: 0, foraM1: 0 }]))
  const setM1 = new Set(SUBJECTS_M1)

  for (const a of attempts) {
    const aluno = porAluno.get(a.user_id)
    if (!aluno) continue
    const sid = subjectDaQuestao.get(a.question_id)
    if (!sid) continue

    if (!setM1.has(sid)) {
      aluno.foraM1 += 1
      continue
    }
    if (a.diagnostic_module === "m1") aluno.respostasM1 += 1

    const m = aluno.materias.get(sid) ?? { acertos: 0, total: 0, descartadas: 0 }
    if (valida(a)) {
      m.total += 1
      if (a.acertou) m.acertos += 1
    } else {
      m.descartadas += 1
    }
    aluno.materias.set(sid, m)
  }

  // Por matéria, sobre a turma
  const porMateria = new Map(
    SUBJECTS_M1.map((s) => [s, { acertos: 0, total: 0, descartadas: 0, alunos: 0 }]),
  )
  for (const [, aluno] of porAluno) {
    for (const [sid, m] of aluno.materias) {
      const agg = porMateria.get(sid)
      if (!agg) continue
      agg.acertos += m.acertos
      agg.total += m.total
      agg.descartadas += m.descartadas
      if (m.total > 0) agg.alunos += 1 // conta ALUNO MEDIDO, não aluno que clicou
    }
  }

  // Por aluno, o consolidado
  const consolidado = []
  for (const [id, aluno] of porAluno) {
    let acertos = 0
    let total = 0
    let medidas = 0
    for (const [, m] of aluno.materias) {
      acertos += m.acertos
      total += m.total
      if (m.total > 0) medidas += 1
    }
    consolidado.push({
      id,
      acertos,
      total,
      medidas,
      respostasM1: aluno.respostasM1,
      foraM1: aluno.foraM1,
      brutas: aluno.materias.size > 0,
    })
  }

  // ---------------------------------------------------------------- 6. saída
  const totalAcertos = [...porMateria.values()].reduce((s, m) => s + m.acertos, 0)
  const totalRespostas = [...porMateria.values()].reduce((s, m) => s + m.total, 0)
  const totalDescartadas = [...porMateria.values()].reduce((s, m) => s + m.descartadas, 0)

  console.log()
  console.log(linha("═"))
  console.log(`RELATÓRIO DA TURMA — ${turma.instituicao}`)
  console.log(`${turma.rotulo}`)
  console.log(linha("═"))
  console.log(`Gerado em ....... ${hojeBrasil()}`)
  console.log(
    `Link ............ /turma/${turma.slug}${turma.aberta_ate ? `  (marca até ${turma.aberta_ate})` : ""}`,
  )
  console.log(
    `Diagnóstico ..... Módulo 1 — ${SUBJECTS_M1.length} matérias, ${QUESTOES_M1} questões (média/difícil)`,
  )
  if (admins > 0) console.log(`(${admins} conta(s) de admin excluída(s) do agregado)`)

  // ---- Funil
  const comAlgumaResposta = consolidado.filter((c) => c.brutas || c.respostasM1 > 0).length
  const responderamTudo = consolidado.filter((c) => c.respostasM1 >= QUESTOES_M1).length
  const mapaCompleto = consolidado.filter((c) => c.medidas === SUBJECTS_M1.length).length

  console.log(`\n${linha()}\nPARTICIPAÇÃO\n${linha()}`)
  const funil = [
    ["Entraram pelo link", membros.length],
    ["Confirmaram o e-mail", membros.filter((m) => confirmados.has(m.id)).length],
    ["Responderam ao menos 1 questão", comAlgumaResposta],
    [`Responderam as ${QUESTOES_M1} do Módulo 1`, responderamTudo],
    [`Têm as ${SUBJECTS_M1.length} matérias medidas`, mapaCompleto],
  ]
  for (const [rotulo, n] of funil) {
    console.log(`  ${rotulo.padEnd(36)} ${String(n).padStart(4)}   ${pct(n, membros.length).padStart(5)}%`)
  }

  // ---- Aproveitamento por matéria
  const linhas = SUBJECTS_M1.map((sid) => {
    const m = porMateria.get(sid)
    return {
      materia: nomeDaMateria.get(sid) ?? sid.slice(0, 8),
      taxa: m.total > 0 ? (100 * m.acertos) / m.total : null,
      alunos: m.alunos,
      respostas: m.total,
      descartadas: m.descartadas,
    }
  })

  const suficientes = linhas
    .filter((l) => l.taxa !== null && l.alunos >= minAlunos)
    .sort((a, b) => a.taxa - b.taxa)
  const insuficientes = linhas
    .filter((l) => l.taxa === null || l.alunos < minAlunos)
    .sort((a, b) => b.alunos - a.alunos)

  const cabecalho = `  ${"MATÉRIA".padEnd(26)}${"TAXA".padStart(7)}${"ALUNOS".padStart(8)}${"RESP.".padStart(7)}${"DESC.".padStart(7)}`
  const imprimir = (l) =>
    console.log(
      `  ${l.materia.padEnd(26)}${(l.taxa === null ? "—" : l.taxa.toFixed(1) + "%").padStart(7)}${String(l.alunos).padStart(8)}${String(l.respostas).padStart(7)}${String(l.descartadas).padStart(7)}`,
    )

  console.log(`\n${linha()}\nAPROVEITAMENTO POR MATÉRIA — da pior para a melhor\n${linha()}`)
  if (suficientes.length > 0) {
    console.log(cabecalho)
    suficientes.forEach(imprimir)
  } else {
    console.log("  Nenhuma matéria atingiu o piso de amostra.")
  }

  if (insuficientes.length > 0) {
    console.log(`\n  ── NÃO ORDENADAS: menos de ${minAlunos} alunos medidos ──`)
    console.log(cabecalho)
    insuficientes.forEach(imprimir)
    console.log(
      `\n  Estas ficam fora do ranking de propósito. Uma taxa apoiada em poucos\n` +
        `  alunos não é comparável com uma apoiada na turma inteira, e ordená-las\n` +
        `  lado a lado afirmaria algo que o dado não sustenta.`,
    )
  }

  // ---- Distribuição interna
  const elegiveis = consolidado.filter((c) => c.total >= minRespostas)
  const taxaDe = (c) => (100 * c.acertos) / c.total
  const acima = elegiveis.filter((c) => taxaDe(c) > LINHA_DE_CORTE).length
  const naLinha = elegiveis.filter((c) => taxaDe(c) === LINHA_DE_CORTE).length
  const abaixo = elegiveis.filter((c) => taxaDe(c) < LINHA_DE_CORTE).length

  console.log(`\n${linha()}\nDISTRIBUIÇÃO INTERNA — linha de corte da 1ª fase (${LINHA_DE_CORTE}%)\n${linha()}`)
  if (elegiveis.length === 0) {
    console.log(`  Nenhum aluno atingiu ${minRespostas} respostas válidas — sem distribuição.`)
  } else {
    console.log(`  Acima da linha ......... ${String(acima).padStart(3)}   ${pct(acima, elegiveis.length).padStart(5)}%`)
    console.log(`  Exatamente na linha .... ${String(naLinha).padStart(3)}   ${pct(naLinha, elegiveis.length).padStart(5)}%`)
    console.log(`  Abaixo da linha ........ ${String(abaixo).padStart(3)}   ${pct(abaixo, elegiveis.length).padStart(5)}%`)
    console.log(`\n  Base: ${elegiveis.length} aluno(s) com ao menos ${minRespostas} respostas válidas.`)
    const fora = consolidado.length - elegiveis.length
    if (fora > 0) {
      console.log(`  ${fora} aluno(s) ficaram fora por responderem pouco — contam na participação, não aqui.`)
    }
    const taxas = elegiveis.map((c) => Math.round(taxaDe(c))).sort((a, b) => a - b)
    console.log(`  Taxas individuais: ${taxas.join(", ")}`)
  }

  // ---- Geral e confiança
  console.log(`\n${linha()}\nAPROVEITAMENTO GERAL DA TURMA\n${linha()}`)
  console.log(
    `  ${pct(totalAcertos, totalRespostas)}%  (${totalAcertos} acertos em ${totalRespostas} respostas válidas)`,
  )

  console.log(`\n${linha()}\nCONFIABILIDADE DO DADO\n${linha()}`)
  const brutas = totalRespostas + totalDescartadas
  console.log(
    `  Respostas abaixo de ${MIN_TEMPO_MS / 1000}s (descartadas) ... ${totalDescartadas} de ${brutas}  (${pct(totalDescartadas, brutas)}%)`,
  )
  console.log(`  O piso vem de app_config.diagnostico.minTempoRespostaMs — a mesma`)
  console.log(`  fonte que o app usa. Resposta abaixo dele acerta menos que o chute`)
  console.log(`  puro: é clique, não resposta.`)
  const foraM1 = consolidado.reduce((s, c) => s + c.foraM1, 0)
  if (foraM1 > 0) {
    console.log(`\n  ${foraM1} resposta(s) de diagnóstico em matérias fora do Módulo 1`)
    console.log(`  (Módulo 2) não entram em nenhum número acima.`)
  }

  // ---- Conferência contra a tabela derivada
  const dsr = await porLotes(ids, 50, (lote) =>
    db.from("diagnostic_subject_results").select("user_id, subject_id, acertos, total").in("user_id", lote),
  )

  let conferidas = 0
  const divergencias = []
  for (const r of dsr) {
    if (!setM1.has(r.subject_id)) continue
    const m = porAluno.get(r.user_id)?.materias.get(r.subject_id)
    conferidas += 1
    if (!m || m.acertos !== r.acertos || m.total !== r.total) {
      divergencias.push(
        `    ${(nomeDaMateria.get(r.subject_id) ?? "?").padEnd(24)} tabela ${r.acertos}/${r.total}  vs  script ${m ? `${m.acertos}/${m.total}` : "sem dado"}`,
      )
    }
  }

  console.log(`\n${linha()}\nCONFERÊNCIA CONTRA diagnostic_subject_results\n${linha()}`)
  if (conferidas === 0) {
    console.log("  Nenhum aluno da turma tem linha consolidada ainda — nada a conferir.")
  } else if (divergencias.length === 0) {
    console.log(`  ${conferidas} linha(s) conferidas, todas batem.`)
    console.log("  A régua de <3s deste script concorda com a do produto.")
  } else {
    console.log(`  ${divergencias.length} de ${conferidas} linha(s) divergem:`)
    divergencias.forEach((d) => console.log(d))
    console.log(`\n  Divergência tem duas causas possíveis: a linha da tabela está`)
    console.log(`  DESATUALIZADA (o aluno respondeu mais depois do último recompute,`)
    console.log(`  e aí o número deste script é o correto), ou a regra de filtro`)
    console.log(`  divergiu do produto — que é bug e precisa ser investigado antes`)
    console.log(`  de apresentar qualquer coisa.`)
  }

  console.log(`\n${linha("═")}\n`)
  return 0
}

try {
  process.exitCode = await main()
} catch (e) {
  console.error("Falhou:", e.message)
  process.exitCode = 1
}
