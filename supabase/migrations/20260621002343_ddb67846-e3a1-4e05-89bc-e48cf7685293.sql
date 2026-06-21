
-- Logs de convites de validadores
CREATE TABLE IF NOT EXISTS public.validator_invitation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid REFERENCES public.events(id) ON DELETE CASCADE,
  organizer_id uuid REFERENCES public.organizers(id) ON DELETE CASCADE,
  target_user_id uuid,
  target_name text,
  target_email text,
  action text NOT NULL CHECK (action IN ('invited','accepted','removed','status_changed')),
  actor_user_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.validator_invitation_logs TO authenticated;
GRANT ALL ON public.validator_invitation_logs TO service_role;

ALTER TABLE public.validator_invitation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read all invitation logs"
  ON public.validator_invitation_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Organizers read own invitation logs"
  ON public.validator_invitation_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.organizers o WHERE o.id = organizer_id AND o.user_id = auth.uid()));

CREATE POLICY "Organizer or admin insert invitation logs"
  ON public.validator_invitation_logs FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.organizers o WHERE o.id = organizer_id AND o.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_validator_invitation_logs_event ON public.validator_invitation_logs(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_validator_invitation_logs_organizer ON public.validator_invitation_logs(organizer_id, created_at DESC);

-- Nova busca: também procura em auth.users (e-mail) e devolve papéis combinados, com paginação
CREATE OR REPLACE FUNCTION public.search_users_for_validator_v2(_q text, _limit integer DEFAULT 10, _offset integer DEFAULT 0)
RETURNS TABLE(
  user_id uuid,
  name text,
  email text,
  phone text,
  city text,
  avatar_url text,
  account_types text[]
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _caller uuid := auth.uid();
  _is_admin boolean;
  _is_organizer boolean;
  _term text;
  _safe_limit integer;
  _safe_offset integer;
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  _is_admin := public.has_role(_caller,'admin'::app_role);
  _is_organizer := EXISTS (SELECT 1 FROM public.organizers WHERE user_id = _caller);
  IF NOT _is_admin AND NOT _is_organizer THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  IF length(coalesce(_q,'')) < 2 THEN RETURN; END IF;
  _term := '%' || lower(_q) || '%';
  _safe_limit := LEAST(GREATEST(coalesce(_limit,10), 1), 50);
  _safe_offset := GREATEST(coalesce(_offset,0), 0);

  RETURN QUERY
  WITH all_profiles AS (
    SELECT a.user_id, a.name, a.email, a.phone, a.city, a.profile_image_url AS avatar_url, 'artist'::text AS account_type
      FROM public.artists a WHERE a.user_id IS NOT NULL
        AND (lower(a.name) LIKE _term OR lower(coalesce(a.email,'')) LIKE _term OR lower(coalesce(a.phone,'')) LIKE _term)
    UNION ALL
    SELECT e.user_id, e.name, e.email, e.phone, NULL::text, e.logo_url, 'entrepreneur'::text
      FROM public.entrepreneurs e WHERE e.user_id IS NOT NULL
        AND (lower(e.name) LIKE _term OR lower(coalesce(e.email,'')) LIKE _term OR lower(coalesce(e.phone,'')) LIKE _term)
    UNION ALL
    SELECT o.user_id, o.name, o.email, o.phone, NULL::text, o.logo_url, 'organizer'::text
      FROM public.organizers o WHERE o.user_id IS NOT NULL
        AND (lower(o.name) LIKE _term OR lower(coalesce(o.email,'')) LIKE _term OR lower(coalesce(o.phone,'')) LIKE _term)
    UNION ALL
    -- Fallback: usuários do auth sem perfil, buscando por e-mail
    SELECT u.id, COALESCE(u.raw_user_meta_data->>'name', u.email), u.email::text, NULL::text, NULL::text,
           u.raw_user_meta_data->>'avatar_url', 'user'::text
      FROM auth.users u
      WHERE lower(u.email) LIKE _term
        AND NOT EXISTS (SELECT 1 FROM public.artists a WHERE a.user_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM public.entrepreneurs e WHERE e.user_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM public.organizers o WHERE o.user_id = u.id)
  ),
  aggregated AS (
    SELECT
      p.user_id,
      (array_agg(p.name ORDER BY p.account_type))[1] AS name,
      (array_agg(p.email ORDER BY p.account_type) FILTER (WHERE p.email IS NOT NULL))[1] AS email,
      (array_agg(p.phone ORDER BY p.account_type) FILTER (WHERE p.phone IS NOT NULL))[1] AS phone,
      (array_agg(p.city ORDER BY p.account_type) FILTER (WHERE p.city IS NOT NULL))[1] AS city,
      (array_agg(p.avatar_url ORDER BY p.account_type) FILTER (WHERE p.avatar_url IS NOT NULL))[1] AS avatar_url,
      array_agg(DISTINCT p.account_type) AS account_types
    FROM all_profiles p
    GROUP BY p.user_id
  )
  SELECT * FROM aggregated
  ORDER BY name ASC
  LIMIT _safe_limit OFFSET _safe_offset;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_users_for_validator_v2(text, integer, integer) TO authenticated;
