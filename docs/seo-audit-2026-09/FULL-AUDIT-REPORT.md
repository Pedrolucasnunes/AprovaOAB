# Auditoria SEO Completa — aprovaoab.app.br

**Data:** 11/09/2026
**URL auditada:** https://www.aprovaoab.app.br/
**Escopo:** 253 URLs do sitemap + 12 páginas inspecionadas em profundidade + 3 execuções de Lighthouse
**Stack detectado:** Next.js (App Router) / Vercel / Supabase / Stripe — prerender estático (SSG)
**Tipo de negócio:** SaaS educacional (EdTech) — preparação para o Exame de Ordem, 1ª fase

---

## Resumo Executivo

### SEO Health Score: **68 / 100**

| Categoria | Peso | Nota | Contribuição |
|---|---|---|---|
| SEO Técnico | 22% | 82 | 18,0 |
| Qualidade de Conteúdo | 23% | 62 | 14,3 |
| SEO On-Page | 20% | 78 | 15,6 |
| Schema / Dados Estruturados | 10% | 85 | 8,5 |
| Performance (Core Web Vitals) | 10% | **35** | 3,5 |
| Prontidão para Busca com IA | 10% | 55 | 5,5 |
| Imagens | 5% | 60 | 3,0 |
| **TOTAL** | | | **68,4** |

O site tem uma **base técnica muito acima da média**: HTML pré-renderizado, canonicals, schema rico, headers de segurança exemplares, sitemap e robots.txt corretos. O que segura a nota são dois problemas de natureza diferente: **um LCP catastrófico no mobile** e a **subexposição do acervo de questões** (só ~9% dele é indexável).

### Top 5 problemas críticos

1. **LCP de 9,5s a 12,3s no mobile em todas as páginas** — 93–94% disso é *render delay* por saturação de main thread (hidratação de 15 client components + 301 KB de terceiros).
2. **Só 200 das ~2.240 questões têm página própria indexável** — ~91% do acervo invisível na busca.
3. **`/login` e `/cadastro` indexáveis** com título e descrição duplicados.
4. **4 páginas sem tag canonical** (`/login`, `/cadastro`, `/termos-de-uso`, `/politica-de-privacidade`).
5. **Zero sinais de E-E-A-T** num tema YMYL (jurídico) — sem página "sobre", autores ou credenciais.

### Top 5 ganhos rápidos

1. Tirar Clarity e GTM do caminho crítico → 1,2s de main thread de volta, sem tocar no produto.
2. Adicionar `noindex, follow` em `/login` e `/cadastro`.
3. Adicionar `FAQPage` schema na home (o FAQ já existe, falta só a marcação).
4. Gerar `opengraph-image` para a rota `/editais` (única rota do site sem OG image).
5. Reduzir os favicons de 726 KB — hoje são 1,45 MB só de ícones.

---

## 1. SEO Técnico — 82/100

### O que está correto

