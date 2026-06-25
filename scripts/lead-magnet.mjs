// One-off (reutilizável): escolhe a matéria e puxa 10 questões reais do banco
// pra montar um lead magnet.
//   node scripts/lead-magnet.mjs                 -> auto: matéria com menor acerto
//   node scripts/lead-magnet.mjs "Constitucional" -> matéria específica (match por nome)
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
const db = createClient(url, key)

const MIN_SAMPLE = 30 // amostra mínima pra confiar na taxa de acerto de uma matéria

const { data: subjects, error: subjErr } = await db.from("subjects").select("id, name").order("name")
if (subjErr) { console.error("subjects:", subjErr.message); process.exit(1) }
const nameById = new Map(subjects.map((s) => [s.id, s.name]))

const { data: perf, error: perfErr } = await db
  .from("desempenho_materia")
  .select("subject_id, acertos, total")
if (perfErr) { console.error("desempenho_materia:", perfErr.message) }

const agg = new Map()
for (const r of perf ?? []) {
  const a = agg.get(r.subject_id) ?? { acertos: 0, total: 0 }
  a.acertos += Number(r.acertos) || 0
  a.total += Number(r.total) || 0
  agg.set(r.subject_id, a)
}

const ranked = [...agg.entries()]
  .map(([id, v]) => ({
    id,
    name: nameById.get(id) ?? "(desconhecida)",
    acertos: v.acertos,
    total: v.total,
    taxa: v.total ? v.acertos / v.total : null,
  }))
  .filter((r) => r.total > 0)
  .sort((a, b) => (a.taxa ?? 1) - (b.taxa ?? 1))

console.log("\n=== Ranking de menor taxa de acerto (matérias com dados) ===")
for (const r of ranked) {
  console.log(`${(r.taxa * 100).toFixed(1)}%  (${r.acertos}/${r.total})  ${r.name}`)
}

const arg = process.argv[2]?.trim()
let chosen = null
let criterio = null

if (arg) {
  // matéria específica pedida na linha de comando (match por nome, case-insensitive)
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  const subj = subjects.find((s) => norm(s.name).includes(norm(arg)))
  if (!subj) {
    console.error(`Não achei matéria com "${arg}". Disponíveis:`, subjects.map((s) => s.name).join(", "))
    process.exit(1)
  }
  const stat = ranked.find((r) => r.id === subj.id)
  chosen = { id: subj.id, name: subj.name }
  criterio = stat
    ? `escolha editorial (${subj.name}) — taxa real de acerto ${(stat.taxa * 100).toFixed(1)}% (${stat.acertos}/${stat.total})`
    : `escolha editorial (${subj.name}) — sem dados de acerto ainda`
} else {
  const eligible = ranked.filter((r) => r.total >= MIN_SAMPLE)
  chosen = eligible[0] ?? null
  criterio = chosen
    ? `dado real: menor taxa de acerto com amostra >= ${MIN_SAMPLE} (${chosen.acertos}/${chosen.total} = ${(chosen.taxa * 100).toFixed(1)}%)`
    : null
  if (!chosen) {
    const etica = subjects.find((s) => /tica/i.test(s.name))
    chosen = { id: etica?.id, name: etica?.name ?? "Ética" }
    criterio = "fallback editorial (amostra insuficiente): Ética — mais frequente na 1ª fase e onde mais se reprova"
  }
}

console.log("\n=== MATÉRIA ESCOLHIDA ===")
console.log("Nome:", chosen.name)
console.log("Critério:", criterio)
if (!chosen.id) { console.error("Sem id da matéria."); process.exit(1) }

const { data: qs, error: qErr } = await db
  .from("questions")
  .select("id, enunciado, alternativa_a, alternativa_b, alternativa_c, alternativa_d, resposta_correta, banca, ano, dificuldade, explicacao")
  .eq("subject_id", chosen.id)
  .limit(300)
if (qErr) { console.error("questions:", qErr.message); process.exit(1) }

const ordem = { dificil: 0, "difícil": 0, medio: 1, "médio": 1, facil: 2, "fácil": 2 }
const sorted = (qs ?? []).slice().sort((a, b) => {
  const da = ordem[(a.dificuldade ?? "").toLowerCase()] ?? 1
  const db_ = ordem[(b.dificuldade ?? "").toLowerCase()] ?? 1
  return da - db_
})
const pick = sorted.slice(0, 10)

console.log(`\n=== ${pick.length} QUESTÕES SELECIONADAS (de ${qs?.length ?? 0} na matéria) ===`)
console.log(JSON.stringify({ materia: chosen.name, criterio, questoes: pick }, null, 2))
