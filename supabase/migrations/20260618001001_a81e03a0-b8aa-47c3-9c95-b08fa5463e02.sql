
-- ============================================================
-- FASE A: Lotes e modalidades de ingresso
-- ============================================================

-- 1. Flag opt-in no evento
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS use_batches boolean NOT NULL DEFAULT false;

-- 2. Enum para tipo de modalidade
DO $$ BEGIN
  CREATE TYPE public.ticket_category_kind AS ENUM
    ('full','half','solidarity','pcd','elderly','courtesy');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Lotes
CREATE TABLE IF NOT EXISTS public.event_ticket_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity integer,
  price_cents integer NOT NULL DEFAULT 0,
  starts_at timestamptz,
  ends_at timestamptz,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_batches_event ON public.event_ticket_batches(event_id, sort_order);

GRANT SELECT ON public.event_ticket_batches TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_ticket_batches TO authenticated;
GRANT ALL ON public.event_ticket_batches TO service_role;

ALTER TABLE public.event_ticket_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active batches"
  ON public.event_ticket_batches FOR SELECT
  USING (is_active = true);

CREATE POLICY "Organizer manages own batches"
  ON public.event_ticket_batches FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.organizers o ON o.id = e.organizer_id
    WHERE e.id = event_id AND o.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.organizers o ON o.id = e.organizer_id
    WHERE e.id = event_id AND o.user_id = auth.uid()
  ));

CREATE POLICY "Admin manages all batches"
  ON public.event_ticket_batches FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_batches_updated_at BEFORE UPDATE ON public.event_ticket_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Modalidades
CREATE TABLE IF NOT EXISTS public.event_ticket_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES public.event_ticket_batches(id) ON DELETE SET NULL,
  kind public.ticket_category_kind NOT NULL,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  quantity integer,
  per_user_limit integer NOT NULL DEFAULT 5,
  sale_starts_at timestamptz,
  sale_ends_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  requires_document boolean NOT NULL DEFAULT false,
  requires_donation boolean NOT NULL DEFAULT false,
  donation_description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_categories_event ON public.event_ticket_categories(event_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_categories_batch ON public.event_ticket_categories(batch_id);

GRANT SELECT ON public.event_ticket_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_ticket_categories TO authenticated;
GRANT ALL ON public.event_ticket_categories TO service_role;

ALTER TABLE public.event_ticket_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active categories"
  ON public.event_ticket_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Organizer manages own categories"
  ON public.event_ticket_categories FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.organizers o ON o.id = e.organizer_id
    WHERE e.id = event_id AND o.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.organizers o ON o.id = e.organizer_id
    WHERE e.id = event_id AND o.user_id = auth.uid()
  ));

CREATE POLICY "Admin manages all categories"
  ON public.event_ticket_categories FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_categories_updated_at BEFORE UPDATE ON public.event_ticket_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Códigos de cortesia
CREATE TABLE IF NOT EXISTS public.event_courtesy_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.event_ticket_categories(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  max_uses integer NOT NULL DEFAULT 1,
  used_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  assigned_user_id uuid,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_courtesy_event ON public.event_courtesy_codes(event_id);
CREATE INDEX IF NOT EXISTS idx_courtesy_category ON public.event_courtesy_codes(category_id);
CREATE INDEX IF NOT EXISTS idx_courtesy_assigned ON public.event_courtesy_codes(assigned_user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_courtesy_codes TO authenticated;
GRANT ALL ON public.event_courtesy_codes TO service_role;

ALTER TABLE public.event_courtesy_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizer manages own courtesy codes"
  ON public.event_courtesy_codes FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.organizers o ON o.id = e.organizer_id
    WHERE e.id = event_id AND o.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.organizers o ON o.id = e.organizer_id
    WHERE e.id = event_id AND o.user_id = auth.uid()
  ));

CREATE POLICY "Admin manages all courtesy codes"
  ON public.event_courtesy_codes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users see own assigned courtesy"
  ON public.event_courtesy_codes FOR SELECT
  TO authenticated
  USING (assigned_user_id = auth.uid());