- **Renderização:** todas as páginas chegam pré-renderizadas (`X-Nextjs-Prerender: 1`, `X-Vercel-Cache: PRERENDER`). Conteúdo 100% visível para crawlers sem execução de JS.
- **TTFB:** 0,33s a 1,22s. Lighthouse: "Root document took 60ms". Excelente.
- **Redirecionamentos:** `http://`, `https://` e apex → `https://www.` corretamente, em 1–2 saltos.
- **404:** retorna status 404 real (testado em `/index.html` e em rota inexistente).
- **robots.txt:** válido, bloqueia `/dashboard/`, `/admin/`, `/api/`, declara o sitemap.
- **Headers de segurança:** HSTS com `preload` e 2 anos, CSP completa e restritiva, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`. Está melhor que a maioria dos sites comerciais brasileiros.
- **Canonicals:** presentes e auto-referenciais em todas as páginas de conteúdo.

### Problemas

| # | Severidade | Achado |
|---|---|---|
| T1 | **Crítico** | `/login` e `/cadastro` servem `<meta name="robots" content="index, follow">`. São páginas sem valor de busca, linkadas do menu e de todos os CTAs — vão ser rastreadas e indexadas. Título e descrição são o fallback genérico, idênticos entre as duas. |
| T2 | **Alto** | 4 páginas sem `<link rel="canonical">`: `/login`, `/cadastro`, `/termos-de-uso`, `/politica-de-privacidade`. Qualquer parâmetro de UTM nessas URLs cria duplicata. |
| T3 | **Médio** | Sitemap com `<lastmod>` em apenas 2 de 253 URLs. O Google usa `lastmod` para priorizar re-rastreio; sem ele, `changefreq: weekly` é ignorado. |
| T4 | ~~**Médio**~~ **Não era problema** | Canonical da home é `https://www.aprovaoab.app.br` (sem barra), o sitemap declara `https://www.aprovaoab.app.br/` (com barra), e `og:url` também vem sem barra. **Este achado estava errado:** pela RFC 3986, caminho vazio equivale a `/`, então para a raiz as duas formas são a mesma URL e o Google nunca as tratou como divergentes. Alinhado mesmo assim, pelo lado barato — o sitemap passou a declarar sem barra, como as outras 252 entradas. A recomendação original (padronizar *com* barra) era além de desnecessária, inexequível: o Next normaliza contra `trailingSlash: false` e só `trailingSlash: true` mudaria isso, ao custo de redirecionar o site inteiro. Ver a nota no ACTION-PLAN, item 1.3. |
| T5 | **Baixo** | Sem `/manifest.json` nem `site.webmanifest`. Para um app de estudo usado no celular, é perda de sinal de instalabilidade (PWA). |

---

## 2. Performance / Core Web Vitals — 35/100

Medido com **Lighthouse 12 local** (Chrome headless, mobile, throttling padrão 4x CPU / Slow 4G). A API do PageSpeed Insights estava com quota esgotada e não há dados de campo (CrUX) porque nenhuma credencial Google está configurada nesta máquina — **os números abaixo são de laboratório**.

| Página | Perf | FCP | **LCP** | TBT | CLS | TTI |
|---|---|---|---|---|---|---|
| `/` (home) | 63 | 1,8s | **12,3s** | 310ms | 0 | 12,3s |
| `/questoes/direito-civil` | 69 | 1,6s | **9,5s** | 190ms | 0 | 11,4s |
| `/provas/45-exame-oab` | 66 | 1,4s | **12,0s** | 300ms | 0 | 12,0s |

Outras notas na home: Acessibilidade **96**, Boas Práticas **79**, SEO **100**.

### P1 — CRÍTICO: o LCP é 94% *render delay*

Decomposição do LCP da home:

```
TTFB            694ms   ( 6%)   <- servidor está ótimo
Load Delay        0ms   ( 0%)
Load Time         0ms   ( 0%)
Render Delay  11.622ms  (94%)   <- o problema inteiro está aqui
```

O elemento LCP é um **parágrafo de texto** (`div.container-page > div.grid > div.lg:col-span-5 > p.mt-6`), não uma imagem. Texto puro, já presente no HTML servido, levando 12 segundos para pintar. Load delay e load time são zero — não há nada baixando. O tempo todo é espera.

### O que NÃO é a causa

A primeira hipótese óbvia — "o herói está escondido em `opacity:0` esperando a hidratação" — **está descartada pelo código.** `components/site/hero.tsx` já passa `initial={false}` na coluna editorial, com comentário explicando exatamente esse raciocínio:

> *"Above-the-fold: renderiza já visível (sem fade-in escalonado) pra não esconder o título/CTA até o JS hidratar."*

Confirmado na resposta HTTP: o parágrafo do LCP chega com `style="opacity:1;transform:none"`. Os 24 elementos em `opacity:0` no HTML são os wrappers `<Reveal>` (21 usos em 8 seções), que usam `whileInView` e estão abaixo da dobra — comportamento correto, não bug. **Essa parte já foi resolvida; não refaça.**

### A causa real: saturação da main thread

O que sobra é starvation de CPU. Trabalho medido na home:

```
Script Evaluation   1.508ms
Style & Layout      1.244ms
Other                 680ms
Rendering             196ms
```

Duas fontes alimentam isso:

