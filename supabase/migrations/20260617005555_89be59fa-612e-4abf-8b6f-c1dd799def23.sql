
-- ============= TABLE =============
CREATE TABLE public.refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  organizer_id uuid REFERENCES public.organizers(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  payment_transaction_id uuid REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
  amount_paid_cents integer NOT NULL DEFAULT 0,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  amount_refundable_cents integer NOT NULL DEFAULT 0,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','paid','cancelled')),
  admin_user_id uuid,
  decision_reason text,
  receipt_url text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_refund_requests_ticket ON public.refund_requests(ticket_id);
CREATE INDEX idx_refund_requests_event ON public.refund_requests(event_id);
CREATE INDEX idx_refund_requests_organizer ON public.refund_requests(organizer_id);
CREATE INDEX idx_refund_requests_user ON public.refund_requests(user_id);
CREATE INDEX idx_refund_requests_status ON public.refund_requests(status);
CREATE UNIQUE INDEX uniq_refund_active_per_ticket
  ON public.refund_requests(ticket_id)
  WHERE status IN ('pending','approved','paid');

GRANT SELECT, INSERT, UPDATE ON public.refund_requests TO authenticated;
GRANT ALL ON public.refund_requests TO service_role;

ALTER TABLE public.refund_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyer sees own refunds"
  ON public.refund_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Organizer sees refunds of own events"
  ON public.refund_requests FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.organizers o
    WHERE o.id = refund_requests.organizer_id AND o.user_id = auth.uid()
  ));

CREATE POLICY "Admin sees all refunds"
  ON public.refund_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Buyer creates own refund"
  ON public.refund_requests FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = refund_requests.ticket_id AND t.user_id = auth.uid()
    )
  );

CREATE POLICY "Admin updates refunds"
  ON public.refund_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_refund_requests_updated_at
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.refund_requests_validate_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ticket RECORD; _tx RECORD;
BEGIN
  SELECT t.*, e.event_date AS ev_date, e.organizer_id AS ev_organizer_id
    INTO _ticket
  FROM public.tickets t
  JOIN public.events e ON e.id = t.event_id
  WHERE t.id = NEW.ticket_id;

  IF _ticket.id IS NULL THEN
    RAISE EXCEPTION 'Ingresso não encontrado';
  END IF;
  IF _ticket.status IN ('used','cancelled') THEN
    RAISE EXCEPTION 'Este ingresso não pode ser reembolsado (já utilizado ou cancelado)';
  END IF;
  IF _ticket.ev_date IS NOT NULL AND _ticket.ev_date <= now() + interval '7 days' THEN
    RAISE EXCEPTION 'Reembolsos só podem ser solicitados até 7 dias antes do evento';
  END IF;

  SELECT pt.* INTO _tx
  FROM public.payment_transactions pt
  WHERE pt.ticket_id = NEW.ticket_id AND pt.status = 'paid'
  ORDER BY pt.created_at DESC LIMIT 1;

  NEW.event_id := _ticket.event_id;
  NEW.organizer_id := _ticket.ev_organizer_id;

  IF _tx.id IS NOT NULL THEN
    NEW.payment_transaction_id := _tx.id;
    NEW.amount_paid_cents := COALESCE(_tx.amount_cents, 0);
    NEW.platform_fee_cents := COALESCE(_tx.fee_cents, 0);
  ELSE
    NEW.amount_paid_cents := 0;
    NEW.platform_fee_cents := 0;
  END IF;

  NEW.amount_refundable_cents := GREATEST(
    COALESCE(NEW.amount_paid_cents,0) - COALESCE(NEW.platform_fee_cents,0), 0
  );

  IF NEW.amount_refundable_cents <= 0 THEN
    RAISE EXCEPTION 'Não há valor reembolsável para este ingresso';
  END IF;

  NEW.status := 'pending';
  NEW.requested_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_refund_requests_validate_insert
  BEFORE INSERT ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.refund_requests_validate_insert();

CREATE OR REPLACE FUNCTION public.refund_requests_handle_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'paid' THEN
    IF OLD.status NOT IN ('approved','paid') THEN
      RAISE EXCEPTION 'Reembolso precisa estar aprovado antes de ser pago';
    END IF;
    IF NEW.receipt_url IS NULL OR NEW.receipt_url = '' THEN
      RAISE EXCEPTION 'Comprovante obrigatório para marcar reembolso como pago';
    END IF;
    IF NEW.paid_at IS NULL THEN NEW.paid_at := now(); END IF;
    UPDATE public.tickets SET status = 'cancelled' WHERE id = NEW.ticket_id;
  END IF;

  IF NEW.status IN ('approved','rejected') AND OLD.status = 'pending' AND NEW.decided_at IS NULL THEN
    NEW.decided_at := now();
    NEW.admin_user_id := COALESCE(NEW.admin_user_id, auth.uid());
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_refund_requests_handle_update
  BEFORE UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.refund_requests_handle_update();

-- Substitui a função do resumo financeiro para considerar reembolsos
DROP FUNCTION IF EXISTS public.organizer_financial_summary(uuid);

CREATE OR REPLACE FUNCTION public.organizer_financial_summary(_organizer_id uuid)
RETURNS TABLE(
  tickets_sold integer,
  gross_revenue_cents bigint,
  platform_fees_cents bigint,
  net_revenue_cents bigint,
  withdrawn_cents bigint,
  pending_withdrawal_cents bigint,
  refunded_cents bigint,
  pending_refund_cents bigint,
  available_cents bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
  ),
  refunds AS (
    SELECT
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_refundable_cents ELSE 0 END),0) AS refunded,
      COALESCE(SUM(CASE WHEN status IN ('pending','approved') THEN amount_refundable_cents ELSE 0 END),0) AS pending
    FROM public.refund_requests
    WHERE organizer_id = _organizer_id
  )
  SELECT
    paid.qty,
    paid.gross,
    paid.fees,
    paid.gross,
    withdrawals.withdrawn,
    withdrawals.pending,
    refunds.refunded,
    refunds.pending,
    GREATEST(
      paid.gross - withdrawals.withdrawn - withdrawals.pending - refunds.refunded - refunds.pending,
      0
    )
  FROM paid, withdrawals, refunds;
$$;
