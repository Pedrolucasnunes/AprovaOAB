# Technical SEO - 82/100 (peso 22%)

## O que funciona

- HTML totalmente pre-renderizado (X-Nextjs-Prerender: 1, X-Vercel-Cache: PRERENDER)
- TTFB de servidor em 60ms; tempo total 0,33s a 1,22s
- Redirecionamentos http/https/apex para https://www. corretos em 1-2 saltos
- 404 retorna status real
- robots.txt valido bloqueando /dashboard/, /admin/, /api/ e declarando o sitemap
- Headers de seguranca exemplares: HSTS preload 2 anos, CSP restritiva, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy
- Canonicals auto-referenciais em todas as paginas de conteudo

## Achados

### [Critical] /login e /cadastro indexaveis com metadata duplicada

Ambas servem meta robots 'index, follow' e compartilham titulo e descricao identicos (fallback generico 'AprovaOAB - Preparacao Inteligente para OAB'). Sao linkadas do menu e de todos os CTAs.

**Correcao:** Definir robots: { index: false, follow: true } no metadata das duas rotas e dar titulo proprio a cada uma.

### [High] 4 paginas sem tag canonical

/login, /cadastro, /termos-de-uso e /politica-de-privacidade nao tem <link rel=canonical>. Qualquer parametro UTM nessas URLs cria duplicata.

**Correcao:** Adicionar alternates.canonical no metadata das 4 rotas.

### [Medium] Sitemap com lastmod em apenas 2 de 253 URLs

O Google usa lastmod para priorizar re-rastreio; sem ele, changefreq weekly e ignorado.

**Correcao:** Popular lastmod a partir do updated_at de cada registro no Supabase.

### [Medium] Normalizacao inconsistente da home

Canonical e og:url usam https://www.aprovaoab.app.br (sem barra); o sitemap declara com barra.

**Correcao:** Padronizar com barra final nos tres lugares.

### [Low] Sem manifest.json / PWA

Nao existe manifest.json nem site.webmanifest. Para um app de estudo usado no celular, e perda de sinal de instalabilidade.

**Correcao:** Adicionar app/manifest.ts no App Router.
