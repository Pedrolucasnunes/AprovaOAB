// Retenção — retrato congelado da base antes de qualquer intervenção.
//
//   node scripts/retencao.mjs
//
// Por que existe: `scripts/ativacao.mjs` mede se a pessoa CHEGA a usar o
// produto; nada media se ela VOLTA. Os números que motivaram o plano de
// retenção (13/ago/2026) saíram de consultas de improviso numa sessão — e
// consulta de improviso não se repete igual. A definição de cada métrica
// precisa estar congelada em código, senão a comparação de daqui a três
// semanas não vale nada. Mesmo papel que o `ativacao.mjs` cumpre pra Fase 0.
//
// Três decisões que este script toma de propósito:
//
// 1. ATIVIDADE = PRESENÇA, NÃO CONHECIMENTO. Ao contrário do placar por
//    matéria e das métricas de ativação, aqui NÃO se descarta resposta com
//    time_spent_ms < 3000. Aquele filtro existe pra não carimbar alguém de
//    "crítico" com base em clique; retenção pergunta se a pessoa voltou, e
//    quem voltou e clicou rápido voltou do mesmo jeito.
//
// 2. A CONTA AUTORITATIVA É A DO AUTH. `question_attempts` tem user_id de
//    gente que não existe mais em auth.users (linhas órfãs, 4 na medição de
//    13/ago). Contar pela tabela infla o denominador em silêncio — daí o
//    cruzamento e a linha própria de órfãos no relatório.
//
// 3. ADMIN FORA. Conta de admin testa o produto todo dia e sozinha inverteria
//    o sinal de "ativos nos últimos 7 dias" numa base deste tamanho. O total
//    com admin sai junto, pra reconciliar com qualquer número anterior.
//
// Lê .env.local manualmente (script fora do runtime do Next) — a service role
// key nunca passa por variável de ambiente nem aparece na saída.
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

const DIA_MS = 86_400_000

/** Colunas `timestamp` do schema público vêm sem offset e são UTC (ver CLAUDE.md). */
function parseDbDate(s) {
  if (!s) return null
  return new Date(/[Z+]|-\d{2}:\d{2}$/.test(s) ? s : `${s}Z`)
}

// en-CA formata YYYY-MM-DD — mesma chave de bucket do lib/datas.ts. Bucketar em
// UTC migraria de dia toda resposta feita depois das 21h de Brasília.
const YMD = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})
const ymdBrasil = (d) => YMD.format(d)
const diasEntre = (a, b) => Math.round((new Date(`${b}T12:00:00Z`) - new Date(`${a}T12:00:00Z`)) / DIA_MS)

async function todas(tabela, cols) {
  const out = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(tabela).select(cols).range(from, from + 999)
    if (error) throw new Error(`${tabela}: ${error.message}`)
    out.push(...data)
    if (data.length < 1000) break
  }
  return out
}

async function todosOsUsuariosDoAuth() {
  const out = []
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw new Error(`auth.listUsers: ${error.message}`)
    out.push(...data.users)
    if (data.users.length < 200) break
  }
  return out
}

const pct = (n, d) => (d === 0 ? " n/a" : `${String(Math.round((n * 100) / d)).padStart(3)}%`)
const linha = (rotulo, valor, extra = "") =>
  console.log(`  ${rotulo.padEnd(30)}${String(valor).padStart(4)}  ${extra}`)

// ── Coleta ────────────────────────────────────────────────────────────────
const authUsers = await todosOsUsuariosDoAuth()
const publicUsers = await todas("users", "id, role")
const attempts = await todas("question_attempts", "user_id, created_at")
const simulados = await todas("simulado_attempts", "user_id, created_at")
const sessoes = await todas("diagnostic_sessions", "user_id, status")

const roles = new Map(publicUsers.map((u) => [u.id, u.role]))
const contas = authUsers.filter((u) => roles.get(u.id) !== "admin")
const admins = authUsers.length - contas.length
const idsValidos = new Set(authUsers.map((u) => u.id))

// Dias distintos com QUALQUER atividade (treino, questões, diagnóstico, simulado).
const diasAtivos = new Map()
const registrar = (userId, createdAt) => {
  if (!userId) return
  const d = parseDbDate(createdAt)
  if (!d) return
  if (!diasAtivos.has(userId)) diasAtivos.set(userId, new Set())
  diasAtivos.get(userId).add(ymdBrasil(d))
}
for (const a of attempts) registrar(a.user_id, a.created_at)
for (const s of simulados) registrar(s.user_id, s.created_at)

const orfaos = new Set(
  [...attempts, ...simulados].map((r) => r.user_id).filter((id) => id && !idsValidos.has(id)),
)

