CREATE OR REPLACE FUNCTION public.tickets_guard_courtesy()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _kind text;
  _uid uuid := auth.uid();
  _is_org boolean;
BEGIN
  IF NEW.category_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT kind::text INTO _kind
  FROM public.event_ticket_categories
  WHERE id = NEW.category_id;

  IF _kind = 'courtesy' AND NEW.courtesy_code_id IS NULL THEN
    IF _uid IS NULL THEN
      RAISE EXCEPTION 'Não autenticado';
    END IF;
    IF public.has_role(_uid, 'admin'::app_role) THEN
      RETURN NEW;
    END IF;
    SELECT EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizers o ON o.id = e.organizer_id
      WHERE e.id = NEW.event_id AND o.user_id = _uid
    ) INTO _is_org;
    IF NOT _is_org THEN
      RAISE EXCEPTION 'Cortesia exige código de cortesia válido ou atribuição pelo organizador'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_tickets_guard_courtesy ON public.tickets;
CREATE TRIGGER trg_tickets_guard_courtesy
BEFORE INSERT ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.tickets_guard_courtesy();