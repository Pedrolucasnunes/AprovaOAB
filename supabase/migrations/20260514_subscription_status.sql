-- Grace period quando cartão falha: marca past_due em vez de derrubar plano.
-- Stripe retenta cobrança ~3-5 dias; só derrubamos no customer.subscription.deleted.

ALTER TABLE users
  ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'active'
  CHECK (subscription_status IN ('active', 'past_due', 'canceled'));

CREATE INDEX idx_users_subscription_status
  ON users(subscription_status)
  WHERE subscription_status <> 'active';
