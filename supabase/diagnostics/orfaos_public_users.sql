-- ============================================================================
-- auth.users x public.users: quem sobra de cada lado, e por quê
-- ============================================================================
-- READ-ONLY. Rode no SQL Editor do Supabase e me mande a saída.
--
-- É UMA CONSULTA SÓ, de propósito: o editor do Supabase mostra apenas o
-- resultado da ÚLTIMA instrução quando se roda várias de uma vez. A primeira
-- versão deste arquivo tinha quatro SELECTs e devolvia só o placar — as três
-- respostas que interessavam ficaram invisíveis.
--
-- É o sentido CONTRÁRIO ao de investigar_orfao.sql, mais os dois lados juntos.
--
-- Medido em 18/ago/2026, criando e apagando uma conta de teste pela admin API:
--   deleteUser(id)  -> sem erro
--   getUserById(id) -> não existe mais
--   public.users    -> a linha CONTINUA lá
--
-- Duas perguntas motivaram este arquivo, e RODADO EM 31/ago/2026 ele respondeu
-- as duas. Ficam aqui as respostas, porque são o motivo de a coisa acontecer:
--   (a) existe FK entre as duas tabelas?  NÃO. A única FK de public.users é
--       users_turma_id_fkey -> turmas. Nada liga public.users.id a auth.users.id,
--       e é por isso que o delete no Auth passou sem erro: não havia restrição
--       para violar.
--   (b) o handle_new_user cobre DELETE?  NÃO. Existem dois triggers, os dois em
--       auth.users: on_auth_user_created (AFTER INSERT) e
--       on_auth_user_email_confirmed (AFTER UPDATE). Nenhum em public.users.
--
-- Ou seja: criar conta insere no público; apagar no Auth não faz nada. A linha
-- fica órfã em silêncio. Continua valendo rodar de novo -- é o placar que diz se
-- voltou a acontecer.
--
-- Por que importa: lib/services/metricas.ts lê public.users inteiro e só filtra
-- role <> 'admin'. Cada linha órfã entra no DENOMINADOR de todo funil do
-- /admin/metricas como alguém que se cadastrou e nunca fez nada. No sentido
-- oposto, quem está no Auth sem linha no público some das métricas e do
-- relatório de turma -- sem quebrar nada, porque requireUser cai em plano
-- "free" e o /api/dashboard lê a linha com `?.` e `??`.

SELECT jsonb_pretty(jsonb_build_object(

  'placar', (
    SELECT jsonb_build_object(
      'contas_no_auth',    (SELECT count(*) FROM auth.users),
      'linhas_no_publico', (SELECT count(*) FROM public.users),
      'orfas_no_publico',  (SELECT count(*) FROM public.users pu
                              LEFT JOIN auth.users au ON au.id = pu.id
                             WHERE au.id IS NULL),
      'orfas_no_auth',     (SELECT count(*) FROM auth.users au
                              LEFT JOIN public.users pu ON pu.id = au.id
                             WHERE pu.id IS NULL)
    )
  ),

  -- (a) A PERGUNTA PRINCIPAL. Lista vazia = não existe FK, e é a explicação
  -- mais provável para o delete no Auth passar sem erro e sem levar a linha.
  -- confdeltype: a=NO ACTION, r=RESTRICT, c=CASCADE, n=SET NULL, d=SET DEFAULT
  'fks_de_public_users', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'nome',      con.conname,
             'on_delete', con.confdeltype::text,
             'definicao', pg_get_constraintdef(con.oid)
           ) ORDER BY con.conname), '[]'::jsonb)
    FROM pg_constraint con
    JOIN pg_class     tbl ON tbl.oid = con.conrelid
    WHERE tbl.relnamespace = 'public'::regnamespace
      AND tbl.relname = 'users'
      AND con.contype = 'f'
  ),

  -- (b) Triggers nas duas pontas: o handle_new_user cobre DELETE também?
  'triggers', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'tabela',    c.relnamespace::regnamespace::text || '.' || c.relname,
             'nome',      t.tgname,
             'definicao', pg_get_triggerdef(t.oid)
           ) ORDER BY c.relname, t.tgname), '[]'::jsonb)
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE NOT t.tgisinternal
      AND c.relname = 'users'
      AND c.relnamespace IN ('auth'::regnamespace, 'public'::regnamespace)
  ),

  -- Linha no público sem conta no Auth. `respostas`/`simulados` decidem se dá
  -- para apagar: se houver atividade, apagar a linha deixa o histórico órfão.
  'orfas_no_publico', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'id',         pu.id,
             'email',      pu.email,
             'criada_em',  pu.created_at,
             'role',       pu.role,
             'plano',      pu.plano,
             'respostas',  (SELECT count(*) FROM public.question_attempts qa WHERE qa.user_id = pu.id),
             'simulados',  (SELECT count(*) FROM public.simulado_attempts sa WHERE sa.user_id = pu.id)
           ) ORDER BY pu.created_at), '[]'::jsonb)
    FROM public.users pu
    LEFT JOIN auth.users au ON au.id = pu.id
    WHERE au.id IS NULL
  ),

  -- Conta no Auth sem linha no público: entra pelo app, mas some das métricas.
  'orfas_no_auth', (
    SELECT coalesce(jsonb_agg(jsonb_build_object(
             'id',              au.id,
             'email',           au.email,
             'criada_em',       au.created_at,
             'email_confirmado', (au.email_confirmed_at IS NOT NULL),
             'ultimo_login',    au.last_sign_in_at,
             'provedores',      au.raw_app_meta_data->'providers'
           ) ORDER BY au.created_at), '[]'::jsonb)
    FROM auth.users au
    LEFT JOIN public.users pu ON pu.id = au.id
    WHERE pu.id IS NULL
  )

)) AS diagnostico;