1. **Hidratação massiva.** 15 dos 19 componentes em `components/site/` são `"use client"`, e a home monta 13 seções. Praticamente toda a landing arrasta `motion/react` para o caminho de hidratação inicial — incluindo `<Reveal>`, que é scroll-reveal puro e não precisa de runtime de animação.
2. **301 KB de terceiros** (GTM + Clarity + Bing) competindo pela mesma thread — ver P2.

Sob o throttling 4× de CPU do Lighthouse, o browser não completa o layout/paint final do maior bloco de texto até a thread drenar. Por isso FCP acontece em 1,4–1,8s (algo pinta cedo) e o LCP só é registrado lá na frente. Confirmado nas três páginas testadas: **é um padrão do layout, não um caso isolado.**

### Correção, em ordem de retorno

1. **Tirar os terceiros do caminho crítico** (P2). É o mais barato: Clarity sozinho custa 890ms de main thread.
2. **Tirar `motion/react` da hidratação inicial.** O maior ganho isolado é o `<Reveal>` — 21 usos, puro fade-in ao entrar na viewport, que CSS resolve sem JS:
   ```css
   @keyframes rise { from { opacity:0; transform:translateY(26px) } to { opacity:1; transform:none } }
   .reveal { animation: rise .65s cubic-bezier(.21,.61,.35,1) both; animation-timeline: view(); animation-range: entry 0% cover 30%; }
   @media (prefers-reduced-motion: reduce) { .reveal { animation:none; opacity:1; transform:none } }
   ```
   `animation-fill-mode: both` garante o estado final mesmo se algo falhar. Onde `animation-timeline` não for suportado, um `IntersectionObserver` de dez linhas que só adiciona uma classe custa uma fração do runtime do `motion`.
3. **Reavaliar quais das 15 seções precisam mesmo ser client components.** Várias provavelmente só são client por causa do `Reveal`.
4. **Re-medir a cada passo** — o objetivo é isolar quanto cada um devolve.

Meta: LCP na faixa verde (<2,5s) e Performance em 85–95.

### P2 — ALTO: 301 KB de tags de terceiros na thread principal

| Origem | Transferência | Main thread | Blocking |
|---|---|---|---|
| Google Tag Manager (GTM + gtag) | 301 KB | 291ms | 156ms |
| Microsoft Clarity | 29 KB | **890ms** | 61ms |
| Bing Ads | 0,8 KB | 0 | 0 |
| Google Analytics | 0,6 KB | 0 | 0 |

Estão carregados GTM (`GTM-TJMVZGH2`) **e** gtag direto (`G-9X6ZNVDJ10`) **e** Clarity **e** Bing UET. O GTM sozinho tem 141 KB de JS não utilizado (43–53% do bundle). O Clarity consome 890ms de main thread — mais que todo o JS da aplicação.

**Correção:** consolidar o GA4 dentro do GTM (remover o gtag duplicado), carregar o Clarity com `strategy="lazyOnload"` no `next/script`, e avaliar se o Bing UET tem ROI hoje.

### P3 — MÉDIO: sem `preconnect` para 7 origens de terceiros

Desperdício medido: `r.clarity.ms` 560ms, `www.clarity.ms` 413ms, `googletagmanager.com` 405ms, `google-analytics.com` 382ms, `c.clarity.ms` 371ms, `c.bing.com` 371ms, `scripts.clarity.ms` 371ms.

### P4 — MÉDIO: 6 arquivos de fonte, 148 KB, todos com `preload`

Quatro famílias em uso: Geist, Geist Mono, Fraunces, DM Mono. Todas com `<link rel="preload">`, competindo por banda no caminho crítico. O `font-display` está correto (audit passa), mas 148 KB de fontes pré-carregadas é muito para uma primeira renderização no 4G.

### P5 — MÉDIO: CSS bloqueante de 28,7 KB (300ms)

`/_next/static/chunks/3a1b62653397792f.css` bloqueia a renderização por 300ms.

### O que está ótimo em performance

- **CLS = 0 em todas as páginas.** Todas as imagens têm `width`/`height`. Isso é raro e valioso.
- Compressão Brotli ativa em todo JS/CSS.
- TTFB de servidor em 60ms.
- JS próprio da aplicação bem enxuto: 293 KB comprimidos em 15 chunks.

