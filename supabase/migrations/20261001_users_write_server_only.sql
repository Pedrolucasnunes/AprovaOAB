-- public.users: escrita somente por service role (webhook do Stripe e admin),
-- no mesmo desenho de `turmas` e `user_events` — RLS ligado, escrita server-only.
-- O SELECT do cliente permanece: as telas de perfil e simulados leem a própria linha.

REVOKE INSERT, UPDATE, DELETE ON public.users FROM anon, authenticated;

DROP POLICY IF EXISTS "users: update"                     ON public.users;
DROP POLICY IF EXISTS "usuarios atualizam proprio perfil" ON public.users;
DROP POLICY IF EXISTS "admin altera qualquer usuario"     ON public.users;

-- Uma linha por stripe_customer_id, que é a chave do usuário no webhook do Stripe.
-- NULL repetido é permitido pelo Postgres: contas sem Stripe não são afetadas.
-- Guardado porque o constraint já foi aplicado à mão em produção — sem a guarda,
-- um `db push` futuro tentaria recriá-lo e abortaria.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_stripe_customer_id_key'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_stripe_customer_id_key UNIQUE (stripe_customer_id);
  END IF;
END $$;