-- 6. Tickets: snapshot opcional de categoria/lote
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.event_ticket_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS batch_id uuid REFERENCES public.event_ticket_batches(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_kind public.ticket_category_kind,
  ADD COLUMN IF NOT EXISTS category_name text,
  ADD COLUMN IF NOT EXISTS batch_name text,
  ADD COLUMN IF NOT EXISTS unit_price_cents integer,
  ADD COLUMN IF NOT EXISTS is_courtesy boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS courtesy_code_id uuid REFERENCES public.event_courtesy_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS donation_verified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_tickets_category ON public.tickets(category_id);
CREATE INDEX IF NOT EXISTS idx_tickets_batch ON public.tickets(batch_id);

-- 7. Helpers
CREATE OR REPLACE FUNCTION public.event_category_available(_category_id uuid)
RETURNS integer
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _qty integer; _batch_qty integer; _used integer; _batch_used integer; _batch_id uuid;
BEGIN
  SELECT quantity, batch_id INTO _qty, _batch_id
  FROM public.event_ticket_categories WHERE id = _category_id;
  IF _qty IS NULL THEN RETURN NULL; END IF;
  SELECT COUNT(*) INTO _used FROM public.tickets
    WHERE category_id = _category_id AND status <> 'cancelled';
  IF _batch_id IS NOT NULL THEN
    SELECT quantity INTO _batch_qty FROM public.event_ticket_batches WHERE id = _batch_id;
    IF _batch_qty IS NOT NULL THEN
      SELECT COUNT(*) INTO _batch_used FROM public.tickets
        WHERE batch_id = _batch_id AND status <> 'cancelled';
      RETURN LEAST(_qty - _used, _batch_qty - _batch_used);
    END IF;
  END IF;
  RETURN GREATEST(_qty - _used, 0);
END $$;

CREATE OR REPLACE FUNCTION public.event_current_batch(_event_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT b.id FROM public.event_ticket_batches b
  WHERE b.event_id = _event_id AND b.is_active = true
    AND (b.starts_at IS NULL OR b.starts_at <= now())
    AND (b.ends_at IS NULL OR b.ends_at >= now())
  ORDER BY b.sort_order ASC, b.created_at ASC
  LIMIT 1
$$;

-- 8. Trigger: preencher snapshot e validar per_user_limit
CREATE OR REPLACE FUNCTION public.tickets_apply_category_snapshot()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _cat RECORD; _bat RECORD; _user_count integer; _avail integer;
BEGIN
  IF NEW.category_id IS NOT NULL THEN
    SELECT * INTO _cat FROM public.event_ticket_categories WHERE id = NEW.category_id;
    IF _cat.id IS NULL THEN RAISE EXCEPTION 'Modalidade não encontrada'; END IF;
    IF NOT _cat.is_active THEN RAISE EXCEPTION 'Modalidade não está ativa'; END IF;

    NEW.category_kind := _cat.kind;
    NEW.category_name := _cat.name;
    IF NEW.unit_price_cents IS NULL THEN
      NEW.unit_price_cents := CASE WHEN _cat.is_free THEN 0 ELSE _cat.price_cents END;
    END IF;
    IF _cat.kind = 'courtesy' THEN NEW.is_courtesy := true; END IF;

    IF NEW.batch_id IS NULL AND _cat.batch_id IS NOT NULL THEN
      NEW.batch_id := _cat.batch_id;
    END IF;

    -- per_user_limit
    IF _cat.per_user_limit IS NOT NULL AND NEW.user_id IS NOT NULL THEN
      SELECT COUNT(*) INTO _user_count FROM public.tickets
        WHERE category_id = NEW.category_id AND user_id = NEW.user_id AND status <> 'cancelled';
      IF _user_count >= _cat.per_user_limit THEN
        RAISE EXCEPTION 'Limite por usuário atingido para esta modalidade (% por usuário)', _cat.per_user_limit
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;

    -- disponibilidade
    _avail := public.event_category_available(NEW.category_id);
    IF _avail IS NOT NULL AND _avail <= 0 THEN
      RAISE EXCEPTION 'Modalidade esgotada' USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.batch_id IS NOT NULL THEN
    SELECT * INTO _bat FROM public.event_ticket_batches WHERE id = NEW.batch_id;
    IF _bat.id IS NOT NULL THEN
      NEW.batch_name := _bat.name;
      IF NOT _bat.is_active THEN RAISE EXCEPTION 'Lote inativo'; END IF;
      IF _bat.starts_at IS NOT NULL AND _bat.starts_at > now() THEN
        RAISE EXCEPTION 'Lote ainda não iniciou';
      END IF;
      IF _bat.ends_at IS NOT NULL AND _bat.ends_at < now() THEN
        RAISE EXCEPTION 'Lote encerrado';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_tickets_category_snapshot ON public.tickets;
CREATE TRIGGER trg_tickets_category_snapshot
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.tickets_apply_category_snapshot();

-- 9. RPC: gerar lote de códigos de cortesia
CREATE OR REPLACE FUNCTION public.generate_courtesy_codes(_category_id uuid, _count integer, _expires_at timestamptz DEFAULT NULL)
RETURNS SETOF public.event_courtesy_codes
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _event_id uuid; _i integer; _code text; _allowed boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  IF _count IS NULL OR _count < 1 OR _count > 500 THEN RAISE EXCEPTION 'Quantidade inválida (1 a 500)'; END IF;
  SELECT event_id INTO _event_id FROM public.event_ticket_categories WHERE id = _category_id;
  IF _event_id IS NULL THEN RAISE EXCEPTION 'Modalidade não encontrada'; END IF;
  _allowed := public.has_role(_uid,'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id
    WHERE e.id = _event_id AND o.user_id = _uid);
  IF NOT _allowed THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  FOR _i IN 1.._count LOOP
    _code := 'CRT-' || upper(substring(md5(random()::text || clock_timestamp()::text) FROM 1 FOR 8));
    INSERT INTO public.event_courtesy_codes (category_id, event_id, code, max_uses, expires_at, created_by)
    VALUES (_category_id, _event_id, _code, 1, _expires_at, _uid)
    ON CONFLICT (code) DO NOTHING;
  END LOOP;

  RETURN QUERY SELECT * FROM public.event_courtesy_codes
    WHERE category_id = _category_id AND created_by = _uid
    ORDER BY created_at DESC LIMIT _count;
END $$;

-- 10. RPC: atribuir cortesia direto a usuário (gera ticket)
CREATE OR REPLACE FUNCTION public.assign_courtesy_ticket(_category_id uuid, _target_user_id uuid, _holder_name text, _holder_email text, _holder_phone text)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _event_id uuid; _allowed boolean; _ticket_id uuid; _cat RECORD;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT * INTO _cat FROM public.event_ticket_categories WHERE id = _category_id;
  IF _cat.id IS NULL THEN RAISE EXCEPTION 'Modalidade não encontrada'; END IF;
  IF _cat.kind <> 'courtesy' THEN RAISE EXCEPTION 'Modalidade não é cortesia'; END IF;
  _event_id := _cat.event_id;
  _allowed := public.has_role(_uid,'admin'::app_role) OR EXISTS (
    SELECT 1 FROM public.events e JOIN public.organizers o ON o.id = e.organizer_id
    WHERE e.id = _event_id AND o.user_id = _uid);
  IF NOT _allowed THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  INSERT INTO public.tickets (event_id, user_id, holder_name, holder_email, holder_phone, category_id, is_courtesy, unit_price_cents)
  VALUES (_event_id, _target_user_id, _holder_name, _holder_email, _holder_phone, _category_id, true, 0)
  RETURNING id INTO _ticket_id;

  RETURN _ticket_id;
END $$;

GRANT EXECUTE ON FUNCTION public.event_category_available(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.event_current_batch(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.generate_courtesy_codes(uuid, integer, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.assign_courtesy_ticket(uuid, uuid, text, text, text) TO authenticated;