---

## 3. SEO On-Page — 78/100

### O que está correto

- Títulos e descrições **únicos e escritos para busca** em todas as páginas de conteúdo. Amostra aleatória de 14 páginas de questão: **14 títulos únicos**, descrições entre 139 e 155 caracteres.
- Um `<h1>` por página, com hierarquia H2/H3 limpa e semântica.
- Hub `/questoes` linka para as **20 matérias** — nenhuma órfã.
- Breadcrumbs visíveis e marcados.
- `lang="pt-BR"` no `<html>`, `og:locale` correto.
- OG e Twitter Cards completos (`summary_large_image`, 1200×630, com `og:image:alt`).

### Problemas

| # | Severidade | Achado |
|---|---|---|
| O1 | **Alto** | **13 de 14 títulos de página de questão passam de 60 caracteres** (2 passam de 70). O sufixo `\| AprovaOAB` consome ~12 caracteres num título já longo. Ex.: *"Responsabilidade civil do Estado — Questão do 36º Exame OAB 2022 \| AprovaOAB"* = 76 chars → truncado na SERP. |
| O2 | **Alto** | `/login` e `/cadastro` compartilham título **e** descrição idênticos (fallback genérico "AprovaOAB - Preparação Inteligente para OAB"). |
| O3 | **Médio** | `/termos-de-uso` e `/politica-de-privacidade` usam a descrição de fallback do site, sem relação com o conteúdo. |
| O4 | **Médio** | `/editais` e `/editais/48-exame-oab` **não têm `og:image`** — única rota do site sem imagem social gerada. Todo compartilhamento em WhatsApp/LinkedIn sai sem card. |
| O5 | **Médio** | Hub `/questoes` tem só 164 palavras e `/editais` 194 (contando header e footer). Para páginas de categoria que devem rankear em termos amplos, é raso. Compare com `/questoes/direito-civil`, que tem 555 palavras e um H2 de contexto — esse é o padrão certo. |
| O6 | **Médio** | URLs de questão carregam UUID completo: `/questoes/direito-civil/contratos-41-exame-oab-00110fb7-1098-4479-8aac-8670baf37188`. São 36 caracteres sem valor semântico. |
| O7 | **Baixo** | A home tem 1.715 palavras e boa estrutura, mas nenhum link interno para páginas de questão individuais — o link equity da home só desce até os hubs. |

---

## 4. Qualidade de Conteúdo / E-E-A-T — 62/100

### C1 — CRÍTICO: ~91% do acervo de questões não é indexável

| Métrica | Valor |
|---|---|
| Questões no site (28 provas × 80) | **~2.240** |
| Questões com página própria no sitemap | **200** |
| Questões expostas por matéria | **10** (20 matérias × 10) |
| Paginação nas páginas de matéria | **nenhuma** |
| Links para páginas de questão dentro de `/provas/45-exame-oab` | **10** (de 80 na página) |

As páginas de matéria expõem 10 questões e não têm paginação. As páginas de prova contêm o texto completo das 80 questões, mas linkam apenas 10 páginas individuais. O resultado é que **~2.040 questões existem no site mas nunca ganham URL indexável.**

Isso importa porque a busca de cauda longa em estudo para OAB é exatamente "trecho literal do enunciado" — o candidato copia a questão e cola no Google. Cada questão é uma keyword própria. Os concorrentes entendem isso: Simulai OAB anuncia 5.875 questões oficiais; Qconcursos e Gran Cursos indexam milhares. Com 200 páginas, o site disputa com ~4% do inventário de um concorrente médio.

**Além disso, há duplicação interna:** o enunciado da questão 45-XX aparece tanto em `/provas/45-exame-oab` (15.266 palavras, 665 KB de HTML) quanto na página individual dela.

### C2 — ALTO: nenhum sinal de E-E-A-T num tema YMYL

Conteúdo jurídico é YMYL ("Your Money or Your Life") — o Google aplica critérios de confiança mais duros. O site hoje não tem:

