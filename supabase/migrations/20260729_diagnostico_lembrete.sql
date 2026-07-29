-- Lembrete do Módulo 2 do diagnóstico.
--
-- O botão "Me lembra amanhã" da tela de resultado era um link pro dashboard:
-- não lembrava ninguém de nada. Numa tela cujo argumento inteiro é honestidade
-- sobre o que foi e o que não foi medido, era o único elemento que mentia.
--
-- Por que e-mail e não só um card no dashboard: o card só funciona pra quem
-- volta, e "não volta" é exatamente o problema que estamos resolvendo. O card
-- entra também (entry point persistente), mas ele não substitui o alcance.
--
-- timestamptz aqui, ao contrário das colunas antigas de `users` que são
-- timestamp sem offset (armadilha documentada no CLAUDE.md). O cron compara
-- contra now(), então offset explícito evita erro de 3h.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS diagnostic_reminder_at timestamptz;

-- Índice parcial: o cron busca só as linhas pendentes, que são pouquíssimas
-- contra a tabela inteira. NULL = sem lembrete pedido (o estado da maioria).
CREATE INDEX IF NOT EXISTS users_diagnostic_reminder_at_idx
  ON public.users (diagnostic_reminder_at)
  WHERE diagnostic_reminder_at IS NOT NULL;
