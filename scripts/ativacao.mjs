// Métricas de ativação — baseline da Fase 0 (destravar o onboarding).
//
//   node scripts/ativacao.mjs        -> janela de 7 dias
//   node scripts/ativacao.mjs 3      -> janela de 3 dias
//
// Por que existe: os números que motivaram a Fase 0 saíram de queries ad-hoc.
// Recalcular de improviso daqui a alguns dias não prova nada — a definição de
// cada métrica precisa estar congelada em código pra comparação valer.
//
// Duas armadilhas que este script evita de propósito:
//
// 1. COORTE, NÃO ANTES/DEPOIS. Quem se cadastrou em maio teve meses pra iniciar
//    o diagnóstico; quem se cadastrou ontem teve um dia. Comparar "total que já
//    iniciou" entre os dois grupos mede tempo de exposição, não a mudança. Aqui
//    a métrica é sempre "iniciou dentro de N dias do cadastro", e só entram
//    usuários que já viveram a janela inteira.
//
// 2. `onboarding_data = null` DEIXOU DE SIGNIFICAR "TRAVADO". Depois da Fase 0
//    todo mundo grava parcial, então esse campo para de identificar o problema
//    antigo. Por isso os 33 travados ficam congelados em coorte-destravados.json
//    em vez de serem recalculados a cada execução.
//
// Lê .env.local manualmente (script fora do runtime do Next).
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

const coorte = JSON.parse(readFileSync(resolve(process.cwd(), "scripts/coorte-destravados.json"), "utf8"))
const CUTOFF = new Date(coorte.cutoff_deploy)
const JANELA_DIAS = Number(process.argv[2] ?? 7)

// Respostas abaixo disso são clique, não resposta: acertam 15% contra os 25%
// do chute puro. Mesmo limiar que a Fase A vai levar pro app_config.
const MIN_TEMPO_MS = 3000
const DIA_MS = 86_400_000

/** Colunas `timestamp` do schema público vêm sem offset e são UTC (ver CLAUDE.md). */
function parseDbDate(s) {
  if (!s) return null
  return new Date(/[Z+]|-\d{2}:\d{2}$/.test(s) ? s : `${s}Z`)
}

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

const pct = (n, d) => (d === 0 ? "  n/a" : `${String(Math.round((n * 100) / d)).padStart(3)}%`)

const users = await todas("users", "id, created_at, role, onboarding_data")
const attempts = await todas("question_attempts", "user_id, created_at, is_diagnostic, time_spent_ms")

const porUser = new Map()
for (const u of users) {
  if (u.role === "admin") continue
  porUser.set(u.id, {
    criadoEm: parseDbDate(u.created_at),
    onboarding: u.onboarding_data,
    diag: [],
    treino: [],
  })
}
for (const a of attempts) {
  const u = porUser.get(a.user_id)
  if (!u) continue
  const reg = { em: parseDbDate(a.created_at), ms: a.time_spent_ms }
  ;(a.is_diagnostic ? u.diag : u.treino).push(reg)
}

const agora = new Date()
const valida = (r) => !(r.ms > 0 && r.ms < MIN_TEMPO_MS)
const dentroDaJanela = (u, r) => r.em - u.criadoEm <= JANELA_DIAS * DIA_MS
const maduro = (u) => agora - u.criadoEm >= JANELA_DIAS * DIA_MS

console.log(`\n=== ATIVAÇÃO — janela de ${JANELA_DIAS} dias a partir do cadastro ===`)
console.log(`cutoff do deploy da Fase 0: ${CUTOFF.toISOString()}`)
console.log(`descarta respostas < ${MIN_TEMPO_MS}ms (clique, não resposta)\n`)

// ── 1. Coorte: cadastrados antes vs. depois do deploy ──────────────────────
const coortes = [
  ["ANTES do deploy", (u) => u.criadoEm < CUTOFF],
  ["DEPOIS do deploy", (u) => u.criadoEm >= CUTOFF],
]

