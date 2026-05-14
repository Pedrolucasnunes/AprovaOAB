-- Idempotência do webhook Stripe: registra cada event.id processado.
-- Stripe pode reenviar eventos quando o endpoint demora ou retorna erro.
-- Sem essa tabela, cada retry reaplicava o UPDATE no users.

CREATE TABLE stripe_events_processed (
  event_id   TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stripe_events_created ON stripe_events_processed(created_at DESC);

ALTER TABLE stripe_events_processed ENABLE ROW LEVEL SECURITY;
