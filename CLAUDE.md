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

### Supabase — dois clientes distintos

| Cliente | Arquivo | Quando usar |
|---|---|---|
| Browser (anon key) | `createBrowserClient(...)` inline nos componentes | Componentes client-side |
| Admin (service role) | `lib/supabase-admin.ts` → `supabaseAdmin` | Rotas API server-side que precisam ignorar RLS |

O cliente browser respeita RLS. O `supabaseAdmin` ignora RLS completamente — usar **apenas em rotas `/api/`**, nunca em código client-side.

### Autenticação nas rotas API

Todas as rotas protegidas usam os guards de `lib/auth-server.ts`:

```ts
// Usuário comum
const { user, supabase, error } = await requireUser()
if (error) return error

// Admin
const { user, error } = await requireAdmin()
if (error) return error
```

`requireUser()` também bloqueia contas com `role = "blocked"`. `requireAdmin()` exige `role = "admin"` na tabela `users`.

### Tabela `users` (Supabase)

Campos relevantes além do Auth padrão:
- `role`: `"free"` | `"blocked"` | `"admin"`
- `plano`: `"free"` | `"pro"` | `"aprovacao"`
- `stripe_customer_id`: string | null
- `stripe_subscription_id`: string | null

O campo `plano` é atualizado **exclusivamente pelo webhook do Stripe** (`/api/stripe/webhook`), nunca diretamente pelo cliente.

### Stripe

- Webhook em `/api/stripe/webhook` — valida assinatura com `stripe.webhooks.constructEvent` antes de processar qualquer evento
- Eventos tratados: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- `lib/stripe.ts` exporta instância singleton do cliente Stripe

Planos live:
- Pro: `STRIPE_PRICE_PRO` (R$ 19/mês, promocional — preço real R$ 29)
- Aprovação: `STRIPE_PRICE_APROVACAO` (R$ 49/mês)

### Regras de negócio por plano

| Funcionalidade | Free | Pro | Aprovação |
|---|---|---|---|
| Questões (treino avulso) | 10/dia | Ilimitado | Ilimitado |
| Treino inteligente | ✅ | ✅ | ✅ |
| Simulados completos (80 questões) | ❌ | ✅ | ✅ |
| Tutor IA | ❌ | Limitado | Ilimitado |

**Onde o gate está no código:**
- Limite diário free: verificado em `app/api/simulados/resposta/route.ts` (não em `/api/questions`). Conta registros em `question_attempts` de hoje (UTC). Retorna `{ error, limiteDiario: true }` com status 403 ao atingir 10.
- Simulados: gate em `app/api/simulados/gerar/route.ts` — verifica `users.plano === "free"` e retorna 403 com `{ upgrade: true }`.

### Treino inteligente — algoritmo

Não óbvio sem ler o código (`app/api/treino/route.ts`):
- **70%** das questões vêm das top 3 matérias com menor taxa de acerto (tabela `desempenho_materia`)
- **30%** são questões gerais
- Exclui questões já acertadas anteriormente (simulados + treino avulso)
- Quantidades aceitas: 10, 20 ou 30 (padrão: 10)

### Agenda inteligente — comportamento

`POST /api/calendario/gerar` apaga todos eventos `is_auto = true` da semana atual e recria do zero. Estrutura fixa:
- **Quarta-feira**: simulado completo (240 min)
- **Domingo**: treino disciplina crítica + revisão geral
- **Demais dias**: alternância ponderada por desempenho (60% matérias críticas, 30% médias, 10% boas)

Sincroniza com Google Calendar se o usuário tiver conectado — operação best-effort (falha silenciosa, não bloqueia a geração).

### Fluxo de autenticação e onboarding

```
Cadastro: email/senha → OTP 6 dígitos no email → verifyOtp → onboarding modal
Google:   signInWithOAuth → /auth/callback → verifica onboarding_completed → dashboard
```

Onboarding (3 passos: welcome → data da prova OAB → concluído):
- `POST /api/user/onboarding` seta `user_metadata.onboarding_completed = true` e `exam_date`
- Enquanto `onboarding_completed` for falsy, `/dashboard` abre o modal automaticamente

### Tabelas do banco (não óbvias pelo código)

| Tabela | Campos-chave | Propósito |
|---|---|---|
| `users` | `plano`, `role`, `stripe_customer_id`, `stripe_subscription_id` | Perfil e assinatura |
| `user_metadata` (Auth) | `full_name`, `onboarding_completed`, `exam_date` | Metadata no Supabase Auth |
| `desempenho_materia` | `user_id`, `subject_id`, `acertos`, `total` | Base do treino inteligente e dashboard |
| `question_attempts` | `user_id`, `created_at` | Base do limite diário de 10 questões (free) |
| `simulado_respostas` | vinculada a `simulados` | Respostas de simulados completos |
| `calendar_events` | `is_auto`, `google_event_id` | `is_auto=true` = gerado pela agenda inteligente |
| `google_calendar_tokens` | `access_token`, `refresh_token`, `expires_at` | Tokens criptografados AES-256-GCM |

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
