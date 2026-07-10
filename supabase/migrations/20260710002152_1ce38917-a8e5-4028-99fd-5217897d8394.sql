
-- =========================
-- DECKS
-- =========================
CREATE TABLE public.game_decks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_game_decks_user_game ON public.game_decks(user_id, game_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_decks TO authenticated;
GRANT ALL ON public.game_decks TO service_role;
ALTER TABLE public.game_decks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own decks select" ON public.game_decks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own decks insert" ON public.game_decks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own decks update" ON public.game_decks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own decks delete" ON public.game_decks FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_game_decks_updated BEFORE UPDATE ON public.game_decks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- DECK CARDS
-- =========================
CREATE TABLE public.game_deck_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deck_id UUID NOT NULL REFERENCES public.game_decks(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.game_cards(id) ON DELETE CASCADE,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 1 AND quantity <= 20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (deck_id, card_id)
);
CREATE INDEX idx_game_deck_cards_deck ON public.game_deck_cards(deck_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_deck_cards TO authenticated;
GRANT ALL ON public.game_deck_cards TO service_role;
ALTER TABLE public.game_deck_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own deck cards select" ON public.game_deck_cards FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.game_decks d WHERE d.id = deck_id AND d.user_id = auth.uid()));
CREATE POLICY "own deck cards insert" ON public.game_deck_cards FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.game_decks d WHERE d.id = deck_id AND d.user_id = auth.uid()));
CREATE POLICY "own deck cards update" ON public.game_deck_cards FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.game_decks d WHERE d.id = deck_id AND d.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.game_decks d WHERE d.id = deck_id AND d.user_id = auth.uid()));
CREATE POLICY "own deck cards delete" ON public.game_deck_cards FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.game_decks d WHERE d.id = deck_id AND d.user_id = auth.uid()));

-- =========================
-- SEASONS
-- =========================
CREATE TABLE public.game_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  rewards JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','ended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_game_seasons_game ON public.game_seasons(game_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_seasons TO authenticated;
GRANT ALL ON public.game_seasons TO service_role;
ALTER TABLE public.game_seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seasons select active or owner" ON public.game_seasons FOR SELECT TO authenticated
  USING (
    status = 'active'
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.game_developers d ON d.id = g.developer_id
      WHERE g.id = game_id AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "seasons insert owner" ON public.game_seasons FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.game_developers d ON d.id = g.developer_id
      WHERE g.id = game_id AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "seasons update owner" ON public.game_seasons FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.game_developers d ON d.id = g.developer_id
      WHERE g.id = game_id AND d.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.game_developers d ON d.id = g.developer_id
      WHERE g.id = game_id AND d.user_id = auth.uid()
    )
  );

CREATE POLICY "seasons delete owner" ON public.game_seasons FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.games g
      JOIN public.game_developers d ON d.id = g.developer_id
      WHERE g.id = game_id AND d.user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_game_seasons_updated BEFORE UPDATE ON public.game_seasons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- Guarantee only one active deck per (user, game)
-- =========================
CREATE OR REPLACE FUNCTION public.game_decks_single_active()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_active THEN
    UPDATE public.game_decks
      SET is_active = false
      WHERE user_id = NEW.user_id
        AND game_id = NEW.game_id
        AND id <> NEW.id
        AND is_active = true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_game_decks_single_active
AFTER INSERT OR UPDATE OF is_active ON public.game_decks
FOR EACH ROW WHEN (NEW.is_active) EXECUTE FUNCTION public.game_decks_single_active();
