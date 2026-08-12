# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # local dev server (localhost:3000)
npm run build    # production build
npm run lint     # ESLint
```

No test suite exists in this project.

## Architecture

**AprovaOAB** — SaaS de preparação para a OAB. Next.js 16 App Router + React 19 + TypeScript, Supabase (Auth + Postgres), Stripe (assinaturas), Tailwind CSS v4, shadcn/ui (Radix UI).

Deployed on Vercel at `https://www.aprovaoab.app.br`.

### Região das funções — `gru1`, e por quê

`vercel.json` fixa `"regions": ["gru1"]` (São Paulo). **Não mudar sem medir.** O default da Vercel para projetos novos é `iad1` (Washington), e o Supabase deste projeto está em `sa-east-1` (São Paulo): com a função em `iad1`, cada ida ao banco custava **~135 ms** contra ~20 ms de `gru1`. Como as rotas fazem várias consultas na mesma requisição, era esse número — e não o volume de dados — que dominava o tempo de resposta.

Como conferir a região em produção (o `x-vercel-id` é `<edge>::<função>::<id>`):

```bash
curl -sD - https://www.aprovaoab.app.br/api/dashboard | grep -i x-vercel-id
# gru1::gru1::...  correto     |  gru1::iad1::...  voltou pro default
```

Contrapartida aceita: Stripe, Resend e Google Calendar são hospedados nos EUA e ficam ~100 ms mais lentos. São caminhos de webhook e background, não de tela.

**Corolário para quem escreve rota nova: o custo está no NÚMERO de consultas em sequência, não no tamanho delas.** Duas consultas independentes têm que ir num `Promise.all`; consulta repetida na mesma requisição é ida e volta jogada fora.

### Supabase — dois clientes distintos

| Cliente | Arquivo | Quando usar |
|---|---|---|
| Browser (anon key) | `lib/supabase.ts` → singleton `supabase` | Componentes client-side |
| Admin (service role) | `lib/supabase-admin.ts` → `supabaseAdmin` | Rotas API server-side que precisam ignorar RLS |

O cliente browser respeita RLS. O `supabaseAdmin` ignora RLS completamente — usar **apenas em código server-only** (rotas `/api/` **e** Server Components), nunca em client components. A service role key nunca deve chegar ao navegador; em Server Components, projetar explicitamente só os campos que vão ao HTML (ex.: páginas públicas de SEO em `app/questoes/` leem via `supabaseAdmin` mas nunca expõem o campo `explicacao`).

**Importante:** sempre importar o singleton (`import { supabase } from "@/lib/supabase"`), nunca criar `createBrowserClient(...)` inline. Cada instância tem seu próprio storage adapter e disputam o `navigator.locks` do token de auth, causando erro "Lock was released because another request stole it" quando dois componentes rodam `getUser()` em paralelo.

### Autenticação nas rotas API

Todas as rotas protegidas usam os guards de `lib/auth-server.ts`:

```ts
// Usuário comum — `plano` vem junto, NÃO reconsultar
const { user, supabase, plano, error } = await requireUser()
if (error) return error

// Admin
const { user, error } = await requireAdmin()
if (error) return error
```

`requireUser()` também bloqueia contas com `role = "blocked"`. `requireAdmin()` exige `role = "admin"` na tabela `users`.

**`requireUser()` devolve `plano`** porque ele sai da mesma linha de `users` que o `role`. As rotas que precisavam dele (`/api/treino`, `/api/simulados/gerar`, `/api/simulados/resposta`) faziam um segundo `SELECT` na linha que o guard acabara de ler — uma ida e volta inteira ao banco por requisição, na rota que roda a cada questão respondida.

### Tabela `users` (Supabase)

Campos relevantes além do Auth padrão:
- `role`: `"user"` | `"blocked"` | `"admin"` — verificado no banco (jul/2026): o role padrão é `"user"`, **não** `"free"` (free/pago é o campo `plano`, não o `role`)
- `plano`: `"free"` | `"pro"` | `"aprovacao"`
- `stripe_customer_id`: string | null
- `stripe_subscription_id`: string | null

O campo `plano` é atualizado **exclusivamente pelo webhook do Stripe** (`/api/stripe/webhook`), nunca diretamente pelo cliente.

### Datas do banco — CUIDADO com timezone

