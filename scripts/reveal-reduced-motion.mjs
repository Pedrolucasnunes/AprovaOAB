// Guarda de regressão do <Reveal> sob prefers-reduced-motion.
//
//   node scripts/reveal-reduced-motion.mjs                      -> produção
//   node scripts/reveal-reduced-motion.mjs http://localhost:3000 -> build local
//
// Sai 0 se o modo reduzido revela o MESMO tanto que o modo normal, 1 se revela
// menos. Não existe número absoluto certo: o que importa é a paridade.
//
// POR QUE UM SCRIPT E NÃO UM `curl | grep`. A tentação é contar o estado
// inicial no HTML servido. Não funciona, de três formas, todas medidas:
//
//  1. O SSR emite `opacity:0;transform:translateY(26px)` nos 24 blocos em
//     QUALQUER modo — o servidor não lê media query. Contar o HTML dá 24 na
//     página sã e 24 na quebrada.
//  2. `chrome --dump-dom` captura antes de o IntersectionObserver rodar, então
//     repete o problema acima.
//  3. `--virtual-time-budget` parece resolver, e é a pior das três: o tempo
//     virtual avança independente da rede, então o mesmo build responde ora 24
//     ora 6. Passou a ser recomendado neste repositório por umas horas em
//     set/2026, depois de acertar duas vezes seguidas por sorte.
//
// O que discrimina é o estilo COMPUTADO, lido depois de rolar a página inteira
// e esperar as animações terminarem. É o que este arquivo faz.
//
// Requer o playwright-core, que NÃO é dependência do projeto (só o browser já
// está na máquina via ms-playwright). Se faltar, o script diz como instalar.

const alvo = process.argv[2] ?? "https://www.aprovaoab.app.br"

let chromium
try {
  ;({ chromium } = await import("playwright-core"))
} catch {
  console.error("playwright-core nao encontrado. Instale sem gravar no package.json:")
  console.error("  npm i --no-save playwright-core")
  console.error("O browser em si ja esta em %LOCALAPPDATA%/ms-playwright.")
  process.exit(2)
}

const EXEC = process.env.CHROME_BIN
if (!EXEC) {
  console.error("Defina CHROME_BIN apontando pro chrome.exe do ms-playwright, ex.:")
  console.error('  export CHROME_BIN="$LOCALAPPDATA/ms-playwright/chromium-1234/chrome-win64/chrome.exe"')
  process.exit(2)
}

async function revelados(reduce) {
  const browser = await chromium.launch({ executablePath: EXEC })
  const ctx = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    reducedMotion: reduce ? "reduce" : "no-preference",
  })
  const page = await ctx.newPage()
  await page.goto(alvo, { waitUntil: "load", timeout: 60_000 })

  // Percorre a página e guarda o PIOR momento: quantos blocos ficam
  // transparentes com o CENTRO deles já dentro da tela. É o que o usuário veria
  // como buraco — e funciona tanto pra animação por tempo quanto pra timeline de
  // rolagem, onde "está revelado" depende de onde a página parou.
  //
  // Passo pequeno de propósito: passo grande corre na frente da transição de
  // 0,65s e conta como travado o bloco que está animando. Altura zero é ignorada
  // — são wrappers de conteúdo que não renderiza naquela largura, invisíveis de
  // qualquer jeito.
  const alt = await page.evaluate(() => document.body.scrollHeight)
  // `presos` guarda o pior momento; `total` guarda o MAIOR número de blocos já
  // vistos na tela de uma vez. Separados porque, quando nada nunca fica preso,
  // um único objeto "pior" ficaria no valor inicial e o relatório sairia
  // "0 de 0" — medição vazia com cara de aprovação.
  let pior = { presos: 0, total: 0 }
  let maiorTotal = 0
  for (let y = 0; y < alt; y += 200) {
    await page.evaluate((v) => window.scrollTo(0, v), y)
    await page.waitForTimeout(120)
    const r = await page.evaluate(() => {
      let presos = 0, total = 0
      for (const el of document.querySelectorAll('.reveal, [style*="opacity"]')) {
        const b = el.getBoundingClientRect()
        const centro = b.top + b.height / 2
        if (b.height === 0 || centro < 0 || centro > window.innerHeight) continue
        total++
        if (parseFloat(getComputedStyle(el).opacity) < 0.5) presos++
      }
      return { presos, total }
    })
    if (r.total > maiorTotal) maiorTotal = r.total
    if (r.presos > pior.presos) pior = r
  }

  await browser.close()
  return { presos: pior.presos, total: maiorTotal }
}

const normal = await revelados(false)
const reduzido = await revelados(true)

console.log(`alvo: ${alvo}`)
console.log(`  normal          pior momento: ${normal.presos} de ${normal.total} blocos na tela invisíveis`)
console.log(`  reduced-motion  pior momento: ${reduzido.presos} de ${reduzido.total} blocos na tela invisíveis`)

if (reduzido.presos > normal.presos) {
  console.error("")
  console.error(
    `FALHOU: movimento reduzido esconde ${reduzido.presos - normal.presos} bloco(s) ` +
      `a mais que o modo normal. Ver a regra do Reveal no CLAUDE.md.`
  )
  process.exit(1)
}
console.log("")
console.log("OK: paridade entre os dois modos.")
