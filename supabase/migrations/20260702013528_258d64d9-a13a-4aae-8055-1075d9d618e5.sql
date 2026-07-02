
CREATE OR REPLACE FUNCTION public.search_users_for_validator_v2(_q text, _limit integer DEFAULT 10, _offset integer DEFAULT 0)
 RETURNS TABLE(user_id uuid, name text, email text, phone text, city text, avatar_url text, account_types text[])
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  _is_organizer := EXISTS (SELECT 1 FROM public.organizers o WHERE o.user_id = _caller);
  IF NOT _is_admin AND NOT _is_organizer THEN RAISE EXCEPTION 'Acesso negado'; END IF;

  IF length(coalesce(_q,'')) < 2 THEN RETURN; END IF;
  _term := '%' || lower(_q) || '%';
  _safe_limit := LEAST(GREATEST(coalesce(_limit,10), 1), 50);
  _safe_offset := GREATEST(coalesce(_offset,0), 0);

  RETURN QUERY
  WITH all_profiles AS (
    SELECT a.user_id AS uid, a.name AS nm, a.email AS em, a.phone AS ph, a.city AS ct,
           a.profile_image_url AS av, 'artist'::text AS acc
      FROM public.artists a
     WHERE a.user_id IS NOT NULL
       AND (lower(a.name) LIKE _term OR lower(coalesce(a.email,'')) LIKE _term OR lower(coalesce(a.phone,'')) LIKE _term)
    UNION ALL
    SELECT e.user_id, e.name, e.email, e.phone, NULL::text, e.image_url, 'entrepreneur'
      FROM public.entrepreneurs e
     WHERE e.user_id IS NOT NULL
       AND (lower(e.name) LIKE _term OR lower(coalesce(e.email,'')) LIKE _term OR lower(coalesce(e.phone,'')) LIKE _term)
    UNION ALL
    SELECT o.user_id, o.name, o.email, o.phone, NULL::text, o.logo_url, 'organizer'
      FROM public.organizers o
     WHERE o.user_id IS NOT NULL
       AND (lower(o.name) LIKE _term OR lower(coalesce(o.email,'')) LIKE _term OR lower(coalesce(o.phone,'')) LIKE _term)
    UNION ALL
    SELECT u.id, COALESCE(u.raw_user_meta_data->>'name', u.email), u.email::text, NULL::text, NULL::text,
           u.raw_user_meta_data->>'avatar_url', 'user'
      FROM auth.users u
     WHERE lower(u.email) LIKE _term
       AND NOT EXISTS (SELECT 1 FROM public.artists a2 WHERE a2.user_id = u.id)
       AND NOT EXISTS (SELECT 1 FROM public.entrepreneurs e2 WHERE e2.user_id = u.id)
       AND NOT EXISTS (SELECT 1 FROM public.organizers o2 WHERE o2.user_id = u.id)
  ),
  aggregated AS (
    SELECT
      p.uid AS out_uid,
      (array_agg(p.nm ORDER BY p.acc))[1] AS out_name,
      (array_agg(p.em ORDER BY p.acc) FILTER (WHERE p.em IS NOT NULL))[1] AS out_email,
      (array_agg(p.ph ORDER BY p.acc) FILTER (WHERE p.ph IS NOT NULL))[1] AS out_phone,
      (array_agg(p.ct ORDER BY p.acc) FILTER (WHERE p.ct IS NOT NULL))[1] AS out_city,
      (array_agg(p.av ORDER BY p.acc) FILTER (WHERE p.av IS NOT NULL))[1] AS out_avatar,
      array_agg(DISTINCT p.acc) AS out_accs
    FROM all_profiles p
    GROUP BY p.uid
  )
  SELECT a.out_uid, a.out_name, a.out_email, a.out_phone, a.out_city, a.out_avatar, a.out_accs
    FROM aggregated a
   ORDER BY a.out_name ASC
   LIMIT _safe_limit OFFSET _safe_offset;
END;
$function$;

CREATE OR REPLACE FUNCTION public.search_users_for_validator(_q text)
 RETURNS TABLE(user_id uuid, name text, email text, phone text, city text, avatar_url text, account_type text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _caller uuid := auth.uid();
  _is_admin boolean;
  _is_organizer boolean;
  _term text;
BEGIN
  IF _caller IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  _is_admin := public.has_role(_caller, 'admin'::app_role);
  _is_organizer := EXISTS (SELECT 1 FROM public.organizers WHERE user_id = _caller);
  IF NOT _is_admin AND NOT _is_organizer THEN RAISE EXCEPTION 'Acesso negado'; END IF;
  _term := '%' || lower(coalesce(_q,'')) || '%';
  IF length(coalesce(_q,'')) < 2 THEN RETURN; END IF;

  RETURN QUERY
    SELECT a.user_id, a.name, a.email, a.phone, a.city, a.profile_image_url, 'artist'::text
    FROM public.artists a
    WHERE a.user_id IS NOT NULL AND (
      lower(a.name) LIKE _term OR lower(coalesce(a.email,'')) LIKE _term OR lower(coalesce(a.phone,'')) LIKE _term
    ) LIMIT 10;

  RETURN QUERY
    SELECT e.user_id, e.name, e.email, e.phone, NULL::text, e.image_url, 'entrepreneur'::text
    FROM public.entrepreneurs e
    WHERE e.user_id IS NOT NULL AND (
      lower(e.name) LIKE _term OR lower(coalesce(e.email,'')) LIKE _term OR lower(coalesce(e.phone,'')) LIKE _term
    ) LIMIT 10;

  RETURN QUERY
    SELECT o.user_id, o.name, o.email, o.phone, NULL::text, o.logo_url, 'organizer'::text
    FROM public.organizers o
    WHERE o.user_id IS NOT NULL AND (
      lower(o.name) LIKE _term OR lower(coalesce(o.email,'')) LIKE _term OR lower(coalesce(o.phone,'')) LIKE _term
    ) LIMIT 10;
END;
$function$;
