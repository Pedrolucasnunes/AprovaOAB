-- ============================================================================
-- Diagnóstico de prontidão para lançamento — AprovaOAB (campanha 1º de junho)
-- ============================================================================
-- READ-ONLY. Não altera nada. Rode no SQL Editor do Supabase e cole a saída.
--
-- Objetivo: confirmar o que NÃO está versionado no repositório (a schema base,
-- triggers e views vivem direto no Supabase). Cada bloco imprime um rótulo na
-- coluna "check" pra facilitar a leitura.
-- ============================================================================


-- 1) TRIGGER QUE CRIA A LINHA EM public.users AO CADASTRAR -------------------
-- Nenhum código do app insere em public.users; isso é feito por um trigger em
-- auth.users (tipicamente "on_auth_user_created" -> handle_new_user()).
-- Se este bloco vier VAZIO, novos cadastros NÃO criam users -> app quebra.
SELECT
  '1. trigger auth.users -> public.users' AS check,
  t.tgname        AS trigger_name,
  p.proname       AS function_name,
  n.nspname       AS function_schema
FROM pg_trigger t
JOIN pg_class c       ON c.oid = t.tgrelid
JOIN pg_namespace cn  ON cn.oid = c.relnamespace
JOIN pg_proc p        ON p.oid = t.tgfoid
JOIN pg_namespace n   ON n.oid = p.pronamespace
WHERE cn.nspname = 'auth'
  AND c.relname  = 'users'
  AND NOT t.tgisinternal;


-- 1b) CORPO DA FUNÇÃO DO TRIGGER (confirma defaults plano='free' / role) -----
-- Procure por: INSERT INTO public.users ... plano, role.
SELECT
  '1b. corpo da function handle_new_user' AS check,
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS definition
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname ILIKE '%handle_new_user%';


-- 2) ÍNDICES NAS TABELAS QUENTES --------------------------------------------
-- Confira se já existem índices cobrindo as colunas usadas em WHERE/ORDER BY.
-- Esperado (ideal): question_attempts(user_id, created_at) e (user_id, acertou),
-- simulado_attempts(user_id), questions(subject_id).
SELECT
  '2. indices' AS check,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('question_attempts', 'simulado_attempts', 'questions', 'simulado_respostas')
ORDER BY tablename, indexname;


-- 3) STATUS DE ROW LEVEL SECURITY POR TABELA --------------------------------
-- rls_enabled = false numa tabela multitenant é gap de defesa-em-profundidade.
-- (O app já filtra por user_id no server, então não é crítico, mas vale saber.)
SELECT
  '3. rls por tabela' AS check,
  c.relname AS tabela,
  c.relrowsecurity  AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'users', 'question_attempts', 'simulado_attempts', 'simulado_respostas',
    'simulados', 'questions', 'subjects', 'calendar_events', 'google_calendar_tokens'
  )
ORDER BY c.relname;


-- 4) VOLUME DAS TABELAS (dimensiona impacto dos índices) ---------------------
SELECT '4. volume question_attempts' AS check, COUNT(*) AS linhas FROM public.question_attempts
UNION ALL
SELECT '4. volume simulado_attempts', COUNT(*) FROM public.simulado_attempts
UNION ALL
SELECT '4. volume questions',         COUNT(*) FROM public.questions
UNION ALL
SELECT '4. volume users',            COUNT(*) FROM public.users;


-- 5) SANIDADE: usuários no Auth SEM linha em public.users -------------------
-- Detecta trigger furado / cadastros órfãos. Esperado: 0.
SELECT
  '5. auth users sem public.users (esperado 0)' AS check,
  COUNT(*) AS orfaos
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;


-- 6) VIEWS DO DASHBOARD/TREINO EXISTEM? -------------------------------------
-- Se vazio, as views não existem (treino e dashboard quebrariam).
SELECT
  '6. views' AS check,
  table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('desempenho_materia', 'materias_risco');
