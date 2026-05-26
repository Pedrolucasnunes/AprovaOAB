-- Reflete cancel_at_period_end do Stripe pra UI mostrar "trial encerra em X · sem cobrança"
-- em vez de "cobrança em X" quando o usuário cancela durante o trial.

ALTER TABLE users
  ADD COLUMN cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE;
