
-- Pop coins column
ALTER TABLE public.game_players ADD COLUMN IF NOT EXISTS pop_coins BIGINT NOT NULL DEFAULT 0;

-- =====================================================================
-- game_missions
-- =====================================================================
CREATE TABLE public.game_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  mission_type TEXT NOT NULL DEFAULT 'one_off' CHECK (mission_type IN ('daily','weekly','one_off')),
  target_value INTEGER NOT NULL DEFAULT 1,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  coin_reward INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, code)
);
GRANT SELECT ON public.game_missions TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.game_missions TO authenticated;
GRANT ALL ON public.game_missions TO service_role;
ALTER TABLE public.game_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views missions" ON public.game_missions FOR SELECT USING (true);
CREATE POLICY "Owner dev or admin manages missions" ON public.game_missions FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role) OR
    EXISTS (SELECT 1 FROM public.games g JOIN public.game_developers d ON d.id = g.developer_id
            WHERE g.id = game_missions.game_id AND d.user_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::app_role) OR
    EXISTS (SELECT 1 FROM public.games g JOIN public.game_developers d ON d.id = g.developer_id
            WHERE g.id = game_missions.game_id AND d.user_id = auth.uid())
  );
CREATE TRIGGER trg_game_missions_updated BEFORE UPDATE ON public.game_missions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- game_user_mission_progress
-- =====================================================================
CREATE TABLE public.game_user_mission_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_id UUID NOT NULL REFERENCES public.game_missions(id) ON DELETE CASCADE,
  progress INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ,
  period_key TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, mission_id, period_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_user_mission_progress TO authenticated;
GRANT ALL ON public.game_user_mission_progress TO service_role;
ALTER TABLE public.game_user_mission_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin views progress" ON public.game_user_mission_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Owner manages progress" ON public.game_user_mission_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_gump_updated BEFORE UPDATE ON public.game_user_mission_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================================
-- game_daily_claims
-- =====================================================================
CREATE TABLE public.game_daily_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  claim_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  streak INTEGER NOT NULL DEFAULT 1,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  coins_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_id, claim_date)
);
GRANT SELECT, INSERT ON public.game_daily_claims TO authenticated;
GRANT ALL ON public.game_daily_claims TO service_role;
ALTER TABLE public.game_daily_claims ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner or admin views claims" ON public.game_daily_claims FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Owner inserts claims" ON public.game_daily_claims FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =====================================================================
-- game_achievements + game_user_achievements
-- =====================================================================
CREATE TABLE public.game_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  xp_reward INTEGER NOT NULL DEFAULT 0,
  coin_reward INTEGER NOT NULL DEFAULT 0,
  rarity TEXT NOT NULL DEFAULT 'common',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, code)
);
GRANT SELECT ON public.game_achievements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.game_achievements TO authenticated;
GRANT ALL ON public.game_achievements TO service_role;
ALTER TABLE public.game_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views achievements" ON public.game_achievements FOR SELECT USING (true);
CREATE POLICY "Owner dev or admin manages achievements" ON public.game_achievements FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role) OR
    EXISTS (SELECT 1 FROM public.games g JOIN public.game_developers d ON d.id = g.developer_id
            WHERE g.id = game_achievements.game_id AND d.user_id = auth.uid())
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::app_role) OR
    EXISTS (SELECT 1 FROM public.games g JOIN public.game_developers d ON d.id = g.developer_id
            WHERE g.id = game_achievements.game_id AND d.user_id = auth.uid())
  );
