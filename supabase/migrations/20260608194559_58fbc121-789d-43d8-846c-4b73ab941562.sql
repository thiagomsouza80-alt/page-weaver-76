
-- 1. Toggles em events e news
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS tickets_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS tickets_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.news ADD COLUMN IF NOT EXISTS related_event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

-- 2. Sequência e função de geração de código
CREATE SEQUENCE IF NOT EXISTS public.ticket_code_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_ticket_code()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'AP-' || lpad(nextval('public.ticket_code_seq')::text, 6, '0')
$$;

GRANT USAGE ON SEQUENCE public.ticket_code_seq TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.generate_ticket_code() TO authenticated, service_role;

-- 3. Tabela de ingressos
CREATE TABLE public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE DEFAULT public.generate_ticket_code(),
  qr_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  holder_name text NOT NULL,
  holder_email text NOT NULL,
  holder_phone text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','cancelled')),
  -- preparado para ingressos pagos no futuro
  price_cents integer NOT NULL DEFAULT 0,
  payment_status text NOT NULL DEFAULT 'free' CHECK (payment_status IN ('free','pending','paid','refunded','failed')),
  payment_method text,
  payment_reference text,
  batch_id uuid,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  used_at timestamptz,
  used_by uuid REFERENCES auth.users(id),
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own tickets"
  ON public.tickets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all tickets"
  ON public.tickets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users create their own tickets"
  ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'active' AND payment_status IN ('free','pending'));

CREATE POLICY "Admins update tickets"
  ON public.tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete tickets"
  ON public.tickets FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_tickets_user ON public.tickets(user_id);
CREATE INDEX idx_tickets_event ON public.tickets(event_id);
CREATE INDEX idx_tickets_code ON public.tickets(code);
CREATE INDEX idx_tickets_qr ON public.tickets(qr_token);

CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
