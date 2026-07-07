
-- Add new role to app_role enum (must be committed before use)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'game_developer';

-- =========================================================================
-- game_developers: perfil/estúdio de desenvolvedor
-- =========================================================================
CREATE TABLE public.game_developers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  studio_name TEXT NOT NULL,
  bio TEXT,
  logo_url TEXT,
  banner_url TEXT,
  links JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','changes_requested')),
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_developers TO authenticated;
GRANT SELECT ON public.game_developers TO anon;
GRANT ALL ON public.game_developers TO service_role;

ALTER TABLE public.game_developers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved developers"
  ON public.game_developers FOR SELECT
  USING (status = 'approved' OR user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Users can create own developer profile"
  ON public.game_developers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner or admin can update"
  ON public.game_developers FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admin can delete"
  ON public.game_developers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_game_developers_updated
  BEFORE UPDATE ON public.game_developers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- game_developer_requests: histórico
-- =========================================================================
CREATE TABLE public.game_developer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES public.game_developers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  proposed_game_name TEXT,
  category TEXT,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  links JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','changes_requested')),
  admin_notes TEXT,
  decided_at TIMESTAMPTZ,
  decided_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_developer_requests TO authenticated;
GRANT ALL ON public.game_developer_requests TO service_role;

ALTER TABLE public.game_developer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner or admin can view"
  ON public.game_developer_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "User can insert own request"
  ON public.game_developer_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admin can update"
  ON public.game_developer_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_game_dev_requests_updated
  BEFORE UPDATE ON public.game_developer_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- games
-- =========================================================================
CREATE TABLE public.games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  developer_id UUID NOT NULL REFERENCES public.game_developers(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'tcg',
  description TEXT,
  short_description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  trailer_url TEXT,
  screenshots TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT true,
  is_in_development BOOLEAN NOT NULL DEFAULT true,
  version TEXT DEFAULT '0.1.0',
  rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0,
  ratings_count INTEGER NOT NULL DEFAULT 0,
  players_count INTEGER NOT NULL DEFAULT 0,
  last_update_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_games_status ON public.games(status);
CREATE INDEX idx_games_developer ON public.games(developer_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.games TO authenticated;
GRANT SELECT ON public.games TO anon;
GRANT ALL ON public.games TO service_role;

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published games"
  ON public.games FOR SELECT
  USING (
    status = 'published'
    OR public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.game_developers d WHERE d.id = games.developer_id AND d.user_id = auth.uid())
  );

CREATE POLICY "Developer can create own games"
  ON public.games FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.game_developers d
            WHERE d.id = games.developer_id AND d.user_id = auth.uid() AND d.status = 'approved')
  );

CREATE POLICY "Developer or admin can update"
  ON public.games FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.game_developers d WHERE d.id = games.developer_id AND d.user_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.game_developers d WHERE d.id = games.developer_id AND d.user_id = auth.uid())
  );

CREATE POLICY "Developer or admin can delete"
  ON public.games FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.game_developers d WHERE d.id = games.developer_id AND d.user_id = auth.uid())
  );

CREATE TRIGGER trg_games_updated
  BEFORE UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- game_news
-- =========================================================================
CREATE TABLE public.game_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  cover_url TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_game_news_game ON public.game_news(game_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_news TO authenticated;
GRANT SELECT ON public.game_news TO anon;
GRANT ALL ON public.game_news TO service_role;

ALTER TABLE public.game_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published game news"
  ON public.game_news FOR SELECT
  USING (
    published = true
    OR public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.game_developers d ON d.id = g.developer_id
      WHERE g.id = game_news.game_id AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "Developer or admin can manage news"
  ON public.game_news FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.game_developers d ON d.id = g.developer_id
      WHERE g.id = game_news.game_id AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.game_developers d ON d.id = g.developer_id
      WHERE g.id = game_news.game_id AND d.user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_game_news_updated
  BEFORE UPDATE ON public.game_news
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- game_favorites
-- =========================================================================
CREATE TABLE public.game_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_id)
);

GRANT SELECT, INSERT, DELETE ON public.game_favorites TO authenticated;
GRANT ALL ON public.game_favorites TO service_role;

ALTER TABLE public.game_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view favorites"
  ON public.game_favorites FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Owner can insert favorites"
  ON public.game_favorites FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner can delete favorites"
  ON public.game_favorites FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- =========================================================================
-- game_players
-- =========================================================================
CREATE TABLE public.game_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1,
  xp BIGINT NOT NULL DEFAULT 0,
  matches INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_id)
);

CREATE INDEX idx_game_players_game_xp ON public.game_players(game_id, xp DESC);

GRANT SELECT, INSERT, UPDATE ON public.game_players TO authenticated;
GRANT SELECT ON public.game_players TO anon;
GRANT ALL ON public.game_players TO service_role;

ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view players for ranking"
  ON public.game_players FOR SELECT USING (true);

CREATE POLICY "Owner can insert self"
  ON public.game_players FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owner or admin can update"
  ON public.game_players FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

CREATE TRIGGER trg_game_players_updated
  BEFORE UPDATE ON public.game_players
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================================
-- Trigger: ao aprovar desenvolvedor -> concede role game_developer
-- =========================================================================
CREATE OR REPLACE FUNCTION public.game_developer_grant_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.user_id, 'game_developer'::app_role)
    ON CONFLICT DO NOTHING;
    IF NEW.approved_at IS NULL THEN NEW.approved_at := now(); END IF;
    IF NEW.approved_by IS NULL THEN NEW.approved_by := auth.uid(); END IF;

    INSERT INTO public.social_notifications (user_id, type, preview, target_type, target_id)
    VALUES (NEW.user_id, 'game_dev_approved',
      'Sua solicitação de desenvolvedor foi aprovada! Bem-vindo ao Pop Games.',
      'game_developer', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_game_developer_grant_role
  BEFORE UPDATE ON public.game_developers
  FOR EACH ROW EXECUTE FUNCTION public.game_developer_grant_role();

-- =========================================================================
-- Trigger: quando games é publicado -> notifica favoritos
-- =========================================================================
CREATE OR REPLACE FUNCTION public.game_publish_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'published')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'published' AND OLD.status <> 'published') THEN
    INSERT INTO public.social_notifications (user_id, type, preview, target_type, target_id)
    SELECT gf.user_id, 'game_update', 'Novo jogo publicado: ' || LEFT(NEW.name, 100), 'game', NEW.id
    FROM public.game_favorites gf WHERE gf.game_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_games_publish_notify
  AFTER INSERT OR UPDATE ON public.games
  FOR EACH ROW EXECUTE FUNCTION public.game_publish_notify();
