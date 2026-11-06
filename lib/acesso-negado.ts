// A página do 403 do `/admin`, servida pelo próprio `proxy.ts`.
//
// HTML pronto, e não uma rota do app, de propósito: o status de um rewrite do
// proxy não é garantido em todo lugar onde o Next roda, e a página renderizada
// pode sair com 200. Uma resposta inteira montada aqui sai 403 no `next dev` e
// na Vercel do mesmo jeito. Sem JavaScript e sem nada externo: cores do tema
// (`app/globals.css`) escritas à mão, claro e escuro pela preferência do
// sistema.
//
// Módulo puro, sem import nenhum: o proxy só carrega o que é leve.
export const PAGINA_ACESSO_NEGADO = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Acesso negado | AprovaOAB</title>
<style>
  :root { color-scheme: light dark; --fundo: #FFFFFF; --texto: #111827; --suave: #64748B; --borda: #E5E7EB; --verde: #10B981; --sobre-verde: #FFFFFF; }
  @media (prefers-color-scheme: dark) {
    :root { --fundo: #0F172A; --texto: #E5E7EB; --suave: #9CA3AF; --borda: #1F2937; --sobre-verde: #0F172A; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; background: var(--fundo); color: var(--texto); font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  main { max-width: 420px; text-align: center; }
  .codigo { margin: 0 0 12px; color: var(--suave); font-size: 14px; }
  h1 { margin: 0 0 8px; font-size: 24px; line-height: 1.3; }
  p { margin: 0 0 24px; color: var(--suave); }
  a { display: inline-block; padding: 10px 20px; border-radius: 8px; background: var(--verde); color: var(--sobre-verde); font-weight: 600; text-decoration: none; }
  a:focus-visible { outline: 2px solid var(--texto); outline-offset: 3px; }
</style>
</head>
<body>
<main>
  <p class="codigo">Erro 403</p>
  <h1>Você não tem permissão para acessar esta página</h1>
  <p>Esta área é só da equipe do AprovaOAB.</p>
  <a href="/dashboard">Voltar para o meu painel</a>
</main>
</body>
</html>
`