console.log("COORTE POR DATA DE CADASTRO")
console.log("  (só usuários que já viveram a janela inteira — os outros ainda não deu tempo)")
console.log("")
console.log("  coorte              maduros   iniciou diag   concluiu(5+)   fez treino")
for (const [label, filtro] of coortes) {
  const grupo = [...porUser.values()].filter((u) => filtro(u) && maduro(u))
  const n = grupo.length
  const iniciou = grupo.filter((u) => u.diag.some((r) => dentroDaJanela(u, r) && valida(r))).length
  const concluiu = grupo.filter(
    (u) => u.diag.filter((r) => dentroDaJanela(u, r) && valida(r)).length >= 5,
  ).length
  const treinou = grupo.filter((u) => u.treino.some((r) => dentroDaJanela(u, r))).length
  console.log(
    `  ${label.padEnd(20)}${String(n).padStart(5)}   ` +
      `${pct(iniciou, n)} (${String(iniciou).padStart(2)})   ` +
      `${pct(concluiu, n)} (${String(concluiu).padStart(2)})   ` +
      `${pct(treinou, n)} (${String(treinou).padStart(2)})`,
  )
}

const imaturos = [...porUser.values()].filter((u) => u.criadoEm >= CUTOFF && !maduro(u)).length
if (imaturos > 0) {
  console.log(`\n  ${imaturos} cadastro(s) pós-deploy ainda dentro da janela — voltam a contar quando completarem ${JANELA_DIAS} dias.`)
}

// ── 2. Os 33 travados pelo gate: voltaram? ─────────────────────────────────
console.log("\n\nOS 33 DESTRAVADOS (coorte congelada no deploy)")
const destravados = coorte.user_ids.map((id) => porUser.get(id)).filter(Boolean)
const depoisDoCutoff = (r) => r.em >= CUTOFF
const voltouIniciou = destravados.filter((u) => u.diag.some((r) => depoisDoCutoff(r) && valida(r)))
const voltouConcluiu = destravados.filter(
  (u) => u.diag.filter((r) => depoisDoCutoff(r) && valida(r)).length >= 5,
)
const voltouQualquer = destravados.filter((u) =>
  [...u.diag, ...u.treino].some((r) => depoisDoCutoff(r)),
)
console.log(`  na coorte:                        ${destravados.length} de ${coorte.total}`)
console.log(`  tiveram QUALQUER atividade depois: ${voltouQualquer.length}`)
console.log(`  iniciaram o diagnóstico depois:    ${voltouIniciou.length}`)
console.log(`  concluíram o diagnóstico depois:   ${voltouConcluiu.length}`)
console.log("  (é isto que mede a destravada retroativa + o e-mail; sem campanha, espere ~0)")

// ── 3. Onboarding parcial: só passa a existir depois da Fase 0 ─────────────
console.log("\n\nESTADO DO ONBOARDING (todos os não-admin)")
const todosU = [...porUser.values()]
const campos = (u) => {
  const d = u.onboarding || {}
  return ["nivel", "dificuldades", "tempo_diario"].filter((k) =>
    Array.isArray(d[k]) ? d[k].length > 0 : Boolean(d[k]),
  ).length
}
for (let i = 0; i <= 3; i++) {
  const n = todosU.filter((u) => campos(u) === i).length
  const rotulo = i === 0 ? "nenhum campo (nunca salvou)" : i === 3 ? "completo" : `${i} de 3 campos (parcial)`
  console.log(`  ${rotulo.padEnd(30)}${String(n).padStart(4)}   ${pct(n, todosU.length)}`)
}
console.log(`  ${"TOTAL".padEnd(30)}${String(todosU.length).padStart(4)}`)
console.log("  Antes da Fase 0 o parcial era impossível: ou 3 de 3, ou nada.")

// ── 4. Qualidade do sinal ──────────────────────────────────────────────────
const diagTodas = todosU.flatMap((u) => u.diag).filter((r) => r.ms > 0)
const rapidas = diagTodas.filter((r) => r.ms < MIN_TEMPO_MS)
console.log("\n\nQUALIDADE DO SINAL DO DIAGNÓSTICO")
console.log(`  respostas com tempo medido:  ${diagTodas.length}`)
console.log(`  abaixo de ${MIN_TEMPO_MS}ms:            ${rapidas.length}   ${pct(rapidas.length, diagTodas.length)}`)
console.log("  Se isso subir, o mapa por matéria piora — e ele dirige 70% do treino.\n")
