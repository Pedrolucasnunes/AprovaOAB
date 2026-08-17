// Relatório agregado de uma turma institucional.
//
//   node scripts/turma-relatorio.mjs unp
//   node scripts/turma-relatorio.mjs unp --min-alunos 8
//   node scripts/turma-relatorio.mjs unp --html        (gera o arquivo pra virar PDF)
//
// Saída padrão: texto puro no terminal, pra ser lido de perto — é o formato que
// obriga a olhar o dado antes de apresentá-lo. Com `--html`, gera também um
// arquivo pronto pra impressão: abra no navegador e use Ctrl+P → "Salvar como
// PDF". Nenhuma dependência nova, e o arquivo fica no seu computador.
//
// Não há tela no produto e não há acesso da instituição ao banco — é decisão do
// piloto, e é o que sustenta a promessa feita à coordenação.
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
import { readFileSync, writeFileSync } from "node:fs"
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

/** "15 de agosto de 2026" — o relatório vai pra fora, o nome do arquivo não. */
const dataPorExtenso = () =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date())

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
  const gerarHtml = argv.includes("--html")

  if (!slug) {
    console.error(
      "Uso: node scripts/turma-relatorio.mjs <slug> [--html] [--min-alunos N] [--min-respostas N]",
    )
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
      divergencias.push({
        materia: nomeDaMateria.get(r.subject_id) ?? "?",
        tabela: `${r.acertos}/${r.total}`,
        script: m ? `${m.acertos}/${m.total}` : "sem dado",
      })
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
    divergencias.forEach((d) =>
      console.log(`    ${d.materia.padEnd(24)} tabela ${d.tabela}  vs  script ${d.script}`),
    )
    console.log(`\n  Divergência tem duas causas possíveis: a linha da tabela está`)
    console.log(`  DESATUALIZADA (o aluno respondeu mais depois do último recompute,`)
    console.log(`  e aí o número deste script é o correto), ou a regra de filtro`)
    console.log(`  divergiu do produto — que é bug e precisa ser investigado antes`)
    console.log(`  de apresentar qualquer coisa.`)
  }

  console.log(`\n${linha("═")}\n`)

  // ---------------------------------------------------------------- 7. HTML
  if (gerarHtml) {
    const arquivo = resolve(process.cwd(), `relatorio-${turma.slug}-${hojeBrasil()}.html`)
    writeFileSync(
      arquivo,
      htmlDoRelatorio({
        turma,
        geradoEm: dataPorExtenso(),
        materiasDoModulo: SUBJECTS_M1.length,
        questoesDoModulo: QUESTOES_M1,
        totalAlunos: membros.length,
        funil,
        suficientes,
        insuficientes,
        minAlunos,
        minRespostas,
        distribuicao:
          elegiveis.length === 0
            ? null
            : {
                acima,
                naLinha,
                abaixo,
                base: elegiveis.length,
                fora: consolidado.length - elegiveis.length,
                taxas: elegiveis.map((c) => Math.round(taxaDe(c))).sort((a, b) => a - b),
              },
        geral: { acertos: totalAcertos, respostas: totalRespostas },
        confianca: { descartadas: totalDescartadas, brutas, minTempoMs: MIN_TEMPO_MS, foraM1 },
        conferencia: { conferidas, divergencias },
      }),
      "utf8",
    )
    console.log(`Arquivo gerado: ${arquivo}`)
    console.log(`Abra no navegador e use Ctrl+P → "Salvar como PDF".\n`)
  }

  return 0
}

// ---------------------------------------------------------------------------
// Renderização pra impressão.
//
// HTML e não PDF direto: gerar PDF em Node exigiria puppeteer (um Chrome
// inteiro) ou uma lib de layout — dependência pesada pra um script que roda
// meia dúzia de vezes. O navegador já tem o melhor motor de impressão
// instalado, e "Ctrl+P → Salvar como PDF" produz o mesmo arquivo.
//
// O arquivo NÃO contém nome nem e-mail de ninguém, pela mesma razão que o
// terminal não contém: o dado pessoal nunca é buscado do banco.
// ---------------------------------------------------------------------------

/** Bandas de lib/metrics.ts: crítica < 40, média 40–70, boa > 70. */
function banda(taxa) {
  if (taxa === null) return "sem"
  if (taxa < 40) return "critica"
  if (taxa <= 70) return "media"
  return "boa"
}

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c])

function linhaDeMateria(l) {
  const largura = l.taxa === null ? 0 : l.taxa
  return `
      <tr>
        <th scope="row">${esc(l.materia)}</th>
        <td class="barra-cel">
          <div class="barra">
            <div class="preenche ${banda(l.taxa)}" style="width:${largura.toFixed(1)}%"></div>
            <div class="corte" title="linha de corte da 1ª fase"></div>
          </div>
        </td>
        <td class="num taxa ${banda(l.taxa)}">${l.taxa === null ? "—" : l.taxa.toFixed(1) + "%"}</td>
        <td class="num">${l.alunos}</td>
        <td class="num">${l.respostas}</td>
      </tr>`
}

