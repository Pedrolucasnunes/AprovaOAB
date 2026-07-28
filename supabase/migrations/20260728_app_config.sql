-- Configuração de runtime editável sem deploy (Fase A do diagnóstico modular).
-- Lida só server-side via supabaseAdmin: RLS ligado e sem policies = ninguém
-- alcança pelo anon key, igual admin_audit_log.

CREATE TABLE app_config (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

-- Seed do diagnóstico.
--
-- Os subject_id são resolvidos POR NOME aqui dentro, com guard que aborta se a
-- contagem não bater. Motivo: já queimamos duas vezes com nome de matéria errado
-- silenciosamente não casando com nada — `BASELINE_SUBJECTS = ["Ética", ...]` no
-- diagnóstico (o nome real é "Ética Profissional") e a lista de exclusão do
-- termômetro da newsletter. Nos dois casos o `IN (...)` não deu erro: só devolveu
-- menos linhas e o código seguiu com um conjunto errado. O RAISE abaixo troca
-- falha silenciosa por falha barulhenta.
--
-- Módulo 1 = as 8 matérias mais pesadas nas 9 edições mais recentes (XXXVII-XLV),
-- que valem 62,6% da prova. Difere da média histórica das 27 edições em um ponto:
-- Processo do Trabalho (7,0%) passou Direito do Trabalho (5,6%).
DO $$
DECLARE
  v_m1        UUID[];
  v_m2        UUID[];
  v_nomes_m1  TEXT[] := ARRAY[
    'Ética Profissional',
    'Direito Penal',
    'Direito Constitucional',
    'Direito Civil',
    'Processo Civil',
    'Processo do Trabalho',
    'Processo Penal',
    'Direito Administrativo'
  ];
BEGIN
  SELECT array_agg(id ORDER BY array_position(v_nomes_m1, name))
    INTO v_m1
    FROM subjects
   WHERE name = ANY(v_nomes_m1);

  IF COALESCE(array_length(v_m1, 1), 0) <> array_length(v_nomes_m1, 1) THEN
    RAISE EXCEPTION
      'Modulo 1: esperava % materias, resolvi %. Rode "SELECT name FROM subjects ORDER BY name" e confira os nomes exatos.',
      array_length(v_nomes_m1, 1), COALESCE(array_length(v_m1, 1), 0);
  END IF;

  -- Módulo 2 = todo o resto, seja lá quantas forem.
  SELECT array_agg(id ORDER BY name)
    INTO v_m2
    FROM subjects
   WHERE NOT (name = ANY(v_nomes_m1));

  IF COALESCE(array_length(v_m2, 1), 0) = 0 THEN
    RAISE EXCEPTION 'Modulo 2 ficou vazio — a tabela subjects tem só as 8 do Modulo 1?';
  END IF;

  RAISE NOTICE 'Modulo 1: % materias | Modulo 2: % materias',
    array_length(v_m1, 1), array_length(v_m2, 1);

  INSERT INTO app_config (key, value)
  VALUES (
    'diagnostico',
    jsonb_build_object(
      'modulos', jsonb_build_array(
        jsonb_build_object(
          'id',                 'm1',
          'label',              'Módulo 1',
          'questoesPorMateria', 2,
          'subjects',           to_jsonb(v_m1),
          'dificuldades',       jsonb_build_array('medio', 'dificil')
        ),
        jsonb_build_object(
          'id',                 'm2',
          'label',              'Módulo 2',
          'questoesPorMateria', 1,
          'subjects',           to_jsonb(v_m2),
          'dificuldades',       jsonb_build_array('medio')
        )
      ),
      -- ~40% do banco tem explicacao NULL; o diagnóstico mostra a explicação
      -- depois de cada resposta, então o pool dele exclui essas.
      'exigirExplicacao',   true,
      -- Abaixo disso é clique, não resposta: essas acertam 15% contra os 25%
      -- do chute puro. Ficam fora do mapa por matéria e das métricas.
      'minTempoRespostaMs', 3000,
      -- Janela de edições usada pra calcular a cobertura % da tela de resultado.
      'janelaEdicoes',      9
    )
  )
  ON CONFLICT (key) DO NOTHING;
END $$;

-- Limite diário do plano Free. Valor continua 10 — só deixa de ser hardcode.
INSERT INTO app_config (key, value)
VALUES ('limites', jsonb_build_object('freeDailyLimit', 10))
ON CONFLICT (key) DO NOTHING;
