-- Schema do diagnóstico modular (Fase A). Puramente aditivo: nenhuma coluna
-- existente muda de tipo ou de significado, e nada aqui altera comportamento —
-- as rotas só passam a usar estas tabelas na Fase B.

-- De qual módulo veio a tentativa. As 130 tentativas históricas viram 'm0'
-- (o diagnóstico legado de 5 questões), que a tela de resultado vai mostrar
-- como medição de baixa confiança em vez de descartar.
ALTER TABLE question_attempts ADD COLUMN IF NOT EXISTS diagnostic_module TEXT;

UPDATE question_attempts
   SET diagnostic_module = 'm0'
 WHERE is_diagnostic = TRUE
   AND diagnostic_module IS NULL;

-- Sessão retomável. O conjunto de questões é sorteado UMA vez e persistido:
-- é isso que faz "parei na questão 12" voltar nas mesmas 16, em vez de
-- ressortear a cada montagem como o /api/diagnostico/gerar faz hoje.
CREATE TABLE diagnostic_sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modulo       TEXT NOT NULL,
  question_ids UUID[] NOT NULL,
  posicao      INT NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'em_andamento',
  started_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT diagnostic_sessions_user_modulo_key UNIQUE (user_id, modulo),
  CONSTRAINT diagnostic_sessions_status_check
    CHECK (status IN ('em_andamento', 'concluida', 'abandonada'))
);

CREATE INDEX idx_diagnostic_sessions_user ON diagnostic_sessions(user_id);

-- Resultado por matéria. ESTA TABELA É A DISTINÇÃO "medida" vs "não medida":
-- linha existe = matéria medida. Sem linha = não medida. Nunca inferir por
-- ausência de tentativas — hoje o treino faz isso e não consegue separar
-- "matéria ruim" de "matéria que nunca perguntamos".
--
-- `descartadas` conta as respostas abaixo de minTempoRespostaMs, que ficam fora
-- de acertos/total. Se TODAS as respostas de uma matéria forem descartadas, a
-- Fase B não escreve linha nenhuma — a matéria continua não medida, que é a
-- verdade.
CREATE TABLE diagnostic_subject_results (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id  UUID NOT NULL REFERENCES subjects(id),
  modulo      TEXT NOT NULL,
  acertos     INT NOT NULL DEFAULT 0,
  total       INT NOT NULL DEFAULT 0,
  descartadas INT NOT NULL DEFAULT 0,
  measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, subject_id),
  CONSTRAINT diagnostic_subject_results_total_check CHECK (total > 0)
);

-- Instrumentação. Hoje o app não registra um único clique; toda a análise de
-- ativação sai de inferência sobre question_attempts.
CREATE TABLE user_events (
  id         BIGSERIAL PRIMARY KEY,
  user_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event      TEXT NOT NULL,
  props      JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_events_event ON user_events(event, created_at DESC);
CREATE INDEX idx_user_events_user  ON user_events(user_id, created_at DESC);

ALTER TABLE diagnostic_sessions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_subject_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_events                ENABLE ROW LEVEL SECURITY;