function htmlDoRelatorio(d) {
  const pctD = d.confianca.brutas > 0 ? (100 * d.confianca.descartadas) / d.confianca.brutas : 0
  const taxaGeral = d.geral.respostas > 0 ? (100 * d.geral.acertos) / d.geral.respostas : null

  // O relatório avisa sozinho quando o próprio dado é fraco. Sem isto, uma
  // tabela bonita apoiada em 40% de clique passaria por medição.
  const avisoDescarte =
    pctD >= 25
      ? `<div class="aviso">
        <strong>Atenção à confiabilidade:</strong> ${pctD.toFixed(1)}% das respostas
        (${d.confianca.descartadas} de ${d.confianca.brutas}) vieram em menos de
        ${d.confianca.minTempoMs / 1000} segundos e foram descartadas. Um volume alto de
        descarte indica que parte da turma clicou sem ler — os percentuais deste
        relatório descrevem quem respondeu de verdade, e não necessariamente a
        turma inteira.
      </div>`
      : ""

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Diagnóstico da turma — ${esc(d.turma.instituicao)}</title>
<style>
  @page { size: A4; margin: 16mm 14mm 14mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px;
    font: 15px/1.55 ui-sans-serif, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
    color: #16202b; background: #fff;
    max-width: 900px; margin-inline: auto;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  h1 { font-size: 25px; margin: 0 0 4px; letter-spacing: -.02em; }
  h2 {
    font-size: 12px; text-transform: uppercase; letter-spacing: .09em;
    color: #5b6b7c; margin: 34px 0 10px;
    border-bottom: 1px solid #dde4ea; padding-bottom: 6px;
  }
  .marca { font-size: 11px; letter-spacing: .16em; text-transform: uppercase; color: #0f9d76; font-weight: 700; }
  .sub { color: #5b6b7c; font-size: 14px; margin: 0; }
  header { border-bottom: 2px solid #16202b; padding-bottom: 14px; margin-bottom: 4px; }
  .meta { margin-top: 10px; font-size: 13px; color: #5b6b7c; }
  .meta span { margin-right: 18px; white-space: nowrap; }

  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 7px 8px; border-bottom: 1px solid #eef2f6; vertical-align: middle; }
  th[scope="row"] { font-weight: 600; width: 27%; }
  thead th { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: #77879a; font-weight: 600; border-bottom: 1px solid #dde4ea; }
  .num { text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }
  .taxa { font-weight: 700; }

  .barra-cel { width: 42%; }
  .barra { position: relative; height: 11px; background: #eef2f6; border-radius: 6px; overflow: hidden; }
  .preenche { height: 100%; border-radius: 6px; }
  .corte { position: absolute; top: -2px; bottom: -2px; left: 50%; width: 2px; background: #16202b; opacity: .38; }
  .critica { background: #e5484d; color: #c02a2f; }
  .media   { background: #f5a524; color: #a76a06; }
  .boa     { background: #0f9d76; color: #0b7a5b; }
  .sem     { background: #cbd5e0; color: #77879a; }
  td.taxa.critica, td.taxa.media, td.taxa.boa, td.taxa.sem { background: none; }

  .nota { font-size: 12.5px; color: #5b6b7c; margin: 9px 0 0; }
  .fraca { opacity: .78; }
  .fraca h3 { font-size: 13px; margin: 26px 0 6px; color: #5b6b7c; font-weight: 600; }

  .destaques { display: flex; gap: 10px; margin: 0; padding: 0; list-style: none; }
  .destaques li { flex: 1; border: 1px solid #dde4ea; border-radius: 9px; padding: 12px 14px; }
  .destaques b { display: block; font-size: 27px; line-height: 1.15; font-variant-numeric: tabular-nums; }
  .destaques span { font-size: 12px; color: #5b6b7c; }

  .grandao { font-size: 46px; font-weight: 800; letter-spacing: -.03em; line-height: 1.05; }

  .aviso {
    border-left: 4px solid #f5a524; background: #fff8ec;
    padding: 12px 14px; border-radius: 0 8px 8px 0; margin: 16px 0 0; font-size: 13.5px;
  }
  footer { margin-top: 38px; border-top: 1px solid #dde4ea; padding-top: 14px; font-size: 12px; color: #77879a; }
  footer p { margin: 0 0 7px; }
  section, .destaques, table { break-inside: avoid; page-break-inside: avoid; }
</style>
</head>
<body>

<header>
  <div class="marca">AprovaOAB</div>
  <h1>Diagnóstico da turma</h1>
  <p class="sub">${esc(d.turma.instituicao)} · ${esc(d.turma.rotulo)}</p>
  <div class="meta">
    <span><strong>Gerado em:</strong> ${esc(d.geradoEm)}</span>
    <span><strong>Alunos:</strong> ${d.totalAlunos}</span>
    <span><strong>Instrumento:</strong> ${d.materiasDoModulo} matérias, ${d.questoesDoModulo} questões de dificuldade média e difícil</span>
  </div>
</header>

<section>
  <h2>Participação</h2>
  <table>
    <tbody>
      ${d.funil
        .map(
          ([rotulo, n]) => `<tr>
        <th scope="row" style="width:52%">${esc(rotulo)}</th>
        <td class="barra-cel"><div class="barra"><div class="preenche boa" style="width:${d.totalAlunos > 0 ? ((100 * n) / d.totalAlunos).toFixed(1) : 0}%"></div></div></td>
        <td class="num"><strong>${n}</strong></td>
        <td class="num">${d.totalAlunos > 0 ? ((100 * n) / d.totalAlunos).toFixed(0) : "—"}%</td>
      </tr>`,
        )
        .join("")}
    </tbody>
  </table>
</section>

<section>
  <h2>Aproveitamento por matéria</h2>
  ${
    d.suficientes.length > 0
      ? `<table>
    <thead><tr><th>Matéria</th><th></th><th class="num">Acerto</th><th class="num">Alunos</th><th class="num">Respostas</th></tr></thead>
    <tbody>${d.suficientes.map(linhaDeMateria).join("")}</tbody>
  </table>
  <p class="nota">Ordenadas da menor para a maior taxa de acerto. A linha vertical marca
  os 50% — a proporção necessária para aprovação na 1ª fase.</p>`
      : `<p class="nota">Nenhuma matéria alcançou o mínimo de ${d.minAlunos} alunos medidos.
  Com a amostra atual, nenhuma comparação entre matérias se sustenta.</p>`
  }

  ${
    d.insuficientes.length > 0
      ? `<div class="fraca">
    <h3>Sem amostra suficiente — não ordenadas</h3>
    <table>
      <thead><tr><th>Matéria</th><th></th><th class="num">Acerto</th><th class="num">Alunos</th><th class="num">Respostas</th></tr></thead>
      <tbody>${d.insuficientes.map(linhaDeMateria).join("")}</tbody>
    </table>
    <p class="nota">Menos de ${d.minAlunos} alunos medidos. Os números estão aqui por
    transparência, mas ficam fora do ranking: uma taxa apoiada em poucos alunos não é
    comparável com uma apoiada na turma inteira, e ordená-las lado a lado afirmaria
    algo que o dado não sustenta.</p>
  </div>`
      : ""
  }
</section>

<section>
  <h2>Distribuição interna</h2>
  ${
    d.distribuicao
      ? `<ul class="destaques">
    <li><b class="boa" style="background:none">${d.distribuicao.acima}</b><span>acima dos 50%</span></li>
    <li><b class="media" style="background:none">${d.distribuicao.naLinha}</b><span>exatamente na linha</span></li>
    <li><b class="critica" style="background:none">${d.distribuicao.abaixo}</b><span>abaixo dos 50%</span></li>
  </ul>
  <p class="nota">Base: ${d.distribuicao.base} aluno(s) com ao menos ${d.minRespostas} respostas válidas.
  ${d.distribuicao.fora > 0 ? `${d.distribuicao.fora} aluno(s) responderam pouco para entrar nesta conta — eles aparecem na participação, não aqui.` : ""}</p>
  <p class="nota">Taxas individuais, sem identificação: ${d.distribuicao.taxas.join("% · ")}%</p>`
      : `<p class="nota">Nenhum aluno alcançou ${d.minRespostas} respostas válidas — sem distribuição.</p>`
  }
</section>

<section>
  <h2>Aproveitamento geral</h2>
  <div class="grandao ${banda(taxaGeral)}" style="background:none">${taxaGeral === null ? "—" : taxaGeral.toFixed(1) + "%"}</div>
  <p class="nota">${d.geral.acertos} acertos em ${d.geral.respostas} respostas válidas.</p>
  ${avisoDescarte}
</section>

<footer>
  <p><strong>Como estes números foram apurados.</strong> Cada aluno respondeu questões de
  exames anteriores da OAB, de dificuldade média e difícil, distribuídas entre as
  ${d.materiasDoModulo} matérias de maior peso na 1ª fase.</p>
  <p>Respostas enviadas em menos de ${d.confianca.minTempoMs / 1000} segundos são descartadas:
  abaixo desse tempo o acerto fica inferior ao do chute aleatório, ou seja, é clique e não
  leitura. Nesta turma foram ${d.confianca.descartadas} de ${d.confianca.brutas}
  (${pctD.toFixed(1)}%). Matéria sem nenhuma resposta válida é tratada como
  <em>não medida</em>, nunca como 0% de acerto.</p>
  ${d.confianca.foraM1 > 0 ? `<p>${d.confianca.foraM1} resposta(s) em matérias fora deste conjunto não entram em nenhum número acima.</p>` : ""}
  <p><strong>Privacidade.</strong> Este relatório é agregado. Nenhum aluno é identificado,
  e a instituição não tem acesso a dados individuais nem à plataforma.</p>
  <p>AprovaOAB · gerado em ${esc(d.geradoEm)}</p>
</footer>

</body>
</html>
`
}

try {
  process.exitCode = await main()
} catch (e) {
  console.error("Falhou:", e.message)
  process.exitCode = 1
}
