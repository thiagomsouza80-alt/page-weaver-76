
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tickets_total integer;

CREATE OR REPLACE FUNCTION public.enforce_ticket_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _limit integer;
  _active integer;
BEGIN
  SELECT tickets_total INTO _limit FROM public.events WHERE id = NEW.event_id;
  IF _limit IS NOT NULL THEN
    SELECT COUNT(*) INTO _active FROM public.tickets WHERE event_id = NEW.event_id AND status <> 'cancelled';
    IF _active >= _limit THEN
      RAISE EXCEPTION 'Ingressos esgotados para este evento' USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_ticket_limit ON public.tickets;
CREATE TRIGGER trg_enforce_ticket_limit
BEFORE INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.enforce_ticket_limit();

CREATE OR REPLACE FUNCTION public.event_tickets_count(_event_id uuid)
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int FROM public.tickets WHERE event_id = _event_id AND status <> 'cancelled'
$$;