const concluiuModulo = new Set(
  sessoes.filter((s) => s.status === "concluida").map((s) => s.user_id),
)

const hoje = ymdBrasil(new Date())
const perfis = contas.map((u) => {
  const cad = ymdBrasil(parseDbDate(u.created_at))
  const dias = [...(diasAtivos.get(u.id) ?? [])].sort()
  return {
    id: u.id,
    cadastro: cad,
    idadeDias: diasEntre(cad, hoje),
    logou: Boolean(u.last_sign_in_at),
    onboarding: Boolean(u.user_metadata?.onboarding_completed),
    dias,
    ultimoDia: dias[dias.length - 1] ?? null,
  }
})

// ── Relatório ─────────────────────────────────────────────────────────────
console.log(`\n=== RETENÇÃO — retrato de ${hoje} ===`)
console.log(`base: ${contas.length} contas (${admins} admin${admins === 1 ? "" : "s"} excluído${admins === 1 ? "" : "s"}; ${authUsers.length} no total)`)
console.log("atividade = qualquer resposta de treino, questão, diagnóstico ou simulado")
if (orfaos.size > 0) {
  console.log(`ATENÇÃO: ${orfaos.size} user_id com respostas no banco não existe(m) em auth.users (linhas órfãs, ignoradas)`)
}

console.log("\n--- FUNIL (base inteira, desde o primeiro cadastro) ---")
const ativados = perfis.filter((p) => p.dias.length > 0)
const voltaram = perfis.filter((p) => p.dias.length >= 2)
const etapas = [
  ["cadastrou", perfis.length],
  ["logou ao menos 1x", perfis.filter((p) => p.logou).length],
  ["concluiu onboarding", perfis.filter((p) => p.onboarding).length],
  ["respondeu >=1 questão", ativados.length],
  ["concluiu módulo do diag.", perfis.filter((p) => concluiuModulo.has(p.id)).length],
  ["voltou num 2º dia", voltaram.length],
]
let anterior = perfis.length
for (const [rotulo, n] of etapas) {
  const perda = anterior - n
  linha(rotulo, n, `${pct(n, perfis.length)} do topo   ${perda > 0 ? `(-${perda})` : ""}`)
  anterior = n
}

console.log("\n--- DIAS DISTINTOS DE USO POR PESSOA ---")
const faixas = [
  ["0 dias (nunca usou)", (n) => n === 0],
  ["1 dia (nunca voltou)", (n) => n === 1],
  ["2 dias", (n) => n === 2],
  ["3-4 dias", (n) => n >= 3 && n <= 4],
  ["5-7 dias", (n) => n >= 5 && n <= 7],
  ["8+ dias", (n) => n >= 8],
]
for (const [rotulo, teste] of faixas) {
  const n = perfis.filter((p) => teste(p.dias.length)).length
  if (n > 0) linha(rotulo, n, pct(n, perfis.length))
}

console.log("\n--- VOLTOU NUM 2º DIA DENTRO DE N DIAS DO CADASTRO ---")
console.log("    (coorte: só quem já viveu a janela inteira — nunca antes/depois)")
for (const janela of [1, 7, 30]) {
  const elegiveis = ativados.filter((p) => p.idadeDias >= janela)
  const voltou = elegiveis.filter((p) =>
    p.dias.some((d) => {
      const delta = diasEntre(p.cadastro, d)
      return delta >= 1 && delta <= janela
    }),
  )
  linha(`dentro de ${String(janela).padStart(2)} dia(s)`, voltou.length, `de ${String(elegiveis.length).padStart(3)} elegíveis   ${pct(voltou.length, elegiveis.length)}`)
}

console.log("\n--- ESTÁ VIVO HOJE? ---")
for (const janela of [1, 7, 14, 30]) {
  const n = perfis.filter((p) => p.ultimoDia && diasEntre(p.ultimoDia, hoje) < janela).length
  linha(`ativo nos últimos ${String(janela).padStart(2)} dias`, n, pct(n, perfis.length))
}
const todosOsDias = perfis.flatMap((p) => p.dias).sort()
const ultima = todosOsDias[todosOsDias.length - 1]
console.log(`\n  última atividade de qualquer usuário: ${ultima ?? "nunca"}${ultima ? ` (há ${diasEntre(ultima, hoje)} dias)` : ""}`)
const sumidos = ativados.filter((p) => diasEntre(p.ultimoDia, hoje) >= 14)
linha("usaram e sumiram há 14+ dias", sumidos.length, `de ${ativados.length} que chegaram a usar`)

console.log("")
