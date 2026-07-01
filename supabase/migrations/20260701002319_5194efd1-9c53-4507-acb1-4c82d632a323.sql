
-- ============================================================
-- 1) FIX search_users_for_validator_v2
-- ============================================================
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
    SELECT e.user_id, e.name, e.email, e.phone, NULL::text, e.logo_url, 'entrepreneur'
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

-- ============================================================
-- 2) Rename "Army" -> "K-popper"
-- ============================================================
UPDATE public.classes
   SET name = 'K-popper',
       code = 'kpopper'
 WHERE lower(name) = 'army' OR code = 'army';

-- ============================================================
-- 3) COMMUNITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.communities (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  category text,
  cover_url text,
  is_public boolean NOT NULL DEFAULT true,
  members_count integer NOT NULL DEFAULT 0,
  posts_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.communities TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.communities TO authenticated;
GRANT ALL ON public.communities TO service_role;
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "communities_select_public" ON public.communities FOR SELECT
  USING (is_public = true OR owner_user_id = auth.uid());
CREATE POLICY "communities_insert_artist_only" ON public.communities FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = auth.uid()
    AND (public.has_role(auth.uid(),'admin'::app_role)
         OR EXISTS (SELECT 1 FROM public.artists a WHERE a.user_id = auth.uid()))
  );
CREATE POLICY "communities_update_owner" ON public.communities FOR UPDATE TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "communities_delete_owner" ON public.communities FOR DELETE TO authenticated
  USING (owner_user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER communities_updated_at BEFORE UPDATE ON public.communities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.community_members (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','moderator','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (community_id, user_id)
);
GRANT SELECT ON public.community_members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_members TO authenticated;
GRANT ALL ON public.community_members TO service_role;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cm_select_all" ON public.community_members FOR SELECT USING (true);
CREATE POLICY "cm_insert_self" ON public.community_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "cm_delete_self_or_owner" ON public.community_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin'::app_role)
  );

CREATE OR REPLACE FUNCTION public.is_community_member(_community uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.community_members WHERE community_id=_community AND user_id=_user)
$$;

CREATE TABLE IF NOT EXISTS public.community_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_name text,
  author_avatar_url text,
  content text NOT NULL,
  image_url text,
  likes_count integer NOT NULL DEFAULT 0,
  deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cp_select_members_or_public" ON public.community_posts FOR SELECT TO authenticated
  USING (
    deleted = false AND (
      public.is_community_member(community_id, auth.uid())
      OR EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.owner_user_id = auth.uid())
      OR public.has_role(auth.uid(),'admin'::app_role)
    )
  );
CREATE POLICY "cp_insert_members" ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_community_member(community_id, auth.uid()));
CREATE POLICY "cp_update_own" ON public.community_posts FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "cp_delete_own_or_owner" ON public.community_posts FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.communities c WHERE c.id = community_id AND c.owner_user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin'::app_role)
  );

CREATE TABLE IF NOT EXISTS public.community_post_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.community_post_likes TO authenticated;
GRANT ALL ON public.community_post_likes TO service_role;
ALTER TABLE public.community_post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cpl_select_auth" ON public.community_post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "cpl_insert_self" ON public.community_post_likes FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "cpl_delete_self" ON public.community_post_likes FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.community_members_counter()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE public.communities SET members_count = members_count + 1 WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    UPDATE public.communities SET members_count = GREATEST(members_count-1,0) WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER community_members_counter_trg
AFTER INSERT OR DELETE ON public.community_members
FOR EACH ROW EXECUTE FUNCTION public.community_members_counter();

CREATE OR REPLACE FUNCTION public.community_posts_counter()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE public.communities SET posts_count = posts_count + 1 WHERE id = NEW.community_id;
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    UPDATE public.communities SET posts_count = GREATEST(posts_count-1,0) WHERE id = OLD.community_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER community_posts_counter_trg
AFTER INSERT OR DELETE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.community_posts_counter();

CREATE OR REPLACE FUNCTION public.community_post_likes_counter()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP='DELETE' THEN
    UPDATE public.community_posts SET likes_count = GREATEST(likes_count-1,0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER community_post_likes_counter_trg
AFTER INSERT OR DELETE ON public.community_post_likes
FOR EACH ROW EXECUTE FUNCTION public.community_post_likes_counter();

CREATE OR REPLACE FUNCTION public.community_owner_autojoin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='public' AS $$
BEGIN
  INSERT INTO public.community_members (community_id, user_id, role)
  VALUES (NEW.id, NEW.owner_user_id, 'owner')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;
CREATE TRIGGER community_owner_autojoin_trg
AFTER INSERT ON public.communities
FOR EACH ROW EXECUTE FUNCTION public.community_owner_autojoin();
