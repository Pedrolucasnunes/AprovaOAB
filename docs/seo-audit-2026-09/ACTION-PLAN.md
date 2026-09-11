# Plano de Ação SEO — aprovaoab.app.br

Ordenado por impacto ÷ esforço. Score atual: **68/100**. Potencial realista em 60 dias: **86–90**.

---

## Fase 1 — Correções críticas (Semana 1)

### 1.0 Conteúdo invisível sob `prefers-reduced-motion` `[✅ RESOLVIDO em c00c3a7]`

> Corrigido em `c00c3a7`. A medição abaixo fica como estava: é o retrato do
> defeito, e é o que torna a regra verificável. Depois do conserto, os mesmos
> 24 blocos aparecem em **0 de 24** travados, nos três viewports testados
> (390×844, 1400×900, 1400×6000) — o modo reduzido passa a entregar o mesmo
> conteúdo do modo normal. A regra que impede a volta do bug está no CLAUDE.md,
> em "`Reveal` — por que `whileInView` nunca pode ser `undefined`".

**Não era item de SEO — era bug de acessibilidade, e estava no ar.** Com movimento reduzido ligado, os 24 blocos `<Reveal>` ficam permanentemente em `opacity:0`: a landing mostra o herói e mais nada.

Medido em produção, viewport de 1400×6000:

| | ainda em `opacity:0` | revelados |
|---|---|---|
| normal | 6 de 24 | 18 |
| `--force-prefers-reduced-motion` | **24 de 24** | **0** |

**Causa** (`components/site/reveal.tsx`): o servidor não lê media query, então `useReducedMotion()` devolve falso no SSR e o HTML sai com `style="opacity:0;transform:translateY(26px)"`. No cliente com `reduce`, `initial={false}` manda não animar e `whileInView={undefined}` não dá alvo nenhum — não sobra nada que desfaça o estilo inline.

**Correção mínima** — manter o `motion`, mas sempre ter alvo e zerar a duração:

```tsx
initial={{ opacity: 0, y }}
whileInView={{ opacity: 1, y: 0 }}          // sempre definido, nunca undefined
viewport={{ once: true, margin: "-70px" }}
transition={reduce ? { duration: 0 } : { duration: 0.65, delay, ease: EASE }}
```

Sob `reduce` o elemento entra na viewport e salta pro estado final sem animação — respeita a preferência e o conteúdo aparece.

**Se for fazer o passo 2 do 1.1 agora, pule este item:** a reescrita em CSS resolve de tabela, porque o bloco `@media (prefers-reduced-motion: reduce)` força o estado final e o conteúdo deixa de depender de JS. Este atalho existe pro caso de o 1.1 ficar pra depois — o bug não deve esperar por ele.

### 1.1 Destravar o LCP `[CRÍTICO]` `[~6h]` `[+15 pts]`

**Problema:** LCP de 9,5–12,3s no mobile em todas as páginas; 93–94% é render delay.

**O que já está resolvido — não refaça:** `components/site/hero.tsx` já usa `initial={false}` na coluna editorial, e o parágrafo do LCP chega em `opacity:1;transform:none` na resposta HTTP. Os 24 elementos em `opacity:0` no HTML são os `<Reveal>` (`whileInView`, abaixo da dobra) — comportamento correto.

**Causa real:** saturação de main thread. 15 dos 19 componentes em `components/site/` são `"use client"` e a home monta 13 seções, arrastando `motion/react` para a hidratação inicial; somados a 301 KB de GTM + Clarity, dão 1.508ms de script evaluation e 1.244ms de style & layout.

**Fazer, nesta ordem (re-medindo a cada passo):**

1. **Terceiros fora do caminho crítico** — ver 3.5. É o mais barato e o Clarity sozinho custa 890ms.
2. **`motion/react` fora da hidratação inicial.** Comece pelo `components/site/reveal.tsx` — 21 usos em 8 seções, scroll-reveal puro que CSS resolve:
   ```css
   @keyframes rise { from { opacity:0; transform:translateY(26px) } to { opacity:1; transform:none } }
   .reveal {
     animation: rise .65s cubic-bezier(.21,.61,.35,1) both;
     animation-timeline: view(); animation-range: entry 0% cover 30%;
   }
   @media (prefers-reduced-motion: reduce) { .reveal { animation:none; opacity:1; transform:none } }
   ```
   `animation-fill-mode: both` garante o estado final mesmo se algo falhar. Onde `animation-timeline` não pegar, um `IntersectionObserver` de dez linhas que só adiciona a classe custa uma fração do runtime do `motion`.
3. **Revisar quais das 15 seções precisam mesmo ser client components** — várias provavelmente só são por causa do `Reveal`.
4. Revalidar com Lighthouse mobile nas 3 páginas testadas.

**Meta:** LCP < 2,5s, Performance ≥ 85.

---

### 1.2 `noindex` em páginas de autenticação `[CRÍTICO]` `[~10min]`