- Página "Sobre" / "Quem somos"
- Qualquer autor identificado, advogado responsável ou credencial (OAB/UF)
- Explicação de quem revisa os comentários das questões
- Endereço, CNPJ ou razão social visível
- `Person` ou `contactPoint` no schema

Há um link de WhatsApp e perfis sociais (X, Instagram, LinkedIn) no `sameAs` — é o começo, mas é pouco. Para competir com Estratégia e Gran Cursos, que têm professores nomeados com currículo, isso é uma desvantagem estrutural.

### C3 — ALTO: nenhum conteúdo editorial

`/blog`, `/sobre` e `/precos` retornam 404. A home promove uma newsletter ("Café com OAB: sua dose semanal de preparação") mas não há arquivo público dela, nem RSS (`/rss.xml` e `/feed.xml` = 404). Todo o conteúdo produzido para a newsletter está sendo desperdiçado do ponto de vista de busca.

Não existe nenhuma página para as buscas informacionais de maior volume do nicho: "como passar na OAB", "quanto tempo estudar para a OAB", "o que mais cai na 1ª fase", "como funciona o exame de ordem", "nota de corte OAB".

### O que está correto

- Copy da home é boa: específica, orientada a benefício, sem enrolação ("Estude só o que você precisa pra passar na OAB", "~70% nos seus pontos fracos").
- Páginas de matéria têm introdução contextual real (`/questoes/direito-civil`: *"Direito Civil é uma das matérias mais extensas e mais cobradas na 1ª fase da OAB, toda baseada no Código Civil de 2002..."*).
- **`/editais/48-exame-oab` é uma página excelente**: 794 palavras, cronograma, taxa, passo a passo da inscrição, FAQ, e schema `FAQPage` + `EducationEvent`. É o melhor template do site e deveria ser o modelo para tudo.
- Páginas de questão com ~407 palavras (~250 de conteúdo real) — adequado, não é thin content.
- Depoimentos reais na home, com aviso explícito de que são "as palavras de quem escreveu".

---

## 5. Schema / Dados Estruturados — 85/100

### Implementação atual

| Tipo | Onde | Status |
|---|---|---|
| `Organization` | todas as páginas | ✅ com `logo`, `sameAs` (X, Instagram, LinkedIn), `areaServed` |
| `WebSite` | todas as páginas | ✅ com `inLanguage: pt-BR` |
| `SoftwareApplication` | todas as páginas | ✅ `EducationalApplication`, ofertas Grátis (R$0) e Pro (R$19) |
| `CollectionPage` + `ItemList` | hubs e listagens | ✅ |
| `BreadcrumbList` | listagens e questões | ✅ bem formado, 3 níveis |
| `Quiz` | páginas de questão | ✅ `eduQuestionType: Multiple choice`, `acceptedAnswer` + 3 `suggestedAnswer` |
| `FAQPage` | `/editais/48-exame-oab` | ✅ |
| `EducationEvent` | `/editais/48-exame-oab` | ✅ |

Todos os blocos JSON-LD parseiam sem erro. A qualidade aqui está bem acima da média do mercado.

### Oportunidades

| # | Severidade | Achado |
|---|---|---|
| S1 | **Médio** | **A home tem 5 perguntas de FAQ visíveis mas nenhum `FAQPage` schema.** O componente já existe em `/editais/48-exame-oab` — é reaproveitamento direto. |
| S2 | **Médio** | `Quiz` não declara `name`, `learningResourceType: "Practice problem"` nem `educationalAlignment`. São propriedades recomendadas pelo Google para o rich result de *Practice Problems*. |
| S3 | **Médio** | Sem `Course` schema. Para EdTech, `Course` + `CourseInstance` habilita o carrossel de cursos na busca. |
| S4 | **Baixo** | `Organization` sem `contactPoint`, `foundingDate`, `email` ou `legalName`. Isso alimenta o Knowledge Panel. |
| S5 | **Baixo** | Ofertas do `SoftwareApplication` sem `url`, `availability` nem `priceValidUntil`. |
| S6 | **Resolvido** | `Review`/`AggregateRating` nos depoimentos: **decisão já tomada e documentada**, não é pendência. O `CLAUDE.md` do repo (seção "Depoimentos da landing") registra o raciocínio — não existe nota no produto, então `aggregateRating` seria número inventado, e review que o próprio site coleta sobre si é *self-serving*, que o Google não aceita para rich result. Risco de ação manual, ganho zero. **A análise está correta; mantenha como está.** |

