-- Turmas — marcar de qual parceria institucional o aluno veio.
--
-- Motivação: o piloto com a coordenação de Direito da UNP (ago/2026) promete um
-- relatório AGREGADO da turma. Sem uma marca no cadastro não existe nenhuma
-- forma de separar "os formandos da UNP" do resto da base, e o relatório não
-- pode ser gerado. Medido antes de escolher o mecanismo: e-mail institucional
-- não serve (3 de 75 contas usam domínio de faculdade, 61 usam Gmail) e janela
-- de data não serve (os deploys de SEO existem justamente pra aumentar cadastro
-- orgânico, que cairia dentro da mesma janela).
--
-- LGPD: a marca é INTERNA. A instituição não recebe acesso ao banco, não vê
-- nome de aluno e não tem tela. O único consumidor é `scripts/turma-relatorio.mjs`,
-- que imprime exclusivamente agregados.

CREATE TABLE IF NOT EXISTS public.turmas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        text NOT NULL UNIQUE,
  instituicao text NOT NULL,
  rotulo      text NOT NULL,
  aberta_ate  date,
  created_at  timestamptz NOT NULL DEFAULT now(),

  -- O slug vira URL (/turma/unp) e argumento de script. Restringir aqui evita
  -- que um cadastro com espaço ou maiúscula gere um link que nunca casa.
  CONSTRAINT turmas_slug_formato CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,39}$')
);

COMMENT ON TABLE public.turmas IS
  'Parcerias institucionais. Uma linha por turma que recebe link próprio de '
  'cadastro. Server-only: RLS ligado sem policies, como user_events.';

COMMENT ON COLUMN public.turmas.slug IS
  'Identificador na URL: /turma/<slug> ou ?turma=<slug>.';

COMMENT ON COLUMN public.turmas.rotulo IS
  'Como a turma aparece no cabeçalho do relatório (ex.: "Formandos 2026.2").';

-- A trava que impede o link de recrutar gente pra "turma UNP" em novembro,
-- meses depois de o relatório ter sido entregue e do link ter sido esquecido
-- num grupo de WhatsApp. NULL = sem prazo (usar só em turma perene).
-- Comparada com a data de Brasília, nunca com now() cru: um link que fecha
-- "às 21h de ontem" pra quem clica de madrugada é bug difícil de enxergar.
COMMENT ON COLUMN public.turmas.aberta_ate IS
  'Último dia (fuso de Brasília) em que o link ainda marca quem se cadastra. '
  'NULL = sem prazo. Depois dessa data o cadastro acontece normalmente, apenas '
  'sem entrar na turma.';

ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS turma_id uuid REFERENCES public.turmas(id) ON DELETE SET NULL;

-- Índice parcial: quem consulta quer a turma inteira, que é pequena contra a
-- tabela toda. Mesmo padrão de users_email_optout_at_idx.
CREATE INDEX IF NOT EXISTS users_turma_id_idx
  ON public.users (turma_id)
  WHERE turma_id IS NOT NULL;

COMMENT ON COLUMN public.users.turma_id IS
  'Turma pela qual o aluno chegou. Gravado UMA ÚNICA VEZ, no cadastro, a partir '
  'de um cookie assinado pelo link institucional — nunca sobrescrito, pra que '
  'um link compartilhado depois não mova o aluno de turma. Não muda nada na '
  'experiência do aluno: não há tela, badge ou conteúdo diferente.';

-- A turma do piloto. `aberta_ate` cobre com folga a reunião de 20/ago e a
-- semana seguinte de coleta; estender é um UPDATE de uma linha.
INSERT INTO public.turmas (slug, instituicao, rotulo, aberta_ate)
VALUES ('unp', 'UNP — Universidade Potiguar', 'Formandos de Direito', '2026-09-30')
ON CONFLICT (slug) DO NOTHING;
