-- public.questions: o cliente (anon e authenticated) lê o enunciado, as
-- alternativas e o gabarito, mas não a resolução. `explicacao` só sai por rota
-- de servidor (supabaseAdmin), que decide quando a pessoa pode vê-la.
--
-- O grant é por coluna, e isso tem duas consequências para quem escreve código:
--   * `select('*')` em questions pelo cliente falha com 42501. Liste as colunas.
--   * Coluna nova em questions nasce invisível para o cliente até entrar no
--     GRANT abaixo.

REVOKE SELECT ON public.questions FROM anon, authenticated;

GRANT SELECT (
  id, banca, ano, dificuldade, incidencia_prova, enunciado,
  alternativa_a, alternativa_b, alternativa_c, alternativa_d,
  resposta_correta, created_at, subject_id, topic_id
) ON public.questions TO anon, authenticated;
