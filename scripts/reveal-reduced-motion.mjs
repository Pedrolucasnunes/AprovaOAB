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

  // Rolagem lenta de propósito: passo grande demais corre mais rápido que a
  // transição de 0,65s e conta como "travado" o bloco que está animando.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y)
      await new Promise((r) => setTimeout(r, 400))
    }
    window.scrollTo(0, 0)
    await new Promise((r) => setTimeout(r, 2500))
  })

  const r = await page.evaluate(() => {
    const els = [...document.querySelectorAll('[style*="opacity"]')]
    const presos = els.filter((el) => parseFloat(getComputedStyle(el).opacity) < 0.99)
    return { total: els.length, presos: presos.length }
  })

  await browser.close()
  return r
}

const normal = await revelados(false)
const reduzido = await revelados(true)

console.log(`alvo: ${alvo}`)
console.log(`  normal          ${normal.total - normal.presos} de ${normal.total} revelados`)
console.log(`  reduced-motion  ${reduzido.total - reduzido.presos} de ${reduzido.total} revelados`)

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