As colunas `timestamp` do schema público (`question_attempts`, `simulados`, `users`…) são **sem time zone**, gravando hora UTC — o PostgREST devolve strings **sem offset** (ex.: `"2026-06-18T22:22:34.677157"`). Um `new Date()` cru interpreta isso como hora *local* (no navegador em Brasília: mostra a hora UTC como se fosse local, 3h adiantada; no Vercel o servidor é UTC). **Sempre parsear com `parseDbDate` e formatar/bucketar com os helpers de `lib/datas.ts`** (`formatarDataHoraBrasil`, `ymdBrasil`, `horaBrasil`, `inicioDoDiaBrasil`, `tempoRelativo`). As datas da Auth API (`last_sign_in_at` etc.) já vêm com `Z` e passam intactas pelo `parseDbDate`.

### Stripe

- Webhook em `/api/stripe/webhook` — valida assinatura com `stripe.webhooks.constructEvent` antes de processar qualquer evento
- Eventos tratados: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- `lib/stripe.ts` exporta instância singleton do cliente Stripe

Planos live:
- Pro: `STRIPE_PRICE_PRO` (R$ 19/mês) — **único plano pago vendável**

**O preço exibido sai de `lib/planos.ts`, não de string solta.** Estava escrito à mão em quatro arquivos (vitrine, FAQ, tela do trial, perfil). `PRECO_PRO_ANTERIOR` e `PROMOCAO_ATE` são `null`: o R$ 29 riscado **nunca foi cobrado de ninguém**, então exibi-lo como preço anterior era âncora inventada, e "promocional de lançamento" sem data era promessa que não dava pra cobrar. Se houver aumento real, os dois voltam juntos — o valor antigo e o prazo.

O plano **Aprovação** foi removido da vitrine: não aparece mais na landing e o checkout rejeita `plano !== "pro"` (`app/api/stripe/checkout/route.ts`). O valor `"aprovacao"` permanece nos tipos, no webhook (`planoFromPriceId`) e nos badges admin apenas como plumbing defensivo, para reintroduzir um tier premium real no futuro (ex.: 2ª fase). `STRIPE_PRICE_APROVACAO` segue no env mas o price está arquivado na Stripe.

### Cobrança recusada — a régua de avisos

**A lista de `enabled_events` mora no painel do Stripe, não no repositório.** Handler sem evento habilitado falha em silêncio: nenhum erro, nenhum log, nenhum teste vermelho. Foi o que aconteceu de abr a ago/2026 — o webhook tratava `invoice.payment_failed` desde sempre, o evento nunca esteve habilitado no endpoint, e **nenhum aluno com cartão recusado foi avisado**. O `past_due` chegava certo pelo `customer.subscription.updated`, então só o e-mail sumia. **Ao adicionar um `case` novo no switch, habilitar o evento no painel é parte da tarefa** — conferir com `stripe.webhookEndpoints.list()`.

Quatro momentos, três e-mails (`lib/email.ts`), e o silêncio no meio é deliberado:

| Momento | O que dispara | Tom |
|---|---|---|
| 1ª falha | `sendPaymentFailedEmail` | o acesso continua, vamos tentar de novo |
| retentativas do meio | **nada** | escrever em todas seria spam |
| última tentativa | `sendLastPaymentAttemptEmail` | não vem mais nenhuma; ainda dá pra regularizar |
| assinatura encerrada | `sendSubscriptionEndedEmail` | conta segue no grátis, progresso salvo |

**A última tentativa é detectada por `next_payment_attempt === null`, NUNCA comparando `attempt_count` com um literal.** A Stripe zera esse campo quando não há mais retentativa agendada. O número de tentativas **não é fixo**: quem decide é o Smart Retries, por cartão e por cliente, e o contador ainda pode ser inflado por retentativa manual no painel — que também incrementa `attempt_count`. Medido nesta conta (ago/2026): uma fatura registrou `attempt_count = 9` antes do cancelamento, outra estava em 2 com a 3ª agendada. Qualquer número escrito à mão aqui erraria, e erraria em silêncio. Verificado no único ciclo que chegou ao fim: `next_payment_attempt` **foi a null** na última.

A ordem dos `if` importa: com retentativas desligadas, a 1ª falha **já é** a última, e o aviso certo é o de última chance.

**O e-mail de fim de acesso só vai pra quem perdeu por pagamento.** `customer.subscription.deleted` cobre também quem clicou em cancelar; `cancellation_details.reason === "payment_failed"` é o que separa os dois (a Stripe carimba esse motivo quando é ela que cancela ao esgotar as tentativas — verificado em produção). Mandar "seu acesso terminou" pra quem acabou de cancelar é notícia velha com cara de cobrança. O ramo `unpaid` não precisa da checagem: é, por definição, retentativa esgotada.

