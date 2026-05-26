-- Trial gratuito de 7 dias do plano Pro.
-- trial_used:   impede que o mesmo user_id faça trial duas vezes.
-- trial_ends_at: usado pela UI ("trial termina em X dias") e setado pelo webhook
--                quando recebe customer.subscription.* com status = "trialing".

ALTER TABLE users
  ADD COLUMN trial_used BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN trial_ends_at TIMESTAMPTZ NULL;

-- Usuários atuais Pro/Aprovação não são elegíveis a trial.
UPDATE users
  SET trial_used = TRUE
  WHERE plano <> 'free' OR stripe_subscription_id IS NOT NULL;

-- subscription_status atual permite só active/past_due/canceled.
-- Trial precisa de um estado próprio pro UI mostrar "trial ativo".
ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_subscription_status_check;

ALTER TABLE users
  ADD CONSTRAINT users_subscription_status_check
  CHECK (subscription_status IN ('active', 'trialing', 'past_due', 'canceled'));
