// Lista nominal dos alunos de uma turma — visão OPERACIONAL, sua.
//
//   node scripts/turma-alunos.mjs unp
//   node scripts/turma-alunos.mjs unp --pendentes    (só quem ainda não terminou)
//
// ATENÇÃO: a saída deste script TEM nome e e-mail. Ela é pra você acompanhar o
// piloto — ver quem entrou, quem travou, quem falta. Ela NÃO vai para a
// instituição, em nenhuma circunstância.
//
// Por isso ele é um arquivo separado de `turma-relatorio.mjs`, e não uma flag
// dele. O relatório não busca `nome` nem `email` do banco em lugar nenhum: não
// existe caminho de código, nem por acidente nem por pressa, em que o documento
// que vai pro coordenador ganhe uma coluna de nomes. A separação é a garantia;
// uma flag `--com-nomes` seria só uma promessa.
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

const TZ = "America/Sao_Paulo"
const quando = (iso) =>
  iso
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(
        new Date(/(?:Z|[+-]\d{2}:?\d{2})$/.test(iso) ? iso : `${iso}Z`),
      )
    : "—"

async function porLotes(ids, tamanho, fn) {
  const out = []
  for (let i = 0; i < ids.length; i += tamanho) {
    const { data, error } = await fn(ids.slice(i, i + tamanho))
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
  }
  return out
}

const corta = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s).padEnd(n)

async function main() {
  const argv = process.argv.slice(2)
  const slug = argv.find((a) => !a.startsWith("--"))
  const soPendentes = argv.includes("--pendentes")

  if (!slug) {
    console.error("Uso: node scripts/turma-alunos.mjs <slug> [--pendentes]")
    return 1
  }

  const { data: turma, error: erroTurma } = await db
    .from("turmas")
    .select("id, slug, instituicao, rotulo")
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

  const { data: membros } = await db
    .from("users")
    .select("id, nome, email, created_at, role")
    .eq("turma_id", turma.id)
    .order("created_at")

  if (!membros || membros.length === 0) {
    console.log(`\nTurma "${turma.slug}" ainda não tem nenhum aluno marcado.`)
    console.log(`Link: https://www.aprovaoab.app.br/turma/${turma.slug}\n`)
    return 0
  }

  const ids = membros.map((m) => m.id)

  // Mesma régua do relatório: o piso sai do app_config, nunca de constante.
  const { data: cfgRow } = await db.from("app_config").select("value").eq("key", "diagnostico").maybeSingle()
  const cfg = cfgRow?.value ?? {}
  const MIN_TEMPO_MS = cfg.minTempoRespostaMs ?? 3000
  const m1 = (cfg.modulos ?? []).find((m) => m.id === "m1")
  const setM1 = new Set(m1?.subjects ?? [])
  const QUESTOES_M1 = (m1?.subjects?.length ?? 0) * (m1?.questoesPorMateria ?? 0)

  const attempts = await porLotes(ids, 50, (lote) =>
    db
      .from("question_attempts")
      .select("user_id, question_id, acertou, time_spent_ms")
      .eq("is_diagnostic", true)
      .in("user_id", lote),
  )
  const questoes = await porLotes([...new Set(attempts.map((a) => a.question_id))], 200, (lote) =>
    db.from("questions").select("id, subject_id").in("id", lote),
  )
  const subjectDaQuestao = new Map(questoes.map((q) => [q.id, q.subject_id]))

  const confirmados = new Map()
  for (let page = 1; ; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 })
    for (const u of data.users) confirmados.set(u.id, { conf: !!u.email_confirmed_at, ultimo: u.last_sign_in_at })
    if (data.users.length < 200) break
  }

  const porAluno = new Map(ids.map((id) => [id, { respostas: 0, materias: new Map() }]))
  for (const a of attempts) {
    const sid = subjectDaQuestao.get(a.question_id)
    if (!sid || !setM1.has(sid)) continue
    const al = porAluno.get(a.user_id)
    if (!al) continue
    al.respostas += 1
    const m = al.materias.get(sid) ?? { acertos: 0, total: 0 }
    if (a.time_spent_ms === null || a.time_spent_ms >= MIN_TEMPO_MS) {
      m.total += 1
      if (a.acertou) m.acertos += 1
    }
    al.materias.set(sid, m)
  }

  const linhas = membros.map((u) => {
    const al = porAluno.get(u.id)
    let acertos = 0
    let validas = 0
    let medidas = 0
    for (const [, m] of al.materias) {
      acertos += m.acertos
      validas += m.total
      if (m.total > 0) medidas += 1
    }
    const auth = confirmados.get(u.id) ?? {}
    return {
      nome: u.nome || "(sem nome)",
      email: u.email || "—",
      admin: u.role === "admin",
      confirmado: auth.conf === true,
      respostas: al.respostas,
      medidas,
      taxa: validas > 0 ? Math.round((100 * acertos) / validas) : null,
      completo: medidas === setM1.size,
      ultimo: auth.ultimo ?? null,
    }
  })

  const mostrar = soPendentes ? linhas.filter((l) => !l.completo) : linhas

  console.log(`\n${turma.instituicao} — ${turma.rotulo}  (${turma.slug})`)
  console.log(`${membros.length} aluno(s) marcados${soPendentes ? ` · mostrando ${mostrar.length} pendente(s)` : ""}\n`)
  console.log(
    `  ${corta("NOME", 22)}${corta("E-MAIL", 30)}${"CONF".padEnd(6)}${"RESP".padStart(5)}${"MED".padStart(5)}${"TAXA".padStart(6)}   ÚLTIMO ACESSO`,
  )
  for (const l of mostrar) {
    console.log(
      `  ${corta(l.nome + (l.admin ? " [admin]" : ""), 22)}${corta(l.email, 30)}` +
        `${(l.confirmado ? "sim" : "NÃO").padEnd(6)}` +
        `${String(l.respostas).padStart(5)}` +
        `${`${l.medidas}/${setM1.size}`.padStart(5)}` +
        `${(l.taxa === null ? "—" : l.taxa + "%").padStart(6)}   ${quando(l.ultimo)}`,
    )
  }

  const completos = linhas.filter((l) => l.completo).length
  const semResposta = linhas.filter((l) => l.respostas === 0).length
  const naoConfirmados = linhas.filter((l) => !l.confirmado).length

  console.log(`\n  RESP = respostas de diagnóstico enviadas (o módulo tem ${QUESTOES_M1})`)
  console.log(`  MED  = matérias efetivamente medidas — respostas abaixo de ${MIN_TEMPO_MS / 1000}s não contam`)
  console.log(`\n  ${completos} com o mapa completo · ${semResposta} sem nenhuma resposta · ${naoConfirmados} sem confirmar o e-mail`)
  console.log(`\n  Esta lista tem dado pessoal. Ela é sua — o relatório do coordenador`)
  console.log(`  sai de turma-relatorio.mjs e não contém nome nem e-mail.\n`)

  return 0
}

try {
  process.exitCode = await main()
} catch (e) {
  console.error("Falhou:", e.message)
  process.exitCode = 1
}
