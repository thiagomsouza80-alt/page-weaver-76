
-- =========================================================
-- event_validators
-- =========================================================
CREATE TABLE public.event_validators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organizer_id uuid NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  validator_name text NOT NULL,
  validator_email text,
  validator_avatar_url text,
  permissions jsonb NOT NULL DEFAULT '{"scan_qr":true,"search_code":true,"view_stats":true}'::jsonb,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  added_by uuid NOT NULL,
  last_access_at timestamptz,
  validations_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id),
  CHECK (status IN ('active','suspended'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_validators TO authenticated;
GRANT ALL ON public.event_validators TO service_role;

ALTER TABLE public.event_validators ENABLE ROW LEVEL SECURITY;

-- Admin: full
CREATE POLICY "Admins manage all event_validators"
ON public.event_validators FOR ALL TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- Organizer: manage own
CREATE POLICY "Organizers manage own event_validators"
ON public.event_validators FOR ALL TO authenticated
USING (organizer_id IN (SELECT id FROM public.organizers WHERE user_id = auth.uid()))
WITH CHECK (organizer_id IN (SELECT id FROM public.organizers WHERE user_id = auth.uid()));

-- Validator: read own assignments
CREATE POLICY "Validators read own assignments"
ON public.event_validators FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER trg_event_validators_updated
BEFORE UPDATE ON public.event_validators
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- helper: is_event_validator
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_event_validator(_user uuid, _event uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.event_validators
    WHERE user_id = _user
      AND event_id = _event
      AND status = 'active'
      AND starts_at <= now()
      AND (ends_at IS NULL OR ends_at >= now())
  )
$$;

-- =========================================================
-- validations_log
-- =========================================================
CREATE TABLE public.validations_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
  validator_user_id uuid NOT NULL,
  validator_name text,
  participant_name text,
  scanned_code text,
  result text NOT NULL,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (result IN ('valid','used','cancelled','notfound'))
);

GRANT SELECT, INSERT ON public.validations_log TO authenticated;
GRANT ALL ON public.validations_log TO service_role;

ALTER TABLE public.validations_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all validations_log"
ON public.validations_log FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Organizers read own event validations_log"
ON public.validations_log FOR SELECT TO authenticated
USING (event_id IN (
  SELECT e.id FROM public.events e
  JOIN public.organizers o ON o.id = e.organizer_id
  WHERE o.user_id = auth.uid()
));

CREATE POLICY "Validators read own validations"
ON public.validations_log FOR SELECT TO authenticated
USING (validator_user_id = auth.uid());

-- Inserts only allowed via log_validation RPC (SECURITY DEFINER)
-- (no INSERT policy means client direct insert is blocked, except service_role)

-- =========================================================
-- tickets: allow validators to read & validate (mark used)
-- =========================================================
CREATE POLICY "Validators can read event tickets"
ON public.tickets FOR SELECT TO authenticated
USING (public.is_event_validator(auth.uid(), event_id));

CREATE POLICY "Validators can mark ticket as used"
ON public.tickets FOR UPDATE TO authenticated
USING (public.is_event_validator(auth.uid(), event_id))
WITH CHECK (
  public.is_event_validator(auth.uid(), event_id)
  AND status = 'used'
);

-- =========================================================
-- events: allow validators to read authorized events
-- =========================================================
CREATE POLICY "Validators can read authorized events"
ON public.events FOR SELECT TO authenticated
USING (public.is_event_validator(auth.uid(), id));

-- =========================================================
-- search_users_for_validator
-- =========================================================
CREATE OR REPLACE FUNCTION public.search_users_for_validator(_q text)
RETURNS TABLE (
  user_id uuid,
  name text,
  email text,
  phone text,
  city text,
  avatar_url text,
  account_type text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _is_admin boolean;
  _is_organizer boolean;
  _term text;
BEGIN
  IF _caller IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  _is_admin := public.has_role(_caller, 'admin'::app_role);
  _is_organizer := EXISTS (SELECT 1 FROM public.organizers WHERE user_id = _caller);
  IF NOT _is_admin AND NOT _is_organizer THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;
  _term := '%' || lower(coalesce(_q,'')) || '%';
  IF length(coalesce(_q,'')) < 2 THEN
    RETURN;
  END IF;

  RETURN QUERY
    SELECT a.user_id, a.name, a.email, a.phone, a.city, a.profile_image_url, 'artist'::text
    FROM public.artists a
    WHERE a.user_id IS NOT NULL AND (
      lower(a.name) LIKE _term OR lower(coalesce(a.email,'')) LIKE _term OR lower(coalesce(a.phone,'')) LIKE _term
    )
    LIMIT 10;

  RETURN QUERY
    SELECT e.user_id, e.name, e.email, e.phone, NULL::text, e.logo_url, 'entrepreneur'::text
    FROM public.entrepreneurs e
    WHERE e.user_id IS NOT NULL AND (
      lower(e.name) LIKE _term OR lower(coalesce(e.email,'')) LIKE _term OR lower(coalesce(e.phone,'')) LIKE _term
    )
    LIMIT 10;

  RETURN QUERY
    SELECT o.user_id, o.name, o.email, o.phone, NULL::text, o.logo_url, 'organizer'::text
    FROM public.organizers o
    WHERE o.user_id IS NOT NULL AND (
      lower(o.name) LIKE _term OR lower(coalesce(o.email,'')) LIKE _term OR lower(coalesce(o.phone,'')) LIKE _term
    )
    LIMIT 10;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_users_for_validator(text) TO authenticated;

-- =========================================================
-- validator_event_summary
-- =========================================================
CREATE OR REPLACE FUNCTION public.validator_event_summary(_event_id uuid)
RETURNS TABLE (tickets_total integer, tickets_validated integer, tickets_remaining integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _allowed boolean;
  _total integer;
  _validated integer;
  _active integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  _allowed := public.has_role(_uid,'admin'::app_role)
    OR public.is_event_validator(_uid, _event_id)
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizers o ON o.id = e.organizer_id
      WHERE e.id = _event_id AND o.user_id = _uid
    );
  IF NOT _allowed THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  SELECT COUNT(*) FILTER (WHERE status <> 'cancelled'),
         COUNT(*) FILTER (WHERE status = 'used')
    INTO _active, _validated
  FROM public.tickets WHERE event_id = _event_id;

  SELECT tickets_total INTO _total FROM public.events WHERE id = _event_id;

  tickets_total := COALESCE(_total, _active);
  tickets_validated := COALESCE(_validated, 0);
  tickets_remaining := GREATEST(COALESCE(_total, _active) - COALESCE(_validated,0), 0);
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.validator_event_summary(uuid) TO authenticated;

-- =========================================================
-- log_validation RPC
-- =========================================================
CREATE OR REPLACE FUNCTION public.log_validation(
  _event_id uuid,
  _ticket_id uuid,
  _participant_name text,
  _scanned_code text,
  _result text,
  _user_agent text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _name text;
  _log_id uuid;
  _allowed boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;

  _allowed := public.has_role(_uid,'admin'::app_role)
    OR public.is_event_validator(_uid, _event_id)
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizers o ON o.id = e.organizer_id
      WHERE e.id = _event_id AND o.user_id = _uid
    );
  IF NOT _allowed THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  IF _result NOT IN ('valid','used','cancelled','notfound') THEN
    RAISE EXCEPTION 'Resultado inválido';
  END IF;

  SELECT COALESCE(validator_name, 'Validador') INTO _name
  FROM public.event_validators
  WHERE user_id = _uid AND event_id = _event_id
  LIMIT 1;

  INSERT INTO public.validations_log (
    event_id, ticket_id, validator_user_id, validator_name,
    participant_name, scanned_code, result, user_agent
  ) VALUES (
    _event_id, _ticket_id, _uid, _name,
    _participant_name, _scanned_code, _result, _user_agent
  ) RETURNING id INTO _log_id;

  UPDATE public.event_validators
  SET last_access_at = now(),
      validations_count = validations_count + CASE WHEN _result = 'valid' THEN 1 ELSE 0 END
  WHERE user_id = _uid AND event_id = _event_id;

  RETURN _log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_validation(uuid, uuid, text, text, text, text) TO authenticated;

-- =========================================================
-- Realtime for tickets
-- =========================================================
ALTER TABLE public.tickets REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;