> `login/page.tsx` e `cadastro/page.tsx` já são Server Components (desde `9ab4fef`) e nenhum dos dois exporta `metadata` hoje — então isto é colar o bloco, sem refatoração.

```ts
// app/login/page.tsx e app/cadastro/page.tsx
export const metadata: Metadata = {
  title: 'Entrar | AprovaOAB',           // /cadastro: 'Criar conta | AprovaOAB'
  robots: { index: false, follow: true },
  alternates: { canonical: 'https://www.aprovaoab.app.br/login' },
}
```

---

### 1.3 Canonicals ausentes `[ALTO]` `[~15min]`

> Mesma situação do 1.2: as quatro rotas são Server Components e só falta o `export const metadata`.

Adicionar `alternates.canonical` em `/login`, `/cadastro`, `/termos-de-uso`, `/politica-de-privacidade`. Aproveitar para escrever `description` própria nas duas páginas legais (hoje usam o fallback do site).

~~Padronizar também a home: escolher **com barra** (`https://www.aprovaoab.app.br/`) em canonical, `og:url` e sitemap — hoje os três divergem.~~

> **Esta recomendação estava errada, nos dois sentidos. Resolvido ao contrário.**
>
> **O achado em si era fraco.** Para a raiz, `https://www.aprovaoab.app.br` e
> `https://www.aprovaoab.app.br/` são a **mesma URL** pela RFC 3986 — caminho
> vazio equivale a `/`. O Google nunca tratou isso como divergência, então não
> havia problema de SEO a consertar.
>
> **E a direção era inexequível.** O Next normaliza toda URL de metadata contra
> `trailingSlash` (`false`, o padrão) e serve o canonical **sem** barra mesmo
> quando a página declara `${APP_URL}/` absoluto — testado no build, não
> deduzido. Chegar a "com barra" exigiria `trailingSlash: true`, que
> redirecionaria as 253 URLs do site inteiro para consertar um não-problema.
>
> O que foi feito: alinhar a entrada da home **no sitemap**, sem barra, igual às
> outras 252. Uma linha em `app/sitemap.ts`. Os três passam a coincidir em
> `https://www.aprovaoab.app.br`.

---

### 1.4 Favicons de 726 KB `[ALTO]` `[~30min]`

`/icon.png` e `/apple-icon.png` pesam 726 KB cada — 1,45 MB só de ícones. No App Router, gerar os tamanhos corretos:

```
app/icon.png          32×32   (~2 KB)
app/apple-icon.png    180×180 (~8 KB)
```

E otimizar `/aprovaoab-logo-primary.png` (253 KB → alvo < 40 KB).

---

### 1.5 OG image em `/editais` `[MÉDIO]` `[~20min]`

`/editais` e `/editais/48-exame-oab` são as únicas rotas sem `og:image`. Copiar o `opengraph-image.tsx` que já existe em `/questoes` e `/provas`.

---

## Fase 2 — Expor o acervo (Semanas 2–3) — **maior retorno do plano**

### 2.1 Publicar as ~2.040 questões restantes `[CRÍTICO]` `[~2 dias]` `[+10–12 pts]`

Hoje: 200 de ~2.240 questões têm URL própria (~9%). Cada questão é uma keyword de cauda longa real — o candidato copia o enunciado e cola no Google.

**Fazer:**
1. Remover o limite de 10 por matéria no `generateStaticParams`.
2. Adicionar paginação nas páginas de matéria (`/questoes/direito-civil/pagina/2`), com `rel=prev/next` lógico e links rastreáveis em `<a href>` — nunca só via JS.
3. Em cada página de prova, linkar **as 80 questões**, não 10.
4. Incluir todas no sitemap. Acima de ~1.000 URLs, considere sitemap index por matéria.

**Cuidado com index bloat:** publique só questões com resolução comentada real. Questão sem comentário é thin content e arrasta o domínio inteiro. Se hoje só 200 têm comentário, o gargalo é produção de conteúdo — priorize por matéria de maior peso na prova (Ética 8 questões, Civil 6, Constitucional 6, Penal 6, Processo Civil 7).

### 2.2 Encurtar títulos `[ALTO]` `[~1h]`

13 de 14 títulos amostrados passam de 60 caracteres. Remover o sufixo `| AprovaOAB` das páginas de questão:

- Antes: `Responsabilidade civil do Estado — Questão do 36º Exame OAB 2022 | AprovaOAB` (76)
- Depois: `Responsabilidade civil do Estado — 36º Exame OAB (2022)` (54)

### 2.3 Simplificar URLs de questão `[MÉDIO]` `[~3h]`

De `/questoes/direito-civil/contratos-41-exame-oab-00110fb7-1098-4479-8aac-8670baf37188`
para `/questoes/direito-civil/contratos-41-exame-oab-q12` (ID curto sequencial).

> Só faça isso **antes** de publicar as 2.040 novas. Depois, exigiria 2.240 redirects 301.

### 2.4 Enriquecer hubs `[MÉDIO]` `[~2h]`

