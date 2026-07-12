
-- ============================================================
-- FASE 1: Produtos adicionais + política de reembolso + mapa
-- ============================================================

-- 1) Novos campos em events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS refund_policy text,
  ADD COLUMN IF NOT EXISTS google_maps_url text,
  ADD COLUMN IF NOT EXISTS latitude numeric(10,7),
  ADD COLUMN IF NOT EXISTS longitude numeric(10,7);

-- ============================================================
-- 2) event_addon_products
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_addon_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  category text,
  price_cents integer NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  stock_total integer,
  stock_sold integer NOT NULL DEFAULT 0 CHECK (stock_sold >= 0),
  max_per_order integer CHECK (max_per_order IS NULL OR max_per_order > 0),
  is_required boolean NOT NULL DEFAULT false,
  is_visible boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_addon_products_event ON public.event_addon_products(event_id, sort_order);

GRANT SELECT ON public.event_addon_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_addon_products TO authenticated;
GRANT ALL ON public.event_addon_products TO service_role;

ALTER TABLE public.event_addon_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view visible addons of published events"
  ON public.event_addon_products FOR SELECT
  USING (
    is_visible = true
    AND EXISTS (
      SELECT 1 FROM public.events e
      WHERE e.id = event_id AND e.published = true
    )
  );

CREATE POLICY "Organizers and admins manage addons"
  ON public.event_addon_products FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizers o ON o.id = e.organizer_id
      WHERE e.id = event_id AND o.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizers o ON o.id = e.organizer_id
      WHERE e.id = event_id AND o.user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_addon_products_updated_at
  BEFORE UPDATE ON public.event_addon_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3) ticket_addons — adicionais comprados por um ingresso
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ticket_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.event_addon_products(id) ON DELETE SET NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_cents integer NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0),
  delivered boolean NOT NULL DEFAULT false,
  delivered_at timestamptz,
  delivered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  delivered_location text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_addons_ticket ON public.ticket_addons(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_addons_event ON public.ticket_addons(event_id);
CREATE INDEX IF NOT EXISTS idx_ticket_addons_user ON public.ticket_addons(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ticket_addons TO authenticated;
GRANT ALL ON public.ticket_addons TO service_role;

ALTER TABLE public.ticket_addons ENABLE ROW LEVEL SECURITY;

-- Comprador vê seus próprios adicionais
CREATE POLICY "Buyers view own ticket addons"
  ON public.ticket_addons FOR SELECT
  USING (auth.uid() = user_id);

-- Organizador e admin veem tudo do evento
CREATE POLICY "Organizers and admins view event addons"
  ON public.ticket_addons FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizers o ON o.id = e.organizer_id
      WHERE e.id = event_id AND o.user_id = auth.uid()
    )
  );

-- Validadores ativos do evento veem os adicionais
CREATE POLICY "Validators view event addons"
  ON public.ticket_addons FOR SELECT
  USING (public.is_event_validator(auth.uid(), event_id));

-- Inserção: o próprio usuário compra
CREATE POLICY "Users insert own ticket addons"
  ON public.ticket_addons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Organizador/admin também podem inserir (cortesias, ajustes)
CREATE POLICY "Organizers and admins insert ticket addons"
  ON public.ticket_addons FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizers o ON o.id = e.organizer_id
      WHERE e.id = event_id AND o.user_id = auth.uid()
    )
  );

-- Update: organizador, admin e validadores (para marcar entrega)
CREATE POLICY "Organizers admins validators update addons"
  ON public.ticket_addons FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_event_validator(auth.uid(), event_id)
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizers o ON o.id = e.organizer_id
      WHERE e.id = event_id AND o.user_id = auth.uid()
    )
  );

-- Delete: apenas organizador/admin
CREATE POLICY "Organizers and admins delete ticket addons"
  ON public.ticket_addons FOR DELETE
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizers o ON o.id = e.organizer_id
      WHERE e.id = event_id AND o.user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_ticket_addons_updated_at
  BEFORE UPDATE ON public.ticket_addons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4) Trigger para atualizar estoque vendido
-- ============================================================
CREATE OR REPLACE FUNCTION public.addon_update_stock_sold()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.product_id IS NOT NULL THEN
    UPDATE public.event_addon_products
      SET stock_sold = stock_sold + NEW.quantity
      WHERE id = NEW.product_id;
    -- valida estoque
    PERFORM 1 FROM public.event_addon_products
      WHERE id = NEW.product_id
        AND stock_total IS NOT NULL
        AND stock_sold > stock_total;
    IF FOUND THEN
      RAISE EXCEPTION 'Produto adicional esgotado' USING ERRCODE = 'check_violation';
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.product_id IS NOT NULL THEN
    UPDATE public.event_addon_products
      SET stock_sold = GREATEST(stock_sold - OLD.quantity, 0)
      WHERE id = OLD.product_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_addon_stock_insert
  AFTER INSERT ON public.ticket_addons
  FOR EACH ROW EXECUTE FUNCTION public.addon_update_stock_sold();

CREATE TRIGGER trg_addon_stock_delete
  AFTER DELETE ON public.ticket_addons
  FOR EACH ROW EXECUTE FUNCTION public.addon_update_stock_sold();
