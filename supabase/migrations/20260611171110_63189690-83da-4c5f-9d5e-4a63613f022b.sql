
-- 1) Organizers: bloquear auto-aprovação
DROP POLICY IF EXISTS "Organizers can update own profile (limited)" ON public.organizers;

CREATE POLICY "Organizers can update own profile (limited)"
  ON public.organizers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND approval_status = (SELECT approval_status FROM public.organizers WHERE id = organizers.id)
    AND approved_at IS NOT DISTINCT FROM (SELECT approved_at FROM public.organizers WHERE id = organizers.id)
    AND rejection_reason IS NOT DISTINCT FROM (SELECT rejection_reason FROM public.organizers WHERE id = organizers.id)
  );

-- 2) Audit logs: substituir INSERT direto por função SECURITY DEFINER
DROP POLICY IF EXISTS "Authenticated insert audit logs" ON public.financial_audit_logs;
REVOKE INSERT ON public.financial_audit_logs FROM authenticated;

CREATE OR REPLACE FUNCTION public.log_financial_event(
  _action text,
  _entity_type text,
  _entity_id uuid,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _role text;
  _log_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF public.has_role(_uid, 'admin'::app_role) THEN
    _role := 'admin';
  ELSIF EXISTS (SELECT 1 FROM public.organizers WHERE user_id = _uid) THEN
    _role := 'organizer';
  ELSE
    _role := 'user';
  END IF;

  INSERT INTO public.financial_audit_logs (
    actor_user_id, actor_role, action, entity_type, entity_id, metadata
  ) VALUES (
    _uid, _role, _action, _entity_type, _entity_id, COALESCE(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO _log_id;

  RETURN _log_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_financial_event(text, text, uuid, jsonb) TO authenticated;
