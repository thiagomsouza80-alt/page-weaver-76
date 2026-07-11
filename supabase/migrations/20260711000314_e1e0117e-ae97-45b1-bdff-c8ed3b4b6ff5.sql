
-- =========================================================
-- JOANO TCG — Fase 3: Motor de Partidas 1x1 (e base 2x2)
-- =========================================================

-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE public.game_match_mode AS ENUM ('1v1', '2v2');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE public.game_match_status AS ENUM ('waiting', 'active', 'finished', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============ TABLES ============

-- Partidas
CREATE TABLE IF NOT EXISTS public.game_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  mode public.game_match_mode NOT NULL DEFAULT '1v1',
  status public.game_match_status NOT NULL DEFAULT 'waiting',
  current_turn INTEGER NOT NULL DEFAULT 0,
  current_player_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  winner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  winner_team INTEGER,
  score JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.game_matches TO authenticated;
GRANT ALL ON public.game_matches TO service_role;
ALTER TABLE public.game_matches ENABLE ROW LEVEL SECURITY;

-- Jogadores da partida
CREATE TABLE IF NOT EXISTS public.game_match_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.game_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  seat INTEGER NOT NULL,
  team INTEGER NOT NULL DEFAULT 1,
  deck_id UUID REFERENCES public.game_decks(id) ON DELETE SET NULL,
  hand JSONB NOT NULL DEFAULT '[]'::jsonb,
  deck_remaining JSONB NOT NULL DEFAULT '[]'::jsonb,
  discard JSONB NOT NULL DEFAULT '[]'::jsonb,
  score INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, seat),
  UNIQUE (match_id, user_id)
);

GRANT SELECT ON public.game_match_players TO authenticated;
GRANT ALL ON public.game_match_players TO service_role;
ALTER TABLE public.game_match_players ENABLE ROW LEVEL SECURITY;

-- Turnos
CREATE TABLE IF NOT EXISTS public.game_match_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.game_matches(id) ON DELETE CASCADE,
  turn_number INTEGER NOT NULL,
  player_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  dice_roll INTEGER,
  chosen_attribute TEXT,
  player_card_id UUID REFERENCES public.game_cards(id) ON DELETE SET NULL,
  opponent_card_id UUID REFERENCES public.game_cards(id) ON DELETE SET NULL,
  player_value NUMERIC,
  opponent_value NUMERIC,
  outcome TEXT,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, turn_number)
);

GRANT SELECT ON public.game_match_turns TO authenticated;
GRANT ALL ON public.game_match_turns TO service_role;
ALTER TABLE public.game_match_turns ENABLE ROW LEVEL SECURITY;

-- Fila de matchmaking
CREATE TABLE IF NOT EXISTS public.game_match_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode public.game_match_mode NOT NULL DEFAULT '1v1',
  deck_id UUID REFERENCES public.game_decks(id) ON DELETE SET NULL,
  matched_match_id UUID REFERENCES public.game_matches(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'waiting',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, user_id, mode)
);

GRANT SELECT, INSERT, DELETE ON public.game_match_queue TO authenticated;
GRANT ALL ON public.game_match_queue TO service_role;
ALTER TABLE public.game_match_queue ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES ============

-- game_matches: participante pode ver
DROP POLICY IF EXISTS "Participants can view matches" ON public.game_matches;
CREATE POLICY "Participants can view matches" ON public.game_matches
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.game_match_players p
      WHERE p.match_id = game_matches.id AND p.user_id = auth.uid()
    )
  );

-- game_match_players: participante pode ver todos da mesma partida
DROP POLICY IF EXISTS "Participants can view players" ON public.game_match_players;
CREATE POLICY "Participants can view players" ON public.game_match_players
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.game_match_players p2
      WHERE p2.match_id = game_match_players.match_id AND p2.user_id = auth.uid()
    )
  );

-- game_match_turns: participante pode ver
DROP POLICY IF EXISTS "Participants can view turns" ON public.game_match_turns;
CREATE POLICY "Participants can view turns" ON public.game_match_turns
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.game_match_players p
      WHERE p.match_id = game_match_turns.match_id AND p.user_id = auth.uid()
    )
  );

-- game_match_queue: usuário gerencia a própria entrada
DROP POLICY IF EXISTS "Users manage own queue" ON public.game_match_queue;
CREATE POLICY "Users manage own queue" ON public.game_match_queue
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own queue" ON public.game_match_queue;
CREATE POLICY "Users insert own queue" ON public.game_match_queue
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users delete own queue" ON public.game_match_queue;
CREATE POLICY "Users delete own queue" ON public.game_match_queue
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ============ TRIGGERS ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_game_matches_updated_at ON public.game_matches;
CREATE TRIGGER update_game_matches_updated_at
  BEFORE UPDATE ON public.game_matches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_match_players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_match_turns;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_match_queue;

ALTER TABLE public.game_matches REPLICA IDENTITY FULL;
ALTER TABLE public.game_match_players REPLICA IDENTITY FULL;
ALTER TABLE public.game_match_turns REPLICA IDENTITY FULL;
ALTER TABLE public.game_match_queue REPLICA IDENTITY FULL;