**Em `past_due` o plano continua `"pro"` de propósito** — é carência, não se pune soluço de cartão. Por isso `plano` sozinho não descreve o estado da assinatura: `app/dashboard/perfil/page.tsx` deriva três estados do `subscription_status` + `cancel_at_period_end` (Ativo · Pagamento pendente · Cancelado), porque o card dizia "Ativo" com selo verde pra quem tinha acabado de receber "sua cobrança falhou". Nenhum dos avisos traz data: `users` não guarda o fim do período nem a próxima tentativa.

O CTA da última chance usa o `hosted_invoice_url` da própria fatura — paga direto, sem login —, com fallback pro `/dashboard/perfil` se vier nulo. O portal sustenta os dois caminhos (`payment_method_update` e `invoice_history` habilitados na config default).

**O domínio não tem MX: `oi@aprovaoab.app.br` só envia.** Toda resposta a qualquer e-mail do produto cai no vazio. Enquanto isso não mudar, e-mail nenhum pode prometer "é só responder".

### Regras de negócio por plano

| Funcionalidade | Free | Pro |
|---|---|---|
| Questões (treino avulso) | 10/dia | Ilimitado |
| Treino inteligente | ✅ | ✅ |
| Simulados completos (80 questões) | ❌ | ✅ |

(Internamente o gate é sempre `plano === "free"` vs. pago; um eventual `"aprovacao"` legado se comporta como Pro.)

**Onde o gate está no código:**
- Limite diário free: verificado em `app/api/simulados/resposta/route.ts` (não em `/api/questions`) e em `/api/treino`. Conta registros em `question_attempts` de hoje. Retorna `{ error, limiteDiario: true }` com status 403 ao atingir o teto. Essa rota também grava `time_spent_ms` nas respostas de treino (as telas de Treino e de Questões medem com `performance.now()`); o ramo de simulado ignora o campo, porque `simulado_respostas` não tem a coluna.
- **O valor do teto sai de `app_config.limites.freeDailyLimit` (`getLimitesConfig`), nunca de constante.** É a mesma fonte que o trigger `enforce_free_daily_limit` lê no banco. `lib/check-daily-limit.ts` separa I/O de decisão pelo mesmo motivo do placar: `contarQuestoesHoje` (consulta, retorna `null` pra quem não é free) e `avaliarLimite` (pura). Elas existem separadas porque a config e a contagem têm que ir no **mesmo `Promise.all`** — buscar as duas em sequência em `/api/simulados/resposta` seria uma ida ao banco a mais em toda questão respondida.
- `carregarDiasNoTeto` **só pode ser chamada dentro do ramo do 403**. É consulta extra; no caminho de sucesso vira custo por resposta. Quem já tem `question_attempts` em memória (o `/api/dashboard`) usa `contarDiasNoTeto` direto, sem I/O.
- Simulados: gate em `app/api/simulados/gerar/route.ts` — verifica `users.plano === "free"` e retorna 403 com `{ upgrade: true }`. Na prática o free **não chega nesse 403**: a tela troca o botão por trial/assinar, então o 403 é backstop pra plano trocado no meio da sessão.

### A parede do limite diário

`components/dashboard/limite-diario.tsx` é a **única** superfície da parede — antes eram seis blocos com copy própria que já discordavam entre si (dois no treino, dois nas questões, o card de "poucas restantes" e o recuo silencioso do seletor). Toda a decisão de texto mora em `conteudoDaParede`, que é pura.

Dois estados, definidos em `lib/limite-diario.ts` (também puro): `habito` (< `DIAS_PARA_OFERTA` = 3 dias com o teto batido) mostra o que a sessão produziu e empurra a volta amanhã, sem vender; `recorrente` vira oferta, sempre com o caminho gratuito visível.

- A frequência vem de `diasNoTeto` (`question_attempts`, retroativo), **não** do evento `limite_diario_atingido` — o evento só existe desde 28/jul e classificaria como "primeira vez" quem já batia no teto antes disso. O evento mede o que a tabela não consegue: intenção **recusada**.
- `frasePeriodo` só diz "essa semana" quando `ultimos7` sustenta.
- **A parede não cita preço** de propósito: o valor muda, e assim ela não envelhece errado.
- `sessao` (o "10 questões de X — 3 certas") só é passado pelo **treino**, que é sessão fechada. O banco de questões pagina, e resumir a página atual diria "3 questões" pra quem respondeu 10 hoje.
- O resumo conta respostas **salvas**, não tentadas: o 403 chega na resposta seguinte ao teto, então contar tentativas faria a parede dizer 11 de 10.

