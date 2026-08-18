-- ============================================================================
-- Linhas em public.users SEM conta correspondente em auth.users
-- ============================================================================
-- READ-ONLY. Rode no SQL Editor do Supabase e me mande a saída inteira.
--
-- É o sentido CONTRÁRIO ao de investigar_orfao.sql (que procura Auth sem
-- público). Aqui a pergunta é: apagar a conta do Auth deixa a linha do lado
-- público para trás?
--
-- Medido em 18/ago/2026, criando e apagando uma conta de teste pela admin API:
--   deleteUser(id)  -> sem erro
--   getUserById(id) -> não existe mais
--   public.users    -> a linha CONTINUA lá
--
-- Duas coisas seguem sem resposta, e são o que estas consultas respondem:
--   (a) existe FK entre as duas tabelas? Se existisse SEM cascade, o delete do
--       Auth teria FALHADO com violação de chave estrangeira -- e não falhou.
--   (b) o trigger handle_new_user trata só INSERT, ou também DELETE?
--
-- Por que isso importa mais do que parece: lib/services/metricas.ts lê
-- public.users inteiro e só filtra role <> 'admin', então cada órfã entra como
-- uma pessoa que se cadastrou e nunca fez nada -- no DENOMINADOR de todo funil
-- do /admin/metricas. Com 4 órfãs numa base de ~74, é ~5% de diluição em cada
-- taxa de ativação.

-- ── 1. Quem são as órfãs ────────────────────────────────────────────────────
SELECT
  pu.id,
  pu.email,
  pu.created_at,
  pu.role,
  pu.plano,
  (SELECT count(*) FROM public.question_attempts qa WHERE qa.user_id = pu.id) AS respostas,
  (SELECT count(*) FROM public.simulado_attempts sa WHERE sa.user_id = pu.id) AS simulados
FROM public.users pu
LEFT JOIN auth.users au ON au.id = pu.id
WHERE au.id IS NULL
ORDER BY pu.created_at;

-- ── 2. Existe alguma FK de public.users para auth.users? E com qual regra? ──
-- confdeltype: 'a' = NO ACTION, 'r' = RESTRICT, 'c' = CASCADE, 'n' = SET NULL
-- Zero linhas aqui significa que NÃO HÁ FK -- e é a explicação mais provável
-- para o delete ter passado sem erro e sem levar a linha junto.
SELECT
  con.conname                          AS constraint_name,
  con.confdeltype                      AS on_delete,
  pg_get_constraintdef(con.oid)        AS definicao
FROM pg_constraint con
JOIN pg_class      tbl ON tbl.oid = con.conrelid
JOIN pg_namespace  nsp ON nsp.oid = tbl.relnamespace
WHERE nsp.nspname = 'public'
  AND tbl.relname = 'users'
  AND con.contype = 'f';

-- ── 3. Que triggers existem nas duas pontas ─────────────────────────────────
SELECT
  c.relnamespace::regnamespace || '.' || c.relname AS tabela,
  t.tgname                                          AS trigger_name,
  pg_get_triggerdef(t.oid)                          AS definicao
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE NOT t.tgisinternal
  AND (
    (c.relnamespace = 'auth'::regnamespace   AND c.relname = 'users') OR
    (c.relnamespace = 'public'::regnamespace AND c.relname = 'users')
  )
ORDER BY tabela, trigger_name;

-- ── 4. Placar dos dois lados, pra dimensionar ───────────────────────────────
SELECT
  (SELECT count(*) FROM auth.users)   AS contas_no_auth,
  (SELECT count(*) FROM public.users) AS linhas_no_publico,
  (SELECT count(*) FROM public.users pu
     LEFT JOIN auth.users au ON au.id = pu.id
    WHERE au.id IS NULL)              AS orfas_no_publico,
  (SELECT count(*) FROM auth.users au
     LEFT JOIN public.users pu ON pu.id = au.id
    WHERE pu.id IS NULL)              AS orfas_no_auth;
