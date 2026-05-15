-- Bug: DEFAULT 0 nas colunas de nota fazia simulados recém-gerados parecerem "finalizados".
-- O código usa "coluna de nota não-nula" como sinal de simulado finalizado;
-- um simulado fresco precisa ter NULL nessas colunas.

ALTER TABLE simulados ALTER COLUMN acertos    DROP DEFAULT;
ALTER TABLE simulados ALTER COLUMN erros      DROP DEFAULT;
ALTER TABLE simulados ALTER COLUMN percentual DROP DEFAULT;

-- Limpeza defensiva: "des-finaliza" simulados sem nenhuma resposta registrada.
-- finalizar/route.ts já recusa 0 respostas, então "sem respostas" = nunca finalizado.
UPDATE simulados s
SET acertos = NULL, erros = NULL, percentual = NULL
WHERE acertos IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM simulado_attempts a
    JOIN simulado_respostas r ON r.attempt_id = a.id
    WHERE a.simulado_id = s.id
  );
