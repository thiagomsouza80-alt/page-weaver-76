
INSERT INTO public.classes (code, name, description, icon, color, sort_order, is_active)
SELECT 'youtuber','Youtuber','Criadores de conteúdo no YouTube','youtube','#ff0033',9,true
WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE code='youtuber' OR name='Youtuber');

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_class_id ON public.user_profiles(class_id);

CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _base text; _candidate text; _i int := 0; _class uuid;
BEGIN
  _base := lower(regexp_replace(split_part(coalesce(NEW.email,''), '@', 1), '[^a-z0-9_.]', '', 'g'));
  IF _base IS NULL OR length(_base) < 3 THEN
    _base := 'user' || substr(replace(NEW.id::text,'-',''),1,8);
  END IF;
  _candidate := left(_base, 24);
  WHILE EXISTS (SELECT 1 FROM public.user_profiles WHERE lower(username) = _candidate) LOOP
    _i := _i + 1; _candidate := left(_base,20) || _i::text;
  END LOOP;
  BEGIN _class := nullif(NEW.raw_user_meta_data->>'class_id','')::uuid;
  EXCEPTION WHEN OTHERS THEN _class := NULL; END;

  INSERT INTO public.user_profiles (user_id, username, display_name, avatar_url, class_id)
  VALUES (NEW.id, _candidate, coalesce(NEW.raw_user_meta_data->>'name', _candidate),
          NEW.raw_user_meta_data->>'avatar_url', _class)
  ON CONFLICT (user_id) DO UPDATE
    SET class_id = COALESCE(public.user_profiles.class_id, EXCLUDED.class_id);

  IF _class IS NOT NULL THEN
    INSERT INTO public.user_progression (user_id, class_id) VALUES (NEW.id, _class)
    ON CONFLICT (user_id) DO UPDATE SET class_id = EXCLUDED.class_id;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.sync_class_to_progression()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.class_id IS DISTINCT FROM OLD.class_id AND NEW.class_id IS NOT NULL THEN
    INSERT INTO public.user_progression (user_id, class_id) VALUES (NEW.user_id, NEW.class_id)
    ON CONFLICT (user_id) DO UPDATE SET class_id = EXCLUDED.class_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_class_to_progression ON public.user_profiles;
CREATE TRIGGER trg_sync_class_to_progression
  AFTER UPDATE OF class_id ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_class_to_progression();

DROP FUNCTION IF EXISTS public.get_public_profile(text);
CREATE FUNCTION public.get_public_profile(_username text)
RETURNS TABLE(
  user_id uuid, username text, display_name text, headline text, bio text,
  avatar_url text, cover_url text, links jsonb, visibility text,
  xp bigint, level integer, rank_id uuid, class_id uuid,
  class_name text, class_icon text, class_color text,
  followers_count integer, following_count integer,
  show_achievements boolean, show_xp boolean,
  artist_id uuid, artist_name text, entrepreneur_id uuid, entrepreneur_slug text, city text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE _p public.user_profiles;
BEGIN
  SELECT * INTO _p FROM public.user_profiles WHERE lower(username) = lower(_username);
  IF _p.user_id IS NULL THEN RETURN; END IF;
  IF _p.visibility <> 'public' AND auth.uid() IS DISTINCT FROM _p.user_id
     AND NOT public.has_role(auth.uid(),'admin'::app_role) THEN RETURN; END IF;
  RETURN QUERY
  SELECT _p.user_id, _p.username, coalesce(_p.display_name, _p.username),
    _p.headline, _p.bio,
    coalesce(_p.avatar_url, a.profile_image_url, e.hero_image_url),
    _p.cover_url, _p.links, _p.visibility,
    CASE WHEN _p.show_xp THEN up.xp ELSE NULL END,
    CASE WHEN _p.show_xp THEN up.level ELSE NULL END,
    up.rank_id, COALESCE(_p.class_id, up.class_id),
    c.name, c.icon, c.color,
    up.followers_count, up.following_count,
    _p.show_achievements, _p.show_xp,
    a.id, a.name, e.id, e.slug, a.city
  FROM (SELECT 1) x
  LEFT JOIN public.user_progression up ON up.user_id = _p.user_id
  LEFT JOIN public.classes c ON c.id = COALESCE(_p.class_id, up.class_id)
  LEFT JOIN public.artists a ON a.user_id = _p.user_id
  LEFT JOIN public.entrepreneurs e ON e.user_id = _p.user_id;
END $$;

DO $$
DECLARE
  cls_cosplayer uuid; cls_army uuid; cls_youtuber uuid; cls_influ uuid;
  cls_fan uuid; cls_artista uuid; cls_emp uuid; cls_org uuid;
BEGIN
  SELECT id INTO cls_cosplayer FROM public.classes WHERE name='Cosplayer';
  SELECT id INTO cls_army FROM public.classes WHERE name='Army';
  SELECT id INTO cls_youtuber FROM public.classes WHERE name='Youtuber';
  SELECT id INTO cls_influ FROM public.classes WHERE name='Influenciador';
  SELECT id INTO cls_fan FROM public.classes WHERE name='Fã';
  SELECT id INTO cls_artista FROM public.classes WHERE name='Artista';
  SELECT id INTO cls_emp FROM public.classes WHERE name='Empreendedor';
  SELECT id INTO cls_org FROM public.classes WHERE name='Organizador de Eventos';

  INSERT INTO public.user_profiles (user_id, username, display_name)
  SELECT u.id,
    left(lower(regexp_replace(split_part(coalesce(u.email,'user'||substr(replace(u.id::text,'-',''),1,8)),'@',1),'[^a-z0-9_.]','','g')),24),
    coalesce(u.raw_user_meta_data->>'name', split_part(u.email,'@',1))
  FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.user_id = u.id)
  ON CONFLICT DO NOTHING;

  UPDATE public.user_profiles p
  SET class_id = CASE a.segment
    WHEN 'cosplayer' THEN cls_cosplayer
    WHEN 'cosmaker' THEN cls_cosplayer
    WHEN 'kpop' THEN cls_army
    WHEN 'youtuber' THEN cls_youtuber
    WHEN 'influenciador_digital' THEN cls_influ
    WHEN 'fan_cultura_pop' THEN cls_fan
    WHEN 'ilustrador' THEN cls_artista
    WHEN 'quadrinista' THEN cls_artista
    WHEN 'colecionador' THEN cls_fan
    WHEN 'desenvolvedor_jogos' THEN cls_artista
    ELSE cls_artista END
  FROM public.artists a WHERE a.user_id = p.user_id AND p.class_id IS NULL;

  UPDATE public.user_profiles p SET class_id = cls_emp
  FROM public.entrepreneurs e WHERE e.user_id = p.user_id AND p.class_id IS NULL;

  UPDATE public.user_profiles p SET class_id = cls_org
  FROM public.organizers o WHERE o.user_id = p.user_id AND p.class_id IS NULL;

  INSERT INTO public.user_progression (user_id, class_id)
  SELECT p.user_id, p.class_id FROM public.user_profiles p WHERE p.class_id IS NOT NULL
  ON CONFLICT (user_id) DO UPDATE
    SET class_id = COALESCE(public.user_progression.class_id, EXCLUDED.class_id);
END $$;
