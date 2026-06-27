
CREATE TABLE public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE,
  display_name text,
  headline text,
  bio text,
  avatar_url text,
  cover_url text,
  links jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  show_xp boolean NOT NULL DEFAULT true,
  show_achievements boolean NOT NULL DEFAULT true,
  show_email boolean NOT NULL DEFAULT false,
  show_phone boolean NOT NULL DEFAULT false,
  show_birth_date boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_profiles_username_format
    CHECK (username IS NULL OR (length(username) BETWEEN 3 AND 30 AND username ~ '^[a-zA-Z0-9_.]+$'))
);

GRANT SELECT ON public.user_profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable"
  ON public.user_profiles FOR SELECT
  USING (visibility = 'public' OR auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Users insert own profile"
  ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own profile"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE UNIQUE INDEX user_profiles_username_lower_idx ON public.user_profiles((lower(username)));

CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _base text; _candidate text; _i int := 0;
BEGIN
  _base := lower(regexp_replace(split_part(coalesce(NEW.email,''), '@', 1), '[^a-z0-9_.]', '', 'g'));
  IF _base IS NULL OR length(_base) < 3 THEN
    _base := 'user' || substr(replace(NEW.id::text,'-',''),1,8);
  END IF;
  _candidate := left(_base, 24);
  WHILE EXISTS (SELECT 1 FROM public.user_profiles WHERE lower(username) = _candidate) LOOP
    _i := _i + 1;
    _candidate := left(_base,20) || _i::text;
  END LOOP;
  INSERT INTO public.user_profiles (user_id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    _candidate,
    coalesce(NEW.raw_user_meta_data->>'name', _candidate),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.ensure_user_profile();

-- Backfill
INSERT INTO public.user_profiles (user_id, username, display_name, avatar_url)
SELECT
  u.id,
  left(coalesce(
    nullif(regexp_replace(lower(split_part(u.email,'@',1)), '[^a-z0-9_.]', '', 'g'),''),
    'user' || substr(replace(u.id::text,'-',''),1,8)
  ),20) || substr(replace(u.id::text,'-',''),1,4),
  coalesce(u.raw_user_meta_data->>'name', split_part(u.email,'@',1)),
  u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_public_profile(_username text)
RETURNS TABLE(
  user_id uuid, username text, display_name text, headline text, bio text,
  avatar_url text, cover_url text, links jsonb, visibility text,
  xp bigint, level int, rank_id uuid, class_id uuid,
  followers_count int, following_count int,
  show_achievements boolean, show_xp boolean,
  artist_id uuid, artist_name text, entrepreneur_id uuid, entrepreneur_slug text,
  city text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _p public.user_profiles;
BEGIN
  SELECT * INTO _p FROM public.user_profiles WHERE lower(username) = lower(_username);
  IF _p.user_id IS NULL THEN RETURN; END IF;
  IF _p.visibility <> 'public' AND auth.uid() IS DISTINCT FROM _p.user_id
     AND NOT public.has_role(auth.uid(),'admin'::app_role) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    _p.user_id,
    _p.username,
    coalesce(_p.display_name, _p.username),
    _p.headline,
    _p.bio,
    coalesce(_p.avatar_url, a.profile_image_url, e.hero_image_url),
    _p.cover_url,
    _p.links,
    _p.visibility,
    CASE WHEN _p.show_xp THEN up.xp ELSE NULL END,
    CASE WHEN _p.show_xp THEN up.level ELSE NULL END,
    up.rank_id,
    up.class_id,
    up.followers_count,
    up.following_count,
    _p.show_achievements,
    _p.show_xp,
    a.id, a.name,
    e.id, e.slug,
    a.city
  FROM (SELECT 1) x
  LEFT JOIN public.user_progression up ON up.user_id = _p.user_id
  LEFT JOIN public.artists a ON a.user_id = _p.user_id
  LEFT JOIN public.entrepreneurs e ON e.user_id = _p.user_id;
END $$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;