---

## 6. Imagens — 60/100

### O que está correto

- **Zero imagens sem `alt`** em todas as 12 páginas inspecionadas.
- Todas com `width`/`height` → CLS = 0.
- Banner do Café com OAB em WebP (21 KB).
- OG images geradas dinamicamente pelo Next.js (124 KB, 1200×630) na maioria das rotas.

### Problemas

| # | Severidade | Achado |
|---|---|---|
| I1 | **Alto** | **`/icon.png` e `/apple-icon.png` têm 726 KB cada** (declarados como `sizes="1024x1024"`). São 1,45 MB baixados só para desenhar um favicon de 32px. Gere variantes 32/180/192/512 e sirva o tamanho certo. |
| I2 | **Médio** | `/aprovaoab-logo-primary.png` (usado no `logo` do schema Organization) tem **253 KB**. |
| I3 | **Médio** | A logo do header usa `/Sem fundo.png` — nome de arquivo com **espaço e em português**, servido como `/Sem%20fundo.png`. O Lighthouse ainda aponta "Properly size images" nele. |
| I4 | **Baixo** | Lighthouse: "Image elements have `[alt]` attributes that are redundant text" — a logo tem `alt="AprovaOAB"` ao lado do texto "AprovaOAB". O `alt` deve ser vazio (`alt=""`) quando a imagem é decorativa e o texto já está presente. |

---

## 7. Prontidão para Busca com IA (GEO) — 55/100

### O que está correto

- **HTML pré-renderizado** — GPTBot, ClaudeBot, PerplexityBot e Google-Extended leem o conteúdo sem executar JS. Esse é o pré-requisito número um e está atendido.
- `robots.txt` usa `User-Agent: *` com `Allow: /` — **nenhum crawler de IA está bloqueado**.
- Schema `Quiz` com pergunta e resposta explícitas é altamente citável.
- Estrutura de FAQ com pergunta como heading e resposta curta logo abaixo.
- `/editais/48-exame-oab` traz datas concretas e verificáveis ("1ª fase em 10/01/2027, 2ª fase em 28/02/2027") com atribuição à fonte oficial — exatamente o formato que motores de IA citam.

### Problemas

| # | Severidade | Achado |
|---|---|---|
| G1 | **Médio** | **Sem `/llms.txt`** (404). É o índice curado que aponta aos LLMs o que vale ler no site. Barato de fazer, e a estrutura do site é clara o suficiente para se beneficiar. |
| G2 | **Médio** | Ausência de dados próprios citáveis. Com o acervo de 2.240 questões e dados de desempenho dos usuários, dá para publicar estatísticas originais ("matérias com maior índice de erro na 1ª fase", "temas mais recorrentes por exame") — o tipo de conteúdo que vira citação em AI Overview. |
| G3 | **Médio** | Sem menções de marca fora do domínio. Busca por "AprovaOAB" não retorna o site; o espaço é ocupado por Passe na OAB, Qconcursos, Simulai OAB e Gran Cursos. *(Ressalva: a ferramenta de busca usada opera na região EUA, então isso é indicativo, não conclusivo — confirme no Search Console.)* |
| G4 | **Baixo** | Sem `/.well-known/security.txt`. |

---

## 8. Acessibilidade e Boas Práticas

Lighthouse mobile: **Acessibilidade 96**, **Boas Práticas 79**. A nota 96 é enganosa — ver A0, que o Lighthouse não tem como detectar.

### A0 — BUG EM PRODUÇÃO: landing invisível sob `prefers-reduced-motion`

Com movimento reduzido ligado, os 24 blocos `<Reveal>` ficam permanentemente em `opacity:0`. A página mostra o herói e mais nada — todo o conteúdo abaixo dele nunca aparece.

Medido em produção (Chrome headless, viewport 1400×6000, para forçar tudo a entrar na viewport):

