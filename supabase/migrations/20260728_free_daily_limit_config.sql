-- Faz o trigger do limite diário ler o valor de app_config em vez do 10 fixo.
--
-- MIGRATION SEPARADA DE PROPÓSITO: é a única parte da Fase A que toca código já
-- em produção, e o que ela toca é o gate do paywall. As outras duas migrations
-- são puramente aditivas e podem subir sem cerimônia; esta merece ser aplicada
-- e conferida sozinha.
--
-- O valor NÃO muda: continua 10. Só passa a ser editável sem deploy.
-- Requer 20260728_app_config.sql aplicada antes.

CREATE OR REPLACE FUNCTION public.enforce_free_daily_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano text;
  v_count int;
  v_limit int;
  v_inicio_dia_br timestamptz;
BEGIN
  IF NEW.is_diagnostic THEN
    RETURN NEW;
  END IF;

  SELECT plano INTO v_plano FROM public.users WHERE id = NEW.user_id;

  IF v_plano IS DISTINCT FROM 'free' THEN
    RETURN NEW;
  END IF;

  -- Config ausente, malformada ou <= 0 cai no padrão de 10. O limite nunca
  -- pode virar 0 ou NULL por erro de digitação no JSON: isso barraria todo
  -- usuário free da plataforma.
  SELECT (value->>'freeDailyLimit')::int INTO v_limit
    FROM public.app_config WHERE key = 'limites';

  IF v_limit IS NULL OR v_limit <= 0 THEN
    v_limit := 10;
  END IF;

  -- Serializa por user_id na duração da transação. hashtext retorna int4;
  -- cast pra bigint pra casar com a assinatura pg_advisory_xact_lock(bigint).
  PERFORM pg_advisory_xact_lock(hashtext(NEW.user_id::text)::bigint);

  v_inicio_dia_br := date_trunc('day', NOW() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo';

  SELECT COUNT(*) INTO v_count
  FROM public.question_attempts
  WHERE user_id = NEW.user_id
    AND is_diagnostic = false
    AND created_at >= v_inicio_dia_br;

  IF v_count >= v_limit THEN
    RAISE EXCEPTION 'free_daily_limit_exceeded' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;