### Depoimentos da landing

`lib/depoimentos.ts` é a lista curada à mão (não vem do banco) e `components/site/depoimentos.tsx` é a seção, montada entre `Benefits` e `FreeQuestions`.

- **Abaixo de `MIN_DEPOIMENTOS` = 3 a seção não renderiza.** Mesma regra do `MIN_ATTEMPTS` de `lib/seo/stats.ts`: prova social ou tem amostra real, ou não é exibida. Em dev, 1 ou 2 depoimentos disparam um `console.warn` explicando o sumiço.
- **`autorizadoEm` é obrigatório no tipo; `contexto` e `fonte` não.** Os dois nasceram obrigatórios e foram afrouxados quando os primeiros dez chegaram sem essa informação: campo obrigatório que ninguém preenche com verdade vira convite a preencher com invenção, e "candidata ao XLIII Exame" ao lado de um nome real é afirmação sobre uma pessoa. `autorizadoEm` continua obrigatório porque o rodapé da seção afirma "publicados com autorização de cada pessoa" — é o único campo que vira promessa pública.
- **Sem `Review`/`AggregateRating` no JSON-LD**, apesar de o `SoftwareApplication` de `app/layout.tsx` ser o nó natural. Não existe nota no produto (não há NPS nem escala), então `aggregateRating` seria número inventado; e review que o próprio site coleta sobre si é *self-serving*, que o Google não aceita pra rich result. Risco de ação manual, ganho zero.
- O carrossel é scroll-snap nativo + `rAF` sobre `scrollLeft`, **não** o `Carousel` do shadcn (nenhuma seção de `components/site/` importa de `@/components/ui/`) e **não** o `.marquee-track` de `globals.css` — aquele anima `transform` dentro de `overflow: hidden`, e track transformado não é rolável: no touch, onde não existe hover, o usuário ficaria sem nenhum controle sobre texto em movimento.
- A lista é renderizada **duas vezes** (a 2ª metade `aria-hidden`) pro loop não ter emenda. O recuo do loop usa o **período medido** (`offsetLeft` do primeiro clone), nunca `scrollWidth / 2`: entre as duas voltas existe um gap a mais do que dentro de cada volta, e a diferença (8px com 10 depoimentos) derivaria a cada volta.
- A rolagem pausa em hover, foco de teclado, toque e clique de seta, e não existe sob `prefers-reduced-motion`. Ressalva conhecida: WCAG 2.2.2 pede mecanismo **persistente** de pausa — os quatro gatilhos são transitórios, então falta um botão pausar/continuar pra conformidade estrita.

### Treino inteligente — algoritmo

Não óbvio sem ler o código (`app/api/treino/route.ts`):
- **70%** das questões vêm das top 3 matérias com menor taxa de acerto. Priorização em cascata (filosofia: o simulado é a medição limpa): **1º** view `materias_risco` (só respostas de simulado); **2º fallback** sem dados de simulado (free/recém-chegado) → `placarPorMateria` de `lib/services/desempenho.ts` e prioriza as com taxa < 40 (passo 2.5 da rota); **3º** questões gerais
- **30%** são questões gerais, **preferindo matéria não medida** (sem entrada no placar ou com `total = 0`). É assim que o treino vai completando o mapa sem depender do Módulo 2 — antes, matéria sem dado nunca entrava no risco e nunca era priorizada, então podia ficar invisível pra sempre
- Exclui questões já acertadas anteriormente (simulados + treino avulso)
- Quantidades aceitas: 5, 10, 20 ou 30 (padrão: 10). **5 = "sessão focada"**: 100% matérias em risco (sem parcela geral), com fallback pra questões gerais se o usuário ainda não tem matérias em risco

### Diagnóstico modular — módulos, mapa e lembrete

O diagnóstico é dividido em módulos definidos em `app_config.diagnostico` (sem hardcode): **Módulo 1** = 8 matérias × 2 questões (dificuldade média/difícil), **Módulo 2** = 12 matérias × 1 questão (média). A profundidade diferente é **declarada na UI** — a tela de questões e o CTA dizem "1 questão por matéria, metade da profundidade do Módulo 1", porque sem isso o usuário vê o mesmo placar e assume a mesma confiança.

