-- Adiciona campo JSONB pra perfil coletado no onboarding estendido.
-- NULL = usuário antigo que não passou pelo novo fluxo.
-- Estrutura: { nivel, dificuldades[], tempo_diario, completed_at }

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS onboarding_data JSONB;
