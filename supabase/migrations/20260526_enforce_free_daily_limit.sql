-- Defesa atômica do limite de 10 questões/dia do plano Free.
-- O gate em app/api/simulados/resposta/route.ts faz check-then-write sem lock:
-- múltiplos POSTs paralelos podem todos passar pelo SELECT antes de qualquer
-- INSERT efetivar. Trigger BEFORE INSERT com pg_advisory_xact_lock por user_id
-- serializa check+insert, garantindo que o 11º insert do dia sempre vê count=10
-- e é rejeitado, mesmo sob concorrência.

CREATE OR REPLACE FUNCTION public.enforce_free_daily_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plano text;
  v_count int;
  v_inicio_dia_br timestamptz;
BEGIN
  IF NEW.is_diagnostic THEN
    RETURN NEW;
  END IF;

  SELECT plano INTO v_plano FROM public.users WHERE id = NEW.user_id;

  IF v_plano IS DISTINCT FROM 'free' THEN
    RETURN NEW;
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

  IF v_count >= 10 THEN
    RAISE EXCEPTION 'free_daily_limit_exceeded' USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_free_daily_limit_trg ON public.question_attempts;

CREATE TRIGGER enforce_free_daily_limit_trg
  BEFORE INSERT ON public.question_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_free_daily_limit();