`diagnostic_subject_results` é a invariante: **linha existe = matéria medida** (`CHECK (total > 0)`). Ela é derivada de `question_attempts`, e três coisas dependem disso:

- **`mapaConsolidado(userId)`** (`lib/services/diagnostico.ts`) — materializa na leitura quando não há linha. Os ~23 usuários do diagnóstico legado (`m0`, 5 questões) nunca passaram por uma conclusão de módulo, que é onde o `responder` grava. **Toda leitura do mapa tem que passar por aqui**: quando só a tela de resultado consolidava, o dashboard dizia "faltam 8 matérias" e a tela mostrava 3 medidas, pro mesmo usuário (17 casos em produção).
- **`proximoModuloPendente(userId)`** — o próximo módulo é o que tem matéria **pendente**, não o que não foi concluído. Um Módulo 1 respondido inteiro mas com 5 matérias sem medir (respostas < 3s) ainda é o próximo; oferecer o Módulo 2 ali não cobriria nenhuma delas. Usado pelo `/api/dashboard` **e** pelo `/api/diagnostico/resultado`.
- **`diagnosticoCompleto` ≠ mapa completo.** Ele fica `true` assim que UMA sessão conclui. Os entry points do diagnóstico eram todos gateados em `!diagnosticoCompleto`, então quem terminava o Módulo 1 perdia qualquer caminho pro Módulo 2 fora da tela de resultado — daí o card persistente do dashboard alimentado por `diagnosticoProximoModulo`.

**Lembrete do Módulo 2:** o botão "Me lembra amanhã" grava `users.diagnostic_reminder_at` (`POST /api/diagnostico/lembrete`) com a **meia-noite de amanhã no fuso de Brasília** — não `now + 24h`, porque o cron roda em hora fixa e um alvo de 24h à frente seria pulado pela execução da manhã. `/api/cron/diagnostico-lembrete` (diário, 13h UTC, em `vercel.json`, protegido por `CRON_SECRET`) envia e **zera a coluna**: é lembrete único, não sequência. Se o mapa foi completado no meio, não manda nada.

### Métricas exibidas — fonte única

`lib/metrics.ts` centraliza META_APROVACAO (50%), as bandas por matéria (crítica < 40, média 40–70, boa > 70), os pisos de amostra MIN_TENTATIVAS_BANDA (3 respostas pra uma matéria entrar nas contagens dos cards) e MIN_RESPOSTAS_TAXA_GERAL (10 respostas de treino pra exibir a taxa geral) e os helpers de cor/label. Toda tela que classifica ou colore uma taxa de acerto importa daqui — não redeclarar thresholds.

**A fusão por matéria mora em `lib/services/desempenho.ts` (`placarPorMateria`)** — não repetir a agregação em rota nenhuma. Ela funde `question_attempts` (diagnóstico + treino) + `simulado_respostas`, aplica o filtro de baixa confiança e devolve **duas contagens de propósito**:

- `total`/`acertos` — acumulado, base da **ORDENAÇÃO** (quem entra no bloco de risco do treino, em que ordem a lista aparece). Sem piso de amostra: recomendar a partir de pouca amostra é aceitável.
- `totalTreino`/`acertosTreino` — **sem o diagnóstico**, base da **CLASSIFICAÇÃO**. Só com `>= MIN_TENTATIVAS_BANDA` o `/api/dashboard` marca `rotulavel: true`, e só aí a UI mostra o badge de banda ("crítico"/"atenção"/"adequado"); sem isso mostra "medindo". O diagnóstico mede 2 questões por matéria: aponta direção, não sustenta carimbar alguém de crítico numa disciplina.

O **filtro de baixa confiança** (`app_config.diagnostico.minTempoRespostaMs`, hoje 3000) vale pra **todas** as fontes com tempo gravado, não só o diagnóstico. `time_spent_ms` nulo conta como válida — é o caso das respostas anteriores à instrumentação e de todo o simulado (`simulado_respostas` não tem a coluna, é a fonte não filtrada conhecida do placar). O filtro é prospectivo por isso.

Matéria com `total = 0` (todas as respostas descartadas) **não é matéria com 0%** — é matéria não medida. Filtrar `total > 0` antes de calcular taxa é obrigatório: sem isso ela vira 0% e sobe pro topo da lista de risco.

`placarPorMateria(..., "diagnostico")` restringe ao diagnóstico e alimenta `recomputarResultados` + `/api/diagnostico/resultado`: aquela tela é o retrato do que **o diagnóstico** mediu e não pode mudar quando o usuário treina depois.

