
-- Fase 3: Stories (24h) + Destaques

CREATE TABLE public.social_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  media_url text not null,
  media_type text not null check (media_type in ('image','video')),
  thumbnail_url text,
  caption text,
  link_url text,
  duration_seconds int not null default 5,
  views_count int not null default 0,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  deleted boolean not null default false,
  created_at timestamptz not null default now()
);
CREATE INDEX idx_social_stories_user ON public.social_stories(user_id, created_at desc);
CREATE INDEX idx_social_stories_active ON public.social_stories(expires_at) WHERE deleted = false;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_stories TO authenticated;
GRANT SELECT ON public.social_stories TO anon;
GRANT ALL ON public.social_stories TO service_role;
ALTER TABLE public.social_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stories_select_active" ON public.social_stories FOR SELECT
  USING (deleted = false AND expires_at > now());
CREATE POLICY "stories_select_own" ON public.social_stories FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "stories_insert_own" ON public.social_stories FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "stories_update_own" ON public.social_stories FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "stories_delete_own" ON public.social_stories FOR DELETE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));

-- Visualizações
CREATE TABLE public.social_story_views (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.social_stories(id) on delete cascade,
  viewer_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(story_id, viewer_user_id)
);
CREATE INDEX idx_story_views_story ON public.social_story_views(story_id);

GRANT SELECT, INSERT ON public.social_story_views TO authenticated;
GRANT ALL ON public.social_story_views TO service_role;
ALTER TABLE public.social_story_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "story_views_insert_self" ON public.social_story_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_user_id);
CREATE POLICY "story_views_select_owner" ON public.social_story_views FOR SELECT
  USING (
    auth.uid() = viewer_user_id
    OR EXISTS(SELECT 1 FROM public.social_stories s WHERE s.id = story_id AND s.user_id = auth.uid())
    OR public.has_role(auth.uid(),'admin'::app_role)
  );

-- Destaques (highlights)
CREATE TABLE public.social_story_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  cover_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_story_highlights TO authenticated;
GRANT SELECT ON public.social_story_highlights TO anon;
GRANT ALL ON public.social_story_highlights TO service_role;
ALTER TABLE public.social_story_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "highlights_select_all" ON public.social_story_highlights FOR SELECT USING (true);
CREATE POLICY "highlights_manage_own" ON public.social_story_highlights FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_highlights_updated_at BEFORE UPDATE ON public.social_story_highlights
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Itens dos destaques (snapshot da mídia, sobrevive aos 24h)
CREATE TABLE public.social_story_highlight_items (
  id uuid primary key default gen_random_uuid(),
  highlight_id uuid not null references public.social_story_highlights(id) on delete cascade,
  story_id uuid references public.social_stories(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  media_url text not null,
  media_type text not null,
  caption text,
  link_url text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
CREATE INDEX idx_highlight_items_h ON public.social_story_highlight_items(highlight_id, sort_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_story_highlight_items TO authenticated;
GRANT SELECT ON public.social_story_highlight_items TO anon;
GRANT ALL ON public.social_story_highlight_items TO service_role;
ALTER TABLE public.social_story_highlight_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hitems_select_all" ON public.social_story_highlight_items FOR SELECT USING (true);
CREATE POLICY "hitems_manage_own" ON public.social_story_highlight_items FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Função: incrementar view + registrar
CREATE OR REPLACE FUNCTION public.story_register_view(_story_id uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _ins boolean;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  INSERT INTO public.social_story_views(story_id, viewer_user_id)
  VALUES (_story_id, _uid)
  ON CONFLICT (story_id, viewer_user_id) DO NOTHING
  RETURNING true INTO _ins;
  IF _ins THEN
    UPDATE public.social_stories SET views_count = views_count + 1 WHERE id = _story_id;
    PERFORM public.award_xp(_uid, 'view_story', 'story', _story_id);
  END IF;
END $$;

-- Função: feed de stories (agrupado por autor, somente ativos)
CREATE OR REPLACE FUNCTION public.get_active_stories_feed()
RETURNS TABLE(
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  story_count int,
  latest_at timestamptz,
  has_unseen boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _viewer uuid := auth.uid();
BEGIN
  RETURN QUERY
  SELECT
    s.user_id,
    up.username,
    coalesce(up.display_name, up.username),
    coalesce(up.avatar_url, a.profile_image_url, e.logo_url),
    count(s.id)::int AS story_count,
    max(s.created_at) AS latest_at,
    bool_or(
      _viewer IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.social_story_views v
        WHERE v.story_id = s.id AND v.viewer_user_id = _viewer
      )
    ) AS has_unseen
  FROM public.social_stories s
  LEFT JOIN public.user_profiles up ON up.user_id = s.user_id
  LEFT JOIN public.artists a ON a.user_id = s.user_id
  LEFT JOIN public.entrepreneurs e ON e.user_id = s.user_id
  WHERE s.deleted = false AND s.expires_at > now()
  GROUP BY s.user_id, up.username, up.display_name, up.avatar_url, a.profile_image_url, e.logo_url
  ORDER BY has_unseen DESC NULLS LAST, latest_at DESC;
END $$;

-- XP rule para postar story e ver story
INSERT INTO public.xp_rules (action, label, xp, daily_cap, cooldown_seconds, per_target_once, is_active)
VALUES
  ('create_story', 'Publicar story', 10, 50, 0, false, true),
  ('view_story', 'Ver story', 1, 20, 0, true, true)
ON CONFLICT (action) DO NOTHING;

-- Trigger XP em novo story
CREATE OR REPLACE FUNCTION public.xp_on_story()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.award_xp(NEW.user_id, 'create_story', 'story', NEW.id); RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW; END $$;
CREATE TRIGGER trg_xp_on_story AFTER INSERT ON public.social_stories
  FOR EACH ROW EXECUTE FUNCTION public.xp_on_story();

-- RLS no bucket "stories"
CREATE POLICY "stories_bucket_select_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'stories');
CREATE POLICY "stories_bucket_select_anon" ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'stories');
CREATE POLICY "stories_bucket_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "stories_bucket_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'stories' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "stories_bucket_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'stories' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin'::app_role)));
