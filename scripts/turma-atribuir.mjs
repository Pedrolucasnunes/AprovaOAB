// Atribuição manual de turma por e-mail — a rede de segurança do piloto.
//
//   node scripts/turma-atribuir.mjs unp ana@x.com bruno@y.com
//   node scripts/turma-atribuir.mjs unp --arquivo lista.txt     (um e-mail por linha)
//   node scripts/turma-atribuir.mjs unp --arquivo lista.txt --dry
//   node scripts/turma-atribuir.mjs unp ana@x.com --forcar      (move de turma)
//
// Por que existe: a marcação normal depende de um cookie sobreviver do clique
// no link até a criação da conta. Isso cobre a grande maioria, mas não cobre
// quem clicou no celular e cadastrou no notebook, quem usa aba anônima, quem
// já tinha conta antes do piloto, e o caso em que a coordenação divulga o
// endereço do site sem o link marcado. Sem este script, qualquer um desses
// casos vira aluno perdido do relatório e não há como recuperar depois.
//
// Lê .env.local manualmente (script fora do runtime do Next), como
// scripts/ativacao.mjs — assim a service role key nunca aparece no output.
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

// Saída por `process.exitCode` e não `process.exit()`: no Windows, encerrar à
// força com socket do Supabase aberto imprime um "Assertion failed ... uv" do
// libuv DEPOIS da mensagem de erro. O script funciona, mas parece ter quebrado
// — e quem roda isso antes de uma reunião não deveria ter que saber disso.
async function main() {
  // -------------------------------------------------------------- argumentos
  const argv = process.argv.slice(2)
  const dry = argv.includes("--dry")
  const forcar = argv.includes("--forcar")
  const iArquivo = argv.indexOf("--arquivo")
  const arquivo = iArquivo >= 0 ? argv[iArquivo + 1] : null

  const posicionais = argv.filter((a, i) => {
    if (a.startsWith("--")) return false
    if (iArquivo >= 0 && i === iArquivo + 1) return false
    return true
  })
  const slug = posicionais[0]

  if (!slug) {
    console.error("Uso: node scripts/turma-atribuir.mjs <slug> <e-mails...> [--arquivo lista.txt] [--dry] [--forcar]")
    return 1
  }

  let emails = posicionais.slice(1)
  if (arquivo) {
    try {
      emails = emails.concat(
        readFileSync(resolve(process.cwd(), arquivo), "utf8")
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith("#")),
      )
    } catch (e) {
      console.error(`Não consegui ler ${arquivo}:`, e.message)
      return 1
    }
  }

  // Normaliza e remove duplicata mantendo a ordem de entrada.
  emails = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))]

  if (emails.length === 0) {
    console.error("Nenhum e-mail informado.")
    return 1
  }

  // -------------------------------------------------------------- a turma
  // Slug inexistente falha AQUI, alto e claro. É a proteção contra o erro mais
  // provável do piloto: um typo no slug que só apareceria como relatório vazio
  // uma semana depois, quando não dá mais pra corrigir.
  const { data: turma, error: erroTurma } = await db
    .from("turmas")
    .select("id, slug, instituicao, rotulo, aberta_ate")
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

  console.log(`Turma: ${turma.instituicao} — ${turma.rotulo} (${turma.slug})`)
  console.log(`${emails.length} e-mail(s)${dry ? "  [SIMULAÇÃO — nada será gravado]" : ""}\n`)

  // -------------------------------------------------------------- os alunos
  // A base é pequena (dezenas de linhas), então casar em memória sai mais
  // barato que um `.in()` por lote — e permite comparar sem depender de o banco
  // ter gravado o e-mail em minúsculas.
  const { data: todosUsuarios, error: erroUsuarios } = await db
    .from("users")
    .select("id, email, turma_id")
  if (erroUsuarios) {
    console.error("Erro consultando users:", erroUsuarios.message)
    return 1
  }

  const porEmail = new Map()
  for (const u of todosUsuarios) {
    if (u.email) porEmail.set(u.email.trim().toLowerCase(), u)
  }

  const { data: outrasTurmas } = await db.from("turmas").select("id, slug")
  const slugDaTurma = new Map((outrasTurmas ?? []).map((t) => [t.id, t.slug]))

  const resultado = { marcados: [], jaNaTurma: [], emOutra: [], naoEncontrados: [], erros: [] }

  for (const email of emails) {
    const u = porEmail.get(email)

    if (!u) {
      resultado.naoEncontrados.push(email)
      continue
    }
    if (u.turma_id === turma.id) {
      resultado.jaNaTurma.push(email)
      continue
    }
    if (u.turma_id && !forcar) {
      resultado.emOutra.push(`${email} (${slugDaTurma.get(u.turma_id) ?? u.turma_id})`)
      continue
    }

    if (dry) {
      resultado.marcados.push(email)
      continue
    }

    const { error } = await db.from("users").update({ turma_id: turma.id }).eq("id", u.id)
    if (error) resultado.erros.push(`${email}: ${error.message}`)
    else resultado.marcados.push(email)
  }

  // -------------------------------------------------------------- resumo
  const bloco = (titulo, lista) => {
    if (lista.length === 0) return
    console.log(`${titulo} (${lista.length}):`)
    for (const l of lista) console.log(`  ${l}`)
    console.log()
  }

  bloco(dry ? "SERIAM marcados" : "Marcados", resultado.marcados)
  bloco("Já estavam nesta turma", resultado.jaNaTurma)
  bloco(
    forcar ? "Movidos de outra turma" : "Já estão em OUTRA turma — pulados (use --forcar pra mover)",
    resultado.emOutra,
  )
  bloco("Sem conta no AprovaOAB — precisam se cadastrar antes", resultado.naoEncontrados)
  bloco("ERROS", resultado.erros)

  const { count } = await db
    .from("users")
    .select("id", { count: "exact", head: true })
    .eq("turma_id", turma.id)
  console.log(`Total na turma "${turma.slug}" agora: ${count}`)

  return resultado.erros.length > 0 ? 1 : 0
}

try {
  process.exitCode = await main()
} catch (e) {
  console.error("Falhou:", e.message)
  process.exitCode = 1
}