**Busca e fusão são separadas de propósito.** `placarPorMateria` é só o atalho `fundirPlacar(await carregarFontesPlacar(...))`:

| Função | O que é | Quando usar |
|---|---|---|
| `carregarFontesPlacar(supabase, userId, escopo)` | só I/O — devolve `{ attempts, simulado, subjectDaQuestao }` | quando a rota também precisa dos dados crus |
| `fundirPlacar(fontes, minTempoRespostaMs)` | **pura, zero I/O** — aplica o filtro de <3s e as duas contagens | sempre que já tiver as fontes |
| `placarPorMateria(supabase, userId, escopo)` | as duas juntas | quando só o placar interessa (`/api/treino`, `recomputarResultados`) |

A separação existe porque o `/api/dashboard` precisa das MESMAS quatro consultas (`question_attempts`, `simulado_attempts`, `simulado_respostas`, `questions`) para outros campos: sem ela, cada uma era feita duas ou três vezes na mesma requisição. `attempts` traz `created_at` justamente para que contagem por dia e "última prática por matéria" saiam de memória. **Rota que já tem `fontes` não pode chamar `placarPorMateria`** — chama `fundirPlacar`.

O `/api/dashboard` é a rota mais chamada do app (dashboard, treino, questões, perfil e calendário). Ela carrega as fontes **uma vez**, num `Promise.all` único junto de tudo que não depende de mais nada, e deriva o resto em memória — contagem de questões de hoje, tentativas de diagnóstico, total de simulados finalizados, desempenho por matéria e a última prática de cada matéria. Nenhuma delas deve voltar a ser query. Ela chama o placar no passo 5.5 e devolve: `resumo.totalRespondidas`/`taxaGeralAcerto` (treino avulso + respostas de simulado; brancos de simulado ficam de fora, e **o diagnóstico também** — ele é régua, não treino: sai nas 8 matérias mais pesadas em dificuldade média/difícil e o candidato faz frio no dia 1, então puxa a taxa pra baixo (36% contra 49% do treino) e com 16 questões dominaria o número de todo usuário novo. A agregação **por matéria** do passo 5.5 continua incluindo o diagnóstico — é ele que mede as matérias. `taxaGeralAcerto` vem **`null`** abaixo de `MIN_RESPOSTAS_TAXA_GERAL`; a tela mostra convite, nunca `0%`), `resumo.taxaSimulados` (nota de prova: acertos ÷ 80 por simulado, brancos contam contra — é a métrica do hero), `materiasPorBanda` (contagens **por banda**, só matérias `rotulavel` — alimenta a Agenda), `materiasRiscoCount` (**tamanho da lista de risco**, não a contagem por banda: com o rótulo exigindo amostra de treino, a contagem por banda é 0 pra quem só fez o diagnóstico e o card mostraria "0 disciplinas em risco" acima de uma lista com 4) e `materiasRisco` (top-5 da banda crítica, sem piso, cada uma com `rotulavel` — alimenta listas e recomendações, que precisam funcionar já no pós-diagnóstico).

Decisão de produto: o **hero do dashboard usa `taxaSimulados`**, não a geral — treino avulso não prevê a prova (o treino puxa de propósito pras piores matérias). A taxa geral fica no stat card "Taxa de acerto geral". Quem nunca finalizou um simulado vê um convite ("faça seu primeiro simulado") no lugar da métrica, nunca um 0%.

### Agenda inteligente — comportamento

`POST /api/calendario/gerar` apaga todos eventos `is_auto = true` da semana atual e recria do zero. A alocação respeita a disponibilidade do usuário (`user_availability`) — lógica em `lib/services/agenda.ts` (`gerarEventos`):
- **Simulado completo** (240 min): no dia disponível com o maior bloco contíguo livre. Sem disponibilidade configurada → quarta-feira.
- **Revisão geral** + treino de disciplina crítica: no último dia disponível da semana. Sem disponibilidade → domingo.
- **Demais dias**: 2 sessões/dia com alternância ponderada por desempenho (60% matérias críticas, 30% médias, 10% boas)

Sincroniza com Google Calendar se o usuário tiver conectado — operação best-effort (falha silenciosa, não bloqueia a geração).

### Fluxo de autenticação e onboarding

```
Cadastro: email/senha → OTP 6 dígitos no email → verifyOtp → onboarding modal
Google:   signInWithOAuth → /auth/callback → verifica onboarding_completed → dashboard
```

