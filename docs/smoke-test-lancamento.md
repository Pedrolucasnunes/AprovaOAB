# Smoke test do funil do aluno novo — antes do dia 1

Percorrer **ponta a ponta** com uma conta de teste antes de abrir a campanha.
Stripe em modo teste: cartão `4242 4242 4242 4242`, validade futura, CVC qualquer.

> Dica: faça com a aba **Network** (DevTools) aberta pra ver as respostas das rotas.

## 1. Cadastro + verificação de e-mail
- [ ] `/cadastro`: criar conta com e-mail real (ou alias `+teste`). Senha com maiúscula + número.
- [ ] Chega o e-mail com OTP de 6 dígitos (checar inclusive spam).
- [ ] OTP válido → redireciona pro dashboard com onboarding.
- [ ] **Erro esperado tratado:** tentar cadastrar e-mail já existente → mensagem clara ("já cadastrado"), não 500.

## 2. Onboarding
- [ ] Modal abre automaticamente no primeiro acesso.
- [ ] Preencher os 3 passos (nível → dificuldades → tempo) + data da prova → conclui e some.
- [ ] Recarregar a página: modal **não** reaparece (onboarding_completed = true).
- [ ] **Sanidade do trigger:** confirmar no Supabase que existe linha em `public.users` para essa conta, com `plano = 'free'`.

## 3. Limite diário do plano free (o gate mais sensível)
- [ ] Responder questões no treino avulso / banco de questões.
- [ ] Na **10ª** resposta: ainda passa.
- [ ] Na **11ª**: bloqueia com mensagem de limite + CTA de upgrade (status 403, `limiteDiario: true`).
- [ ] Pedir um treino de 30 questões com poucas restantes → bloqueia explicando quantas restam.

## 4. Upgrade → pagamento → vira Pro
- [ ] Clicar no CTA de upgrade → `/checkout` Stripe abre.
- [ ] Pagar com cartão de teste `4242...` → redireciona de volta com sucesso.
- [ ] Em segundos, plano vira **Pro** (webhook processou). Conferir em `/dashboard/perfil`.
- [ ] No Supabase: `users.plano = 'pro'`, `stripe_subscription_id` e `subscription_status = 'active'` preenchidos.
- [ ] **Idempotência:** reenviar o mesmo evento no painel do Stripe (Resend) não deve duplicar nada.

## 5. Recursos Pro liberados
- [ ] Limite diário some (responder mais de 10 questões sem bloqueio).
- [ ] Gerar **simulado completo (80 questões)** → cria sem erro (free recebe 403 `upgrade`).
- [ ] Responder algumas → o limite diário **não** dispara para Pro.

## 6. Performance percebida (olho no relógio)
- [ ] Landing (`/`) carrega rápido em conexão móvel / 3G simulado.
- [ ] Dashboard e geração de treino respondem em < 1-2s.
- [ ] Se algo arrastar: rodar `EXPLAIN ANALYZE` nas queries quentes e confirmar `Index Scan`
      após aplicar `20260529_launch_perf_indexes.sql`.

## 7. Cancelamento (opcional, mas bom confirmar)
- [ ] Cancelar assinatura → webhook `customer.subscription.deleted` → volta pra `free`.
- [ ] Recursos Pro voltam a ser bloqueados.

---
**Pré-requisitos de infra (conferir no painel, não no repo):**
- Rodar `supabase/diagnostics/launch_readiness.sql` e revisar a saída (trigger, índices, RLS).
- Aplicar `supabase/migrations/20260529_launch_perf_indexes.sql`.
- Confirmar variáveis de ambiente de produção no Vercel (Stripe, Supabase, Upstash, Resend).
