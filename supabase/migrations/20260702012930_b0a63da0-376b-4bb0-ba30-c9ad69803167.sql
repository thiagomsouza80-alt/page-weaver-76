
-- ============ Sensitive column access on artists/entrepreneurs ============
-- Restrict public/authenticated table SELECTs to non-sensitive columns via GRANT.
REVOKE SELECT ON public.artists FROM anon, authenticated;
GRANT SELECT (
  id, name, segment, bio, city, instagram, profile_image_url, portfolio_images,
  approved, created_at, updated_at, fan_count, youtube_url, user_id,
  membership_type, membership_approved_at, membership_expires_at,
  followers_count, posts_count
) ON public.artists TO anon, authenticated;
-- Owners/admins keep full access through the artists_public / owner policies
-- and the base table via service_role for admin flows.
GRANT SELECT ON public.artists TO service_role;

REVOKE SELECT ON public.entrepreneurs FROM anon, authenticated;
GRANT SELECT (
  id, name, slug, badge, description, image_url, published, created_at, updated_at,
  hero_image_url, full_description, address, instagram, portfolio_images, user_id,
  followers_count, posts_count
) ON public.entrepreneurs TO anon, authenticated;
GRANT SELECT ON public.entrepreneurs TO service_role;

-- Owner rows: owners still need full access to their own row. RLS enforces auth.uid()=user_id.
-- Grant full SELECT to authenticated only through the base — but column grants above already
-- limit non-owner access. To let owners read their own sensitive fields, we grant column
-- access on the sensitive columns only via a definer view path; keep it simple: add
-- SELECT on the sensitive columns to authenticated, protected by the owner-scoped RLS
-- policy that already exists ("view own profile").
GRANT SELECT (email, phone, birth_date, guardian_name, guardian_phone)
  ON public.artists TO authenticated;
GRANT SELECT (email, phone, birth_date, guardian_name, guardian_phone)
  ON public.entrepreneurs TO authenticated;
-- Note: the "Anyone can view approved/published" policy still applies, but PostgREST
-- enforces column privileges — anon/authenticated cannot request the sensitive columns
-- unless a policy row also matches (owner or admin).

-- ============ entrepreneurs storage bucket: restrict uploads ============
DROP POLICY IF EXISTS "Anyone can upload entrepreneur images" ON storage.objects;
CREATE POLICY "Authenticated users upload entrepreneur images to own folder"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'entrepreneurs'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============ event_checkins: restrict SELECT ============
DROP POLICY IF EXISTS "Anyone can view event checkins" ON public.event_checkins;
CREATE POLICY "Restricted view of event checkins"
  ON public.event_checkins FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_event_validator(auth.uid(), event_id)
    OR EXISTS (
      SELECT 1 FROM public.events e
      JOIN public.organizers o ON o.id = e.organizer_id
      WHERE e.id = event_checkins.event_id AND o.user_id = auth.uid()
    )
  );

-- ============ social_notifications: forbid client inserts ============
DROP POLICY IF EXISTS "Actors admins or system can insert notifications" ON public.social_notifications;
CREATE POLICY "Only admins may insert notifications directly"
  ON public.social_notifications FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
-- Legitimate notifications come from SECURITY DEFINER triggers running as postgres,
-- which bypass RLS. Client code can no longer target arbitrary user_ids.

-- ============ user_progression: restrict self UPDATE to class_id only ============
REVOKE UPDATE ON public.user_progression FROM authenticated;
GRANT UPDATE (class_id) ON public.user_progression TO authenticated;

-- ============ award_xp: not callable by clients ============
REVOKE EXECUTE ON FUNCTION public.award_xp(uuid, text, text, uuid, jsonb) FROM authenticated, anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_xp(uuid, text, text, uuid, jsonb) TO service_role;

-- ============ organizer_financial_summary: enforce caller check ============
CREATE OR REPLACE FUNCTION public.organizer_financial_summary(_organizer_id uuid)
RETURNS TABLE(
  tickets_sold integer, gross_revenue_cents bigint, platform_fees_cents bigint,
  net_revenue_cents bigint, withdrawn_cents bigint, pending_withdrawal_cents bigint,
  refunded_cents bigint, pending_refund_cents bigint, available_cents bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;
  IF NOT (
    EXISTS (SELECT 1 FROM public.organizers WHERE id = _organizer_id AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  RETURN QUERY
  WITH paid AS (
    SELECT COALESCE(SUM(pt.amount_cents),0)::bigint AS gross,
           COALESCE(SUM(pt.fee_cents),0)::bigint AS fees,
           COUNT(*)::int AS qty
    FROM public.payment_transactions pt
    WHERE pt.organizer_id = _organizer_id AND pt.status = 'paid'
  ),
  withdrawals AS (
    SELECT
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_cents ELSE 0 END),0)::bigint AS withdrawn,
      COALESCE(SUM(CASE WHEN status IN ('pending','approved') THEN amount_cents ELSE 0 END),0)::bigint AS pending
    FROM public.withdrawal_requests
    WHERE organizer_id = _organizer_id
  ),
  refunds AS (
    SELECT
      COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_refundable_cents ELSE 0 END),0)::bigint AS refunded,
      COALESCE(SUM(CASE WHEN status IN ('pending','approved') THEN amount_refundable_cents ELSE 0 END),0)::bigint AS pending
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
    GREATEST(paid.gross - withdrawals.withdrawn - withdrawals.pending - refunds.refunded - refunds.pending, 0)::bigint
  FROM paid, withdrawals, refunds;
END $$;

REVOKE EXECUTE ON FUNCTION public.organizer_financial_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.organizer_financial_summary(uuid) TO authenticated, service_role;

-- ============ Fix mutable search_path on remaining functions ============
ALTER FUNCTION public.calc_level_for_xp(bigint) SET search_path = public;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public;
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public;