`/questoes` (164 palavras) e `/editais` (194) são rasos para páginas de categoria. Usar `/questoes/direito-civil` como modelo: introdução de 300–500 palavras explicando a distribuição de questões por matéria, peso na prova e como usar o acervo.

---

## Fase 3 — Autoridade e conteúdo (Mês 2)

### 3.1 Sinais de E-E-A-T `[ALTO]` `[~1 dia]` `[+6–8 pts]`

Conteúdo jurídico é YMYL. Criar:

- **`/sobre`** — quem faz o AprovaOAB, por que existe, quem revisa o conteúdo.
- **Responsável técnico** — advogado(a) com nome e número OAB/UF validando as resoluções.
- **Rodapé** com razão social e CNPJ.
- **Schema:** adicionar `contactPoint`, `foundingDate`, `legalName` ao `Organization`; `Person` para o responsável técnico.

### 3.2 Arquivo público do Café com OAB `[ALTO]` `[~1 dia]`

A newsletter já é produzida e hoje não gera nenhum valor de busca. Publicar em `/cafe-com-oab/[slug]` com `Article` schema, índice em `/cafe-com-oab` e feed RSS.

### 3.3 Conteúdo informacional `[ALTO]` `[~2 semanas]`

Nenhuma página cobre a demanda informacional do nicho. Prioridade:

| Página | Intenção |
|---|---|
| `/como-passar-na-oab` | guia principal — hub do cluster |
| `/o-que-cai-na-1a-fase-da-oab` | distribuição por matéria (dado que você já tem) |
| `/quanto-tempo-estudar-para-a-oab` | planejamento |
| `/nota-de-corte-oab` | atualizada a cada exame |
| `/como-funciona-o-exame-de-ordem` | informacional de topo |

Linkar cada uma para os hubs `/questoes/[materia]` correspondentes.

### 3.4 Schema complementar `[MÉDIO]` `[~3h]`

- `FAQPage` na home (5 perguntas já existem — só falta marcar).
- `Course` + `CourseInstance` para o produto.
- No `Quiz`: adicionar `name`, `learningResourceType: "Practice problem"`, `educationalAlignment`.
- `url` e `availability` nas ofertas do `SoftwareApplication`.

### 3.5 Otimizar terceiros `[MÉDIO]` `[~2h]`

- Consolidar GA4 dentro do GTM (hoje roda GTM **e** gtag em paralelo — 301 KB, 141 KB não usados).
- Clarity com `strategy="lazyOnload"` (consome 890ms de main thread).
- `preconnect` para as 7 origens de terceiros (economia medida: ~560ms na maior).
- Reavaliar se o Bing UET tem ROI.

### 3.6 Conformidade LGPD `[MÉDIO]` `[~4h]`

Clarity e Bing fazem sincronização de identificadores (`c.bing.com/c.gif?...CtsSyncId=...`) sem banner de consentimento visível. Implementar Consent Mode v2 e carregar tags só após opt-in.

---

## Fase 4 — Contínuo

### 4.1 Instrumentação `[ALTA PRIORIDADE — fazer já]`

A auditoria rodou sem dados de campo. Configurar:

- `GOOGLE_API_KEY` → PageSpeed + CrUX (CWV reais, não laboratório)
- OAuth do Search Console → impressões, cliques, cobertura de índice
- GA4 API → tráfego orgânico

Sem isso, nenhuma das melhorias acima é mensurável.

### 4.2 Itens menores

- `/llms.txt` com índice curado (questões, provas, editais, matérias).
- `lastmod` em todas as 253 URLs do sitemap (hoje só 2 têm).
- Contraste: `#8390a2` sobre branco (3,24) e `#059669` sobre `#f8fafc` (3,6) — mínimo AA é 4,5.
- `alt=""` na logo do header (hoje duplica o texto ao lado).
- Renomear `/Sem fundo.png` para `/logo-aprovaoab.png`.
- `/manifest.json` (PWA) e `/.well-known/security.txt`.

### 4.3 Dados próprios para citação em IA

O acervo de 2.240 questões + dados de desempenho dos usuários permitem publicar estatísticas originais que ninguém mais tem: "matérias com maior índice de erro na 1ª fase", "temas mais recorrentes por exame", "evolução da nota de corte". É o tipo de conteúdo que vira citação em AI Overview e atrai backlink editorial.

---

## Resumo por impacto

| Ação | Esforço | Ganho estimado |
|---|---|---|
| 1.0 Conteúdo invisível sob reduced-motion | 10min | bug em produção |
| 1.1 Destravar LCP | 6h | **+15 pts** |
| 2.1 Publicar 2.040 questões | 2 dias | **+10–12 pts** |
| 3.1 + 3.2 + 3.3 E-E-A-T e conteúdo | 3 semanas | **+8–10 pts** |
| 1.2–1.5 Correções técnicas | 1,5h | +3–4 pts |
| 3.4 Schema complementar | 3h | +2–3 pts |
| 3.5 Otimizar terceiros | 2h | +2 pts |
