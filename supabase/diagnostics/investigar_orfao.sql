-- ============================================================================
-- Investigar o usuário órfão (existe em auth.users mas não em public.users)
-- ============================================================================
-- READ-ONLY. Rode no SQL Editor do Supabase e me mande a saída.
-- Objetivo: descobrir QUEM é e se é só uma conta legada/de teste (ignorável)
-- ou se o trigger handle_new_user falhou de verdade (precisa backfill).

SELECT
  au.id,
  au.email,
  au.created_at        AS auth_criado_em,
  au.email_confirmed_at,
  au.last_sign_in_at,
  au.raw_user_meta_data->>'full_name' AS nome,
  -- Foi criado ANTES do trigger existir? (compare com a data de criação da function)
  (SELECT pg_catalog.obj_description(p.oid)
     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname='public' AND p.proname='handle_new_user' LIMIT 1) AS handle_new_user_comment
FROM auth.users au
LEFT JOIN public.users pu ON pu.id = au.id
WHERE pu.id IS NULL;
