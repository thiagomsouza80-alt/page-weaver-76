
-- ============================================================
-- EVENTS: tipo de evento e preço
-- ============================================================
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS ticket_type text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS ticket_price_cents integer NOT NULL DEFAULT 0;

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_ticket_type_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_ticket_type_check CHECK (ticket_type IN ('free','paid'));

ALTER TABLE public.events
  DROP CONSTRAINT IF EXISTS events_ticket_price_check;
ALTER TABLE public.events
  ADD CONSTRAINT events_ticket_price_check CHECK (ticket_price_cents >= 0);

-- ============================================================
-- PLATFORM_SETTINGS: configuração global (single-row)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id boolean PRIMARY KEY DEFAULT true,
  ticket_fee_cents integer NOT NULL DEFAULT 100,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT platform_settings_singleton CHECK (id = true),
  CONSTRAINT platform_settings_fee_positive CHECK (ticket_fee_cents >= 0)
);

GRANT SELECT ON public.platform_settings TO anon, authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform settings"
  ON public.platform_settings FOR SELECT
  USING (true);

CREATE POLICY "Admins update platform settings"
  ON public.platform_settings FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert platform settings"
  ON public.platform_settings FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.platform_settings (id, ticket_fee_cents)
VALUES (true, 100)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PAYMENT_GATEWAY_CONFIG: credenciais (single-row, admin-only)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_gateway_config (
  id boolean PRIMARY KEY DEFAULT true,
  provider text NOT NULL DEFAULT 'misticpay',
  client_id text,
  environment text NOT NULL DEFAULT 'sandbox',
  active boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,
  CONSTRAINT payment_gateway_singleton CHECK (id = true),
  CONSTRAINT payment_gateway_env_check CHECK (environment IN ('sandbox','production'))
);