Onboarding (3 passos: welcome → data da prova → CTA do diagnóstico):
- **Os passos de nível, dificuldades e tempo diário foram removidos (jul/2026).** Coletavam dados sem nenhum leitor: `nivel` e `tempo_diario` nunca tiveram um consumidor, e `dificuldades` só servia ao diagnóstico antigo (escolhia 3 das 5 questões) — o Módulo 1 é blueprint fixo de 8 matérias vindo do `app_config`. Este wizard era o maior buraco de ativação medido: 33 de 57 usuários pararam nele
- `users.onboarding_data` **não é mais escrito**; a coluna fica com o histórico de quem já preencheu. Nada no app lê o conteúdo dela
- `POST /api/user/onboarding` aceita só `exam_date` e `completo`. `exam_date` (em `user_metadata`) só é tocado quando a chave vem no corpo — o save do passo da data não pode ser zerado por outro save
- `user_metadata.onboarding_completed = true` só com `completo: true`, mandado apenas no último passo — é o que impede o modal de reabrir
- `GET /api/user/onboarding` devolve `exam_date` + `completo`; o modal usa pra pré-preencher
- Enquanto `onboarding_completed` for falsy, `/dashboard` abre o modal automaticamente
- `temPerfilOnboarding` (no `/api/dashboard`) = `onboarding_completed`. Antes olhava `onboarding_data.dificuldades`, que o wizard não coleta mais — todo usuário novo daria falso e cairia no card de "usuário antigo sem perfil"
- O diagnóstico **não exige** onboarding nenhum

### Tabelas e views do banco (não óbvias pelo código)

| Nome | Tipo | Campos-chave | Propósito |
|---|---|---|---|
| `users` | tabela | `plano`, `role`, `stripe_customer_id`, `stripe_subscription_id` | Perfil e assinatura |
| `user_metadata` (Auth) | tabela | `full_name`, `onboarding_completed`, `exam_date` | Metadata no Supabase Auth |
| `desempenho_materia` | **view — CUIDADO: NÃO agrega** | `user_id`, `subject_id`, `acertos`, `total` | Verificado no banco (jul/2026): retorna **1 linha por `simulado_resposta`** (`total` é sempre 1) e **NÃO inclui `question_attempts`** (avulsas ficam de fora). Quem consome precisa agregar por matéria em código (`/api/calendario/gerar` faz isso). O `/api/dashboard` **não a lê mais** — busca as tabelas direto. Não aceita INSERT/UPDATE/DELETE |
| `materias_risco` | **view** | `user_id`, `subject_id`, `taxa` | Agregada por matéria, mas **só de respostas de simulado** e **sem filtro de risco** apesar do nome (traz até matéria com 100%). Usada só pelo treino (`/api/treino`, top 3). O dashboard não a usa mais |
| `question_attempts` | tabela | `user_id`, `created_at` | Base do limite diário de 10 questões (free) |
| `simulado_respostas` | tabela | vinculada a `simulado_attempts` via `attempt_id` | Respostas de simulados completos |
| `calendar_events` | tabela | `is_auto`, `google_event_id` | `is_auto=true` = gerado pela agenda inteligente |
| `google_calendar_tokens` | tabela | `access_token`, `refresh_token`, `expires_at` | Tokens criptografados AES-256-GCM |

### Instrumentação de produto (`user_events`)

`lib/events.ts` exporta `EVENTOS` e `track(userId, event, props)` — fire-and-forget via `supabaseAdmin`, nunca lança e nunca bloqueia a resposta. `user_events` tem RLS ligado **sem policies**: leitura e escrita só server-side.

**Regra do mapa `EVENTOS`: só entram chaves que têm ponto de emissão.** Chave definida que nunca grava é pior que chave ausente — quem lê o mapa monta métrica em cima do vazio. (Foi por isso que `diagnostico_modulo2_aberto` e `diagnostico_cta_clicado` saíram: o primeiro é redundante com `modulo_iniciado {modulo}`, o segundo virou o prop `origem` do `treino_iniciado`.)

Onde cada um emite:

