// Guarda de regressão do conjunto público de questões.
//
//   node scripts/conjunto-publico.mjs              -> build limpo + confere
//   node scripts/conjunto-publico.mjs --sem-build  -> confere o .next que já existe
//
// Sai 0 se toda URL do livro-caixa (`lib/seo/questoes-publicadas.ts`) continua
// sendo publicada, 1 se alguma saiu, 2 se não deu pra medir.
//
// POR QUE ELE EXISTE. Auditoria de HTML vê o que está no ar, e o que estava no
// ar estava certo. O defeito morava no FUTURO: `selectBest` recalculava o
// conjunto público a cada leitura, e o primeiro critério dele é "uma questão por
// tópico distinto" — então bastava uma importação com tópicos novos pra
// despublicar páginas em silêncio. Medido em 11/set/2026, com o 47º Exame: 25
// das 200 URLs sairiam, e cada uma viraria 404, não 301. Nenhuma verificação de
// página pegaria isso antes de acontecer. Esta pega.
//
// POR QUE ELE NÃO REPRODUZ O `selectBest`. Seria a forma óbvia: ler o banco,
// refazer a seleção, comparar. E seria um instrumento que mente exatamente
// quando importa — no dia em que alguém MUDAR o critério (é o que o conserto do
// `incidencia_prova` vai fazer), a cópia daqui continuaria com o critério
// antigo, aprovaria a rotação e ficaria verde. Então o guarda não tem cópia de
// nada: ele roda o build de verdade e lê o que o CÓDIGO produziu.
//
// POR QUE O BUILD LOCAL E NÃO O SITEMAP DE PRODUÇÃO. O sitemap servido tem
// `revalidate = 86400`: ele responde "o que está publicado agora", e a pergunta
// aqui é "o que vai ser publicado na próxima revalidação". Produção só acusaria
// o problema depois de o dano existir.
//
// POR QUE `rm -rf .next` SEMPRE. O cache incremental do Next restaura o
// prerender do sitemap em vez de recalculá-lo, com mtime novo e conteúdo velho —
// conferir data de modificação NÃO detecta. Em 11/set/2026 isso produziu um
// "zero rotação" falso; o que denunciou foi `/provas/47-exame-oab` aparecer na
// lista de páginas prerenderizadas e faltar no sitemap do mesmo build.
//
// POR QUE BASTA O SITEMAP, SEM PEDIR AS 200 PÁGINAS POR HTTP. A pertinência ao
// conjunto público sai de `getPublicQuestionsForSubject` nos DOIS caminhos: o
// sitemap (via `getAllPublicQuestions`) e a página (via `getPublicQuestionById`,
// que devolve `null` e cai em `notFound()` pra questão fora do conjunto). Estar
// no sitemap e responder 200 são a mesma afirmação. Trocar isto por 200
// requisições ainda dispararia o Attack Challenge da Vercel, que responde 403 em
// tudo e parece exatamente igual a "a página sumiu".
//
// O livro-caixa é lido por `import` do .ts (o Node 24 apaga os tipos sozinho) e
// não por regex: assim mudar a formatação do arquivo não faz o guarda conferir
// menos UUIDs do que existem, calado. O aviso MODULE_TYPELESS_PACKAGE_JSON que
// o Node imprime nesse import é esperado e inofensivo.

import { existsSync, readFileSync, rmSync } from "node:fs"
import { spawnSync } from "node:child_process"
import { connect } from "node:net"

const SITEMAP = ".next/server/app/sitemap.xml.body"
const LIVRO = "lib/seo/questoes-publicadas.ts"
const semBuild = process.argv.includes("--sem-build")

const morre = (msg) => {
  console.error(msg)
  process.exit(2)
}

// Roda o build e lê caminhos relativos, então exige a raiz do projeto.
if (!existsSync("package.json") || !existsSync(LIVRO)) {
  morre("Rode da raiz do projeto: `node scripts/conjunto-publico.mjs`.")
}

// O `npm run dev` vivo corrompe o .next de um build simultâneo (regra do CLAUDE.md).
const devVivo = await new Promise((resolve) => {
  const s = connect({ host: "127.0.0.1", port: 3000 })
  s.once("connect", () => (s.destroy(), resolve(true)))
  s.once("error", () => resolve(false))
  setTimeout(() => (s.destroy(), resolve(false)), 800)
})
if (devVivo && !semBuild) {
  morre("Tem algo escutando na porta 3000. Pare o `npm run dev` — build com dev vivo corrompe o .next.")
}

const { QUESTOES_PUBLICADAS: livro } = await import(`../${LIVRO}`)
if (!livro?.size) morre(`Nao consegui ler o livro-caixa em ${LIVRO}.`)