CREATE TRIGGER trg_game_ach_updated BEFORE UPDATE ON public.game_achievements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.game_user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.game_achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);
GRANT SELECT ON public.game_user_achievements TO anon, authenticated;
GRANT INSERT ON public.game_user_achievements TO authenticated;
GRANT ALL ON public.game_user_achievements TO service_role;
ALTER TABLE public.game_user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone views user achievements" ON public.game_user_achievements FOR SELECT USING (true);
CREATE POLICY "Owner inserts achievement" ON public.game_user_achievements FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =====================================================================
-- Helper: add xp+coins to game_players (upserts)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.game_add_xp(_game_id UUID, _xp INTEGER, _coins INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.game_players(user_id, game_id, xp, pop_coins, last_played_at)
  VALUES (_uid, _game_id, GREATEST(_xp,0), GREATEST(_coins,0), now())
  ON CONFLICT (user_id, game_id) DO UPDATE
    SET xp = public.game_players.xp + GREATEST(_xp,0),
        pop_coins = public.game_players.pop_coins + GREATEST(_coins,0),
        last_played_at = now();
  UPDATE public.game_players
    SET level = GREATEST(1, (xp / 100)::int + 1)
    WHERE user_id = _uid AND game_id = _game_id;
END;
$$;

-- =====================================================================
-- Daily claim
-- =====================================================================
CREATE OR REPLACE FUNCTION public.game_claim_daily(_game_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _today DATE := (now() AT TIME ZONE 'utc')::date;
  _last RECORD;
  _streak INT := 1;
  _xp INT;
  _coins INT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF EXISTS(SELECT 1 FROM public.game_daily_claims WHERE user_id=_uid AND game_id=_game_id AND claim_date=_today) THEN
    RAISE EXCEPTION 'Recompensa diária já resgatada hoje';
  END IF;
  SELECT * INTO _last FROM public.game_daily_claims
    WHERE user_id=_uid AND game_id=_game_id ORDER BY claim_date DESC LIMIT 1;
  IF _last.claim_date IS NOT NULL AND _last.claim_date = _today - 1 THEN
    _streak := LEAST(_last.streak + 1, 30);
  END IF;
  _xp := 10 + (_streak * 2);
  _coins := 20 + (_streak * 5);
  INSERT INTO public.game_daily_claims(user_id, game_id, claim_date, streak, xp_awarded, coins_awarded)
    VALUES (_uid, _game_id, _today, _streak, _xp, _coins);
  PERFORM public.game_add_xp(_game_id, _xp, _coins);
  RETURN jsonb_build_object('streak', _streak, 'xp', _xp, 'coins', _coins);
END;
$$;

-- =====================================================================
-- Progress mission
-- =====================================================================
CREATE OR REPLACE FUNCTION public.game_progress_mission(_mission_id UUID, _delta INTEGER DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _m RECORD;
  _pk TEXT := '';
  _rec RECORD;
  _new_progress INT;
  _completed BOOLEAN := false;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO _m FROM public.game_missions WHERE id = _mission_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'mission not found'; END IF;
  IF _m.mission_type = 'daily' THEN
    _pk := to_char(now() AT TIME ZONE 'utc','YYYY-MM-DD');
  ELSIF _m.mission_type = 'weekly' THEN
    _pk := to_char(now() AT TIME ZONE 'utc','IYYY-IW');
  END IF;
  INSERT INTO public.game_user_mission_progress(user_id, mission_id, progress, period_key)
    VALUES (_uid, _mission_id, GREATEST(_delta,0), _pk)
    ON CONFLICT (user_id, mission_id, period_key) DO UPDATE
      SET progress = public.game_user_mission_progress.progress + GREATEST(_delta,0),
          updated_at = now()
    RETURNING * INTO _rec;
  _new_progress := _rec.progress;
  IF _new_progress >= _m.target_value AND _rec.completed_at IS NULL THEN
    UPDATE public.game_user_mission_progress
      SET completed_at = now(), claimed_at = now()
      WHERE id = _rec.id;
    PERFORM public.game_add_xp(_m.game_id, _m.xp_reward, _m.coin_reward);
    _completed := true;
  END IF;
  RETURN jsonb_build_object('progress', _new_progress, 'target', _m.target_value, 'completed', _completed);
END;
$$;

-- =====================================================================
-- Grant achievement (idempotent)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.game_grant_achievement(_achievement_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _a RECORD;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO _a FROM public.game_achievements WHERE id = _achievement_id AND is_active;
  IF NOT FOUND THEN RAISE EXCEPTION 'achievement not found'; END IF;
  IF EXISTS (SELECT 1 FROM public.game_user_achievements WHERE user_id=_uid AND achievement_id=_achievement_id) THEN
    RETURN jsonb_build_object('already', true);
  END IF;
  INSERT INTO public.game_user_achievements(user_id, achievement_id) VALUES (_uid, _achievement_id);
  PERFORM public.game_add_xp(_a.game_id, _a.xp_reward, _a.coin_reward);
  RETURN jsonb_build_object('granted', true, 'xp', _a.xp_reward, 'coins', _a.coin_reward);
END;
$$;