| Evento | Onde | Props que importam |
|---|---|---|
| `diagnostico_modulo_iniciado` | `/api/diagnostico/sessao` | `modulo`, `total`, `repescagem` |
| `diagnostico_questao_respondida` | `/api/diagnostico/responder` | `modulo`, `posicao`, `time_spent_ms` |
| `diagnostico_modulo_concluido` | `/api/diagnostico/responder` | `modulo` |
| `diagnostico_lembrete_pedido` / `_enviado` | `/api/diagnostico/lembrete` e o cron | `modulo` |
| `treino_iniciado` | `/api/treino` (2 saídas de sucesso) | `quantidade` vs `servidas`, `risco`, `geral`, **`origem`** |
| `limite_diario_atingido` | `/api/treino` (2×) e `/api/simulados/resposta` | **`motivo`**: `teto` ou `treino_maior_que_restante`; `estado`, `dias_no_teto` |
| `parede_cta_clicado` | as telas, via `POST /api/eventos` | `estado`, `origem`, `destino`, `dias_no_teto` |

`parede_cta_clicado` é o **único** evento que nasce no cliente — o clique acontece antes de qualquer requisição. Por isso existe `lib/events-client.ts` (client-safe, sem `supabaseAdmin`) e a rota `/api/eventos`, que aceita **só** os nomes de `EVENTOS_DO_CLIENTE`: endpoint de escrita com nome livre deixaria qualquer usuário logado inventar métrica no painel. `lib/analytics.ts` (dataLayer do GTM) não serve pra isso — manda pro GA4, e a análise do produto sai do `/admin/metricas`, que lê `user_events`.

`origem` no `treino_iniciado` é como se mede o handoff diagnóstico → treino: o CTA da tela de resultado manda `?origem=diagnostico`. `servidas` separado de `quantidade` torna visível o treino que sai menor por falta de questão inédita.

### Métricas de ativação — `lib/services/metricas.ts` + `/admin/metricas`

`calcularMetricas(janelaDias)` é a fonte única dos funis; a rota `/api/admin/metricas` só valida a janela (7/14/30) e serve. Dois princípios que a página aplica:

- **Coorte-janela, nunca antes/depois.** "% que fez X dentro de N dias do cadastro", contando só usuários que já viveram a janela inteira. Comparar "total que já iniciou" entre grupos mede tempo de exposição, não comportamento.
- **Toda métrica declara a natureza.** `retroativa` = `question_attempts`/`diagnostic_sessions`/`users`, vale desde sempre. `prospectiva` = `user_events`, vale desde o deploy da Fase D. A UI mostra o selo ("histórico completo" / "desde \<data\>") porque sem ele um `0` lê como fracasso do produto quando significa "a instrumentação começou ontem".

Todas as contagens descartam respostas com `time_spent_ms < minTempoRespostaMs`, e o descarte aparece como número próprio. O bucket por dia usa `ymdBrasil` — em UTC as respostas migram de dia e a métrica do limite diário falseia.

**Limite diário separa free de Pro obrigatoriamente:** Pro não tem teto, então para ele "10" é uso e não limite. A distribuição do Pro **acima** do teto é a estimativa de demanda reprimida (verificado jul/2026: média de 19 questões/dia contra o teto de 10). Ressalva registrada na própria página: `users.plano` é estado atual, então quem hoje é Pro mas bateu o teto quando era free entra classificado como Pro.

`scripts/ativacao.mjs` **não** foi substituído: ele congela a baseline da Fase 0 e a coorte dos 33 usuários destravados. A página é o painel vivo; o script é o retrato de comparação.

### Sistema admin

- `role = "admin"` → acesso ao painel `/admin` (questões, usuários, feedback)
- `role = "blocked"` → `requireUser()` retorna 403 antes de qualquer lógica de negócio
- Role é alterado via `PUT /api/admin/usuarios/[id]`

### Estrutura de páginas

- `app/page.tsx` — landing page, monta componentes de `components/landing/`
- `app/dashboard/` — área logada: questões, simulados, treino, calendário, desempenho, perfil
- `app/admin/` — painel admin: questões, usuários, feedback (protegido por `requireAdmin`)
- `app/api/` — todas as rotas de API

### Google Calendar

Integração OAuth em `lib/services/googleCalendar.ts`. Tokens de acesso são criptografados com AES-256-GCM via `lib/crypto.ts` antes de salvar no banco (`TOKEN_ENCRYPTION_KEY` no env). Refresh automático quando token expira em menos de 5 minutos.

### Variáveis de ambiente obrigatórias

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
TOKEN_ENCRYPTION_KEY
NEXT_PUBLIC_APP_URL
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PRO
STRIPE_PRICE_APROVACAO
```

Valores ficam em `.env.local` (ignorado pelo git via `.gitignore`). Em produção, estão no painel do Vercel.