if (semBuild) {
  console.log("AVISO: --sem-build. O sitemap pode ter vindo do cache do .next, e aí este resultado nao vale nada.")
} else {
  console.log("limpando o .next e buildando (o cache incremental ja produziu um falso OK aqui)...")
  rmSync(".next", { recursive: true, force: true })
  // Comando numa string só, sem array de args: no Windows o executável é
  // `npm.cmd` e spawnar .cmd sem shell falha; com shell, passar args em array
  // dispara DEP0190. A forma sem os dois problemas é esta.
  //
  // A primeira versão deste script spawnava `npm.cmd` sem shell, falhava na hora
  // e relatava "o build falhou" — culpando o código medido por um defeito do
  // medidor. Daí o relato abaixo separar "o npm nem rodou" de "o build compilou
  // e recusou".
  const r = spawnSync("npm run build", { shell: true, encoding: "utf8" })
  if (r.status !== 0) {
    if (r.error) console.error(`falha ao executar o npm: ${r.error.message}`)
    const saida = `${r.stdout ?? ""}\n${r.stderr ?? ""}`.trim()
    console.error(saida ? saida.split("\n").slice(-25).join("\n") : "(o npm nao produziu saida nenhuma)")
    morre(`O build falhou (status ${r.status}). Sem build nao ha o que conferir.`)
  }
}

if (!existsSync(SITEMAP)) morre(`Nao achei ${SITEMAP}. O build gerou o sitemap?`)

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}"
const xml = readFileSync(SITEMAP, "utf8")
const publicadasAgora = new Set(
  [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)]
    .map((m) => m[1].match(new RegExp(`/questoes/[^/]+/.*-(${UUID})$`))?.[1])
    .filter(Boolean),
)
if (publicadasAgora.size === 0) {
  morre("O sitemap do build nao tem URL de questao nenhuma. Isso e falha de medicao, nao resultado.")
}

// Só pra mensagem de erro: o livro-caixa agrupa os UUIDs por matéria em
// comentários. A contagem de VERDADE vem do `import` acima, que é imune a
// formatação — esta varredura por linha não é, e por isso ela se declara
// incompleta em vez de passar por completa.
const materiaDe = new Map()
let atual = "?"
for (const linha of readFileSync(LIVRO, "utf8").split(/\r?\n/)) {
  const c = linha.match(/^\s*\/\/\s*([a-z0-9-]+)\s*$/)
  if (c) atual = c[1]
  const u = linha.match(new RegExp(`"(${UUID})"`))
  if (u) materiaDe.set(u[1], atual)
}
if (materiaDe.size !== livro.size) {
  console.log(
    `aviso cosmetico: mapeei a materia de ${materiaDe.size} dos ${livro.size} UUIDs ` +
      `(o formato do ${LIVRO} mudou?). A conferencia abaixo nao depende disso.`,
  )
}

const perdidas = [...livro].filter((id) => !publicadasAgora.has(id))
const novas = [...publicadasAgora].filter((id) => !livro.has(id))

console.log("")
console.log(`livro-caixa: ${livro.size} URLs | publicadas pelo build: ${publicadasAgora.size}`)

// Só é "URL nova" quando nada se perdeu. Havendo perda, essas entradas são a
// outra metade de uma ROTAÇÃO, e mandar acrescentá-las ao livro-caixa
// registraria o dano como se fosse publicação nova.
if (novas.length > 0 && perdidas.length === 0) {
  console.log("")
  console.log(`${novas.length} URL(s) NOVA(S) — acrescente ao livro-caixa DEPOIS do deploy:`)
  for (const id of novas) console.log(`  ${id}`)
} else if (novas.length > 0) {
  console.log("")
  console.log(
    `${novas.length} URL(s) entraram no lugar das que sairam. NAO acrescente ao livro-caixa: ` +
      `isto e rotacao, nao publicacao nova.`,
  )
}

if (perdidas.length > 0) {
  const porMateria = new Map()
  for (const id of perdidas) {
    const m = materiaDe.get(id) ?? "?"
    porMateria.set(m, (porMateria.get(m) ?? 0) + 1)
  }
  console.error("")
  console.error(`FALHOU: ${perdidas.length} URL(s) JA PUBLICADA(S) saiu do conjunto publico.`)
  console.error("Elas respondem 404, nao 301 — e o Google ja as conhece.")
  for (const [m, n] of [...porMateria].sort((a, b) => b[1] - a[1])) console.error(`  ${m}: ${n}`)
  console.error("")
  for (const id of perdidas) console.error(`  ${id}  (${materiaDe.get(id) ?? "?"})`)
  console.error("")
  console.error("O conjunto publicado e APPEND-ONLY. Ver a regra no CLAUDE.md e o porque em " + LIVRO + ".")
  process.exit(1)
}

console.log("")
console.log("OK: nenhuma URL publicada saiu do conjunto.")
