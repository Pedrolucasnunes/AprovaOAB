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

### 1.1 Destravar o LCP `[✅ ENCERRADO — ver "Resumo por impacto"]`

> **O diagnóstico abaixo estava errado na CAUSA, e fica registrado por isso.**
> Resolvido, mas por outro item: os ícones de 726 KB (1.4). Estado final:
> performance **85**, LCP **3,4 s**, mediana de 3 execuções.
>
> A causa não era saturação de main thread. Medido: tarefa longa responde por
> **menos de 20%** do render delay; o `clarity.js` custa ~940 ms de CPU mas só
> COMEÇA a rodar em 5,9 s, com o LCP em 0,8 s no relógio observado — nunca
> esteve no caminho crítico. `bootup-time` mede CPU total, não quando ela é
> gasta, e é isso que faz script caro fora da janela parecer causa.
>
> Dos três passos abaixo: o (1) foi feito e revertido por não medir ganho; o (2)
> foi feito e vale por robustez, não por performance; o (3) foi cancelado.

**Problema (como estava escrito):** LCP de 9,5–12,3s no mobile em todas as páginas; 93–94% é render delay.

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

> **Para tudo que já foi executado, esta tabela é MEDIDO, não estimado.** A
> versão original era estimativa e errou a ordem de prioridade por margem
> grande: deu 6 h e +15 pts pro item de LCP e empacotou os ícones num lote de
> "+3–4 pts". O oposto aconteceu. Quem for planejar a próxima rodada precisa ler
> o número real, senão orça pelo chute que já foi desmentido.

### Executado — Fase 1 (set/2026)

| Ação | Esforço | Resultado MEDIDO |
|---|---|---|
| 1.0 Conteúdo invisível sob reduced-motion (`c00c3a7`) | 10 min | bug de acessibilidade: 0 de 24 blocos visíveis → paridade com o modo normal |
| **1.4 Ícones** (`7e99e9d`) | 30 min | **+9 pts, LCP 12,3 s → 3,4 s.** 1,45 MB → 10 KB. A alavanca dominante da fase inteira |
| 1.2/1.3/1.5 Metadata, canonicals, OG (`fe3ee97`) | 45 min | não mede em performance; corrige duplicata interna e põe `noindex` nas rotas de auth |
| **1.1a Terceiros** (`b653e14`) | 2 h | **sem ganho mensurável — revertido** (`9e93517`). O `preconnect` ficou |
| **1.1b `Reveal` em CSS** (`24a0a70`) | 1 h | **zero performance.** Vale por robustez: conteúdo visível sem JS, e a classe de erro de `c00c3a7` deixa de ser alcançável |
| **Preload de fontes** (`f59f7be`) | 1 h | **sem separação** (84 contra 84). **Regressão de FCP** de 191 ms no relógio observado → **revertido em parte** (`3275ae0`); ficou sem preload só o Geist Mono, que não renderiza em lugar nenhum |
| 1.1c Revisar componentes client | — | **cancelado.** Tarefa longa responde por menos de 20% do render delay; teto do ganho é da ordem de um décimo de segundo simulado |

**Fase 1 encerrada em performance 85, LCP 3,4 s** (mediana de 3 execuções,
Lighthouse mobile). A meta era "< 2,5 s e ≥ 85": o score chegou, o LCP parou a
~900 ms. Decisão registrada: **não continuar** — a faixa "ruim" do Google acaba
em 4 s e o retorno passou pra Fase 2 e pro Search Console.

**A lição vale mais que os números: tudo que foi atribuído a JavaScript na
thread principal não entregou — hidratação, `motion`, Clarity. O que entregou
foi byte na janela entre o FCP e o LCP.** As correções contra medição desta fase
seguiram esse padrão.

### Ainda estimado — não executado

| Ação | Esforço | Ganho estimado |
|---|---|---|
| 4.1 Search Console + GA4 | — | **pré-requisito; virou bloqueio da Fase 2** |
| 2.1 Publicar as questões restantes | 2 dias | +10–12 pts |
| 3.1 + 3.2 + 3.3 E-E-A-T e conteúdo | 3 semanas | +8–10 pts |
| 3.4 Schema complementar | 3h | +2–3 pts |

**Correção de premissa da Fase 2, medida em set/2026.** O gargalo não é produção
de conteúdo: **1.332 das 2.152 questões têm `explicacao`** (61,9%), não ~200 —
há 6,6× mais questão comentada do que publicada. Mas a `explicacao` **não vai
pro HTML**; o diferencial da página pública é o stat de erro do
`lib/seo/stats.ts`. Hoje **3 questões** passam no `MIN_ATTEMPTS = 30` e nenhuma
está entre as 200 publicadas, então o bloco não aparece em página nenhuma. Isso
**não** condiciona a publicação: `getQuestionErrorRate` devolve `null` e a página
omite o bloco, então as páginas melhoram sozinhas conforme o uso cresce, sem
migração e sem decisão futura.
