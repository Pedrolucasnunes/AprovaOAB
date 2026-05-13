-- Captura sinais qualitativos por resposta pra alimentar o diagnóstico progressivo.
-- is_diagnostic flag isola as 5 questões do onboarding (não conta no limite diário do free).
-- time_spent_ms permite NULL pra registros antigos pré-migration.

ALTER TABLE public.question_attempts
  ADD COLUMN IF NOT EXISTS time_spent_ms INT,
  ADD COLUMN IF NOT EXISTS changed_answer BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_diagnostic BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS question_attempts_is_diagnostic_idx
  ON public.question_attempts (user_id, is_diagnostic)
  WHERE is_diagnostic = true;
