
CREATE OR REPLACE FUNCTION public.redeem_courtesy_code(
  _code text,
  _holder_name text,
  _holder_email text,
  _holder_phone text
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cc RECORD;
  _cat RECORD;
  _ticket_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _code IS NULL OR length(trim(_code)) = 0 THEN RAISE EXCEPTION 'Código obrigatório'; END IF;

  SELECT * INTO _cc FROM public.event_courtesy_codes
    WHERE upper(code) = upper(trim(_code)) FOR UPDATE;
  IF _cc.id IS NULL THEN RAISE EXCEPTION 'Código inválido'; END IF;
  IF NOT _cc.is_active THEN RAISE EXCEPTION 'Código desativado'; END IF;
  IF _cc.expires_at IS NOT NULL AND _cc.expires_at < now() THEN RAISE EXCEPTION 'Código expirado'; END IF;
  IF _cc.used_count >= _cc.max_uses THEN RAISE EXCEPTION 'Código já utilizado'; END IF;

  SELECT * INTO _cat FROM public.event_ticket_categories WHERE id = _cc.category_id;
  IF _cat.id IS NULL THEN RAISE EXCEPTION 'Modalidade não encontrada'; END IF;

  INSERT INTO public.tickets (
    event_id, user_id, holder_name, holder_email, holder_phone,
    category_id, is_courtesy, courtesy_code_id, unit_price_cents
  ) VALUES (
    _cat.event_id, _uid, _holder_name, _holder_email, _holder_phone,
    _cat.id, true, _cc.id, 0
  ) RETURNING id INTO _ticket_id;

  UPDATE public.event_courtesy_codes
    SET used_count = used_count + 1,
        is_active = CASE WHEN used_count + 1 >= max_uses THEN false ELSE is_active END
    WHERE id = _cc.id;

  RETURN _ticket_id;
END $$;

GRANT EXECUTE ON FUNCTION public.redeem_courtesy_code(text, text, text, text) TO authenticated;