| | ainda em `opacity:0` | revelados |
|---|---|---|
| normal | 6 de 24 | 18 |
| `--force-prefers-reduced-motion` | **24 de 24** | **0** |

**Causa** (`components/site/reveal.tsx`): o servidor não lê media query, então `useReducedMotion()` devolve falso no SSR e o HTML sai com `style="opacity:0;transform:translateY(26px)"`. No cliente com `reduce`, `initial={false}` manda não animar e `whileInView={undefined}` não fornece alvo — não sobra nada que desfaça o estilo inline.

Não é um caso de nicho: a preferência é comum em quem tem transtorno vestibular ou sensibilidade a enxaqueca, e alguns modos de economia de bateria a ligam sozinhos.

**Por que o Lighthouse deu 96:** o audit de acessibilidade não executa a página sob `prefers-reduced-motion`. Esta auditoria também não testou esse modo na primeira passagem — o achado veio de revisão do código-fonte, não da ferramenta.

**Correção:** ver item 1.0 do plano de ação. É consertável em 10 minutos mantendo o `motion`, e some sozinho se a reescrita em CSS do item 1.1 for feita.

### Demais achados

| # | Severidade | Achado |
|---|---|---|
| A1 | **Médio** | Contraste insuficiente em 2 elementos: texto `#8390a2` sobre `#ffffff` a 6,4pt → ratio **3,24** (mínimo WCAG AA: 4,5); link `#059669` sobre `#f8fafc` a 10,5pt → ratio **3,6**. |
| A2 | **Baixo** | `alt` redundante na logo (ver I4). |
| A3 | **Médio** | Cookies de terceiros do Clarity e Bing (`c.clarity.ms/c.gif`, `c.bing.com/c.gif` com `CtsSyncId`). Com o fim dos cookies de terceiros no Chrome isso vai quebrar — e, mais urgente, **há sincronização de identificadores com a Microsoft/Bing sem banner de consentimento visível**, o que é exposição sob a LGPD. |

O carrossel de depoimentos usa `role="group"` + `aria-roledescription="carrossel"` + `aria-label` — implementação correta e cuidadosa.

---

## Comparação competitiva

O nicho é maduro e disputado por players com autoridade estabelecida:

| Concorrente | Acervo declarado | Vantagem |
|---|---|---|
| Simulai OAB | 5.875 questões oficiais (2010–2026) | volume + IA |
| Prova da OAB em Questões | 2.320 questões (XIX a XLVI) | cobertura histórica |
| Qconcursos | milhares, indexadas individualmente | domínio antigo, autoridade |
| Estratégia / Gran Cursos | provas comentadas + blog | marca, professores nomeados, conteúdo editorial |
| Passe na OAB | 2.900 questões + 9.000 flashcards + curso | app + curso completo |

O produto do AprovaOAB (diagnóstico → plano por erro → treino direcionado) é diferenciado e o preço (R$19) é agressivo. **O problema não é o produto — é que a maior parte do inventário não está exposta à busca, e não há conteúdo editorial para capturar a demanda informacional.**

---

## Metodologia e limitações

**Coletado:** headers HTTP, HTML servido de 12 páginas, sitemap completo (253 URLs), robots.txt, amostra aleatória de 14 páginas de questão, pesos de todos os assets da home, 3 execuções de Lighthouse 12 (Chrome headless, mobile, throttling padrão).

**Não disponível nesta execução:**

- Dados de campo (CrUX) e PageSpeed API — sem `GOOGLE_API_KEY` configurada, e a quota pública da API estava esgotada.
- Search Console (impressões, cliques, CTR, cobertura de índice) — sem credenciais OAuth.
- GA4 (tráfego orgânico real) — sem credenciais.
- Perfil de backlinks — sem chave Moz/Bing; Common Crawl não retornou dados para o domínio.

**Consequência:** a nota de Performance usa laboratório, não campo. O comportamento real de usuários pode diferir — na prática tende a ser melhor que o throttling 4x do Lighthouse, mas um render delay de 11,6s não desaparece, só encolhe.

Para fechar essas lacunas, configure `GOOGLE_API_KEY` e o OAuth do Search Console.