GRANT ALL ON public.payment_gateway_config TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.payment_gateway_config TO authenticated;
ALTER TABLE public.payment_gateway_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage gateway config"
  ON public.payment_gateway_config FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.payment_gateway_config (id) VALUES (true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- PAYMENT_TRANSACTIONS: cada cobrança PIX
-- ============================================================
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organizer_id uuid REFERENCES public.organizers(id) ON DELETE SET NULL,
  buyer_user_id uuid NOT NULL,
  buyer_name text NOT NULL,
  buyer_email text NOT NULL,
  buyer_phone text NOT NULL,
  amount_cents integer NOT NULL,
  fee_cents integer NOT NULL,
  total_cents integer NOT NULL,
  provider text NOT NULL DEFAULT 'misticpay',
  provider_transaction_id text,
  status text NOT NULL DEFAULT 'pending',
  pix_qrcode text,
  pix_copy_paste text,
  pix_expires_at timestamptz,
  paid_at timestamptz,
  raw_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_transactions_status_check
    CHECK (status IN ('pending','paid','cancelled','expired','failed','refunded'))
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_buyer ON public.payment_transactions(buyer_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_event ON public.payment_transactions(event_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_organizer ON public.payment_transactions(organizer_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_provider_tid ON public.payment_transactions(provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_transactions_status ON public.payment_transactions(status);

GRANT SELECT, INSERT, UPDATE ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers read own transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (buyer_user_id = auth.uid());

CREATE POLICY "Organizers read own event transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (
    organizer_id IN (
      SELECT id FROM public.organizers
      WHERE user_id = auth.uid() AND approval_status = 'approved'
    )
  );

CREATE POLICY "Admins read all transactions"
  ON public.payment_transactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Buyers create own transactions"
  ON public.payment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (buyer_user_id = auth.uid());

CREATE POLICY "Admins update transactions"
  ON public.payment_transactions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_payment_transactions_updated_at
  BEFORE UPDATE ON public.payment_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- WITHDRAWAL_REQUESTS: solicitações de saque
-- ============================================================
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_id uuid NOT NULL REFERENCES public.organizers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  cpf text NOT NULL,
  whatsapp text NOT NULL,
  pix_key text NOT NULL,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  receipt_url text,
  receipt_path text,
  paid_at timestamptz,
  paid_by uuid,
  approved_at timestamptz,
  approved_by uuid,
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT withdrawal_status_check
    CHECK (status IN ('pending','approved','rejected','paid')),
  CONSTRAINT withdrawal_amount_positive CHECK (amount_cents > 0)
);

CREATE INDEX IF NOT EXISTS idx_withdrawal_organizer ON public.withdrawal_requests(organizer_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_status ON public.withdrawal_requests(status);

GRANT SELECT, INSERT, UPDATE ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers read own withdrawals"
  ON public.withdrawal_requests FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins read all withdrawals"
  ON public.withdrawal_requests FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Organizers create own withdrawals"
  ON public.withdrawal_requests FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND organizer_id IN (
      SELECT id FROM public.organizers
      WHERE user_id = auth.uid() AND approval_status = 'approved'
    )
  );

CREATE POLICY "Admins update withdrawals"
  ON public.withdrawal_requests FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger: bloqueia "paid" sem comprovante
CREATE OR REPLACE FUNCTION public.enforce_withdrawal_receipt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'paid' AND (NEW.receipt_url IS NULL OR NEW.receipt_url = '') THEN
    RAISE EXCEPTION 'Comprovante obrigatório para marcar saque como pago';
  END IF;
  -- Transição: só pode ir para paid se estiver approved
  IF NEW.status = 'paid' AND OLD.status NOT IN ('approved','paid') THEN
    RAISE EXCEPTION 'Saque precisa estar aprovado antes de ser pago';
  END IF;
  IF NEW.status = 'paid' AND NEW.paid_at IS NULL THEN
    NEW.paid_at := now();
  END IF;
  IF NEW.status = 'approved' AND NEW.approved_at IS NULL THEN
    NEW.approved_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_withdrawal_enforce ON public.withdrawal_requests;
CREATE TRIGGER trg_withdrawal_enforce
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_withdrawal_receipt();

CREATE TRIGGER trg_withdrawal_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- FINANCIAL_AUDIT_LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid,
  actor_role text,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  ip_address text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON public.financial_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.financial_audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.financial_audit_logs(actor_user_id);

GRANT SELECT, INSERT ON public.financial_audit_logs TO authenticated;
GRANT ALL ON public.financial_audit_logs TO service_role;
ALTER TABLE public.financial_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit logs"
  ON public.financial_audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated insert audit logs"
  ON public.financial_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

-- ============================================================
-- FUNÇÕES DE SALDO DO ORGANIZADOR
-- ============================================================
CREATE OR REPLACE FUNCTION public.organizer_financial_summary(_organizer_id uuid)
RETURNS TABLE (
  tickets_sold integer,
  gross_revenue_cents bigint,
  platform_fees_cents bigint,
  net_revenue_cents bigint,
  withdrawn_cents bigint,
  pending_withdrawal_cents bigint,
  available_cents bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH paid AS (
    SELECT COALESCE(SUM(pt.amount_cents),0) AS gross,
           COALESCE(SUM(pt.fee_cents),0) AS fees,
           COUNT(*)::int AS qty
    FROM public.payment_transactions pt
    WHERE pt.organizer_id = _organizer_id AND pt.status = 'paid'
  ),
  withdrawals AS (
    SELECT
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_cents ELSE 0 END),0) AS withdrawn,
      COALESCE(SUM(CASE WHEN status IN ('pending','approved') THEN amount_cents ELSE 0 END),0) AS pending
    FROM public.withdrawal_requests
    WHERE organizer_id = _organizer_id
  )
  SELECT
    paid.qty,
    paid.gross,
    paid.fees,
    paid.gross,
    withdrawals.withdrawn,
    withdrawals.pending,
    GREATEST(paid.gross - withdrawals.withdrawn - withdrawals.pending, 0)
  FROM paid, withdrawals;
$$;

-- ============================================================
-- AJUSTE: enforce_ticket_limit conta pending + active
-- (mantém comportamento atual ao não cancelar)
-- ============================================================
-- já existe e ignora 'cancelled' — pending PIX ocupa slot. OK.

-- ============================================================
-- HELPER: aplicar configuração de taxa atual
-- ============================================================
CREATE OR REPLACE FUNCTION public.current_ticket_fee_cents()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ticket_fee_cents FROM public.platform_settings WHERE id = true
$$;
