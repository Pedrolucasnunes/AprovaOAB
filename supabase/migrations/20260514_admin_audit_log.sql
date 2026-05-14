-- Trilha de auditoria para mudanças de role/plano feitas pelo admin.
-- before/after em JSONB permite expandir o action no futuro sem migration.

CREATE TABLE admin_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id        UUID NOT NULL,
  target_user_id  UUID NOT NULL,
  action          TEXT NOT NULL,
  before          JSONB,
  after           JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_audit_admin  ON admin_audit_log(admin_id, created_at DESC);
CREATE INDEX idx_admin_audit_target ON admin_audit_log(target_user_id, created_at DESC);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
