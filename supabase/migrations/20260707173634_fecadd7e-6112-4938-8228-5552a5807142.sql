
-- game_card_collections
CREATE TABLE public.game_card_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_card_collections TO authenticated;
GRANT SELECT ON public.game_card_collections TO anon;
GRANT ALL ON public.game_card_collections TO service_role;
ALTER TABLE public.game_card_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active collections" ON public.game_card_collections FOR SELECT
  USING (is_active OR public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.games g JOIN public.game_developers d ON d.id=g.developer_id
               WHERE g.id=game_card_collections.game_id AND d.user_id=auth.uid()));
CREATE POLICY "Dev/admin manage collections" ON public.game_card_collections FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.games g JOIN public.game_developers d ON d.id=g.developer_id
               WHERE g.id=game_card_collections.game_id AND d.user_id=auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.games g JOIN public.game_developers d ON d.id=g.developer_id
               WHERE g.id=game_card_collections.game_id AND d.user_id=auth.uid()));
CREATE TRIGGER trg_gcc_updated BEFORE UPDATE ON public.game_card_collections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- game_cards
CREATE TABLE public.game_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES public.game_card_collections(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  rarity TEXT NOT NULL DEFAULT 'common'
    CHECK (rarity IN ('common','uncommon','rare','epic','legendary','mythic')),
  category TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft','retired')),
  custom_attrs JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, code)
);
CREATE INDEX idx_game_cards_game ON public.game_cards(game_id);
CREATE INDEX idx_game_cards_rarity ON public.game_cards(game_id, rarity);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_cards TO authenticated;
GRANT SELECT ON public.game_cards TO anon;
GRANT ALL ON public.game_cards TO service_role;
ALTER TABLE public.game_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active cards" ON public.game_cards FOR SELECT
  USING (status='active' OR public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.games g JOIN public.game_developers d ON d.id=g.developer_id
               WHERE g.id=game_cards.game_id AND d.user_id=auth.uid()));
CREATE POLICY "Dev/admin manage cards" ON public.game_cards FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.games g JOIN public.game_developers d ON d.id=g.developer_id
               WHERE g.id=game_cards.game_id AND d.user_id=auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.games g JOIN public.game_developers d ON d.id=g.developer_id
               WHERE g.id=game_cards.game_id AND d.user_id=auth.uid()));
CREATE TRIGGER trg_game_cards_updated BEFORE UPDATE ON public.game_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- game_packs
CREATE TABLE public.game_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  pack_type TEXT NOT NULL DEFAULT 'special'
    CHECK (pack_type IN ('starter','daily','event','special','mission')),
  cards_per_pack INTEGER NOT NULL DEFAULT 5 CHECK (cards_per_pack BETWEEN 1 AND 100),
  rarity_odds JSONB NOT NULL DEFAULT '{"common":70,"uncommon":20,"rare":8,"epic":1.5,"legendary":0.5}'::jsonb,
  is_free BOOLEAN NOT NULL DEFAULT true,
  price_coins INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  cover_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (game_id, code)
);
CREATE INDEX idx_game_packs_game ON public.game_packs(game_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_packs TO authenticated;
GRANT SELECT ON public.game_packs TO anon;
GRANT ALL ON public.game_packs TO service_role;
ALTER TABLE public.game_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read active packs" ON public.game_packs FOR SELECT
  USING (is_active OR public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.games g JOIN public.game_developers d ON d.id=g.developer_id
               WHERE g.id=game_packs.game_id AND d.user_id=auth.uid()));
CREATE POLICY "Dev/admin manage packs" ON public.game_packs FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.games g JOIN public.game_developers d ON d.id=g.developer_id
               WHERE g.id=game_packs.game_id AND d.user_id=auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.games g JOIN public.game_developers d ON d.id=g.developer_id
               WHERE g.id=game_packs.game_id AND d.user_id=auth.uid()));
CREATE TRIGGER trg_game_packs_updated BEFORE UPDATE ON public.game_packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- game_user_cards
CREATE TABLE public.game_user_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES public.game_cards(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  first_obtained_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_obtained_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  origin TEXT NOT NULL DEFAULT 'pack',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, card_id)
);
CREATE INDEX idx_guc_user_game ON public.game_user_cards(user_id, game_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_user_cards TO authenticated;
GRANT ALL ON public.game_user_cards TO service_role;
ALTER TABLE public.game_user_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read collection" ON public.game_user_cards FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Owner insert" ON public.game_user_cards FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owner update" ON public.game_user_cards FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- game_pack_openings
CREATE TABLE public.game_pack_openings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id UUID NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  pack_id UUID NOT NULL REFERENCES public.game_packs(id) ON DELETE CASCADE,
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_gpo_user ON public.game_pack_openings(user_id, opened_at DESC);
GRANT SELECT, INSERT ON public.game_pack_openings TO authenticated;
GRANT ALL ON public.game_pack_openings TO service_role;
ALTER TABLE public.game_pack_openings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner read openings" ON public.game_pack_openings FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "System inserts" ON public.game_pack_openings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Function: open a pack (rolls rarity odds then picks a random active card per roll)
CREATE OR REPLACE FUNCTION public.game_open_pack(_pack_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _pack RECORD;
  _odds JSONB;
  _keys TEXT[];
  _weights NUMERIC[];
  _total NUMERIC := 0;
  _i INTEGER;
  _r NUMERIC;
  _acc NUMERIC;
  _rarity TEXT;
  _card RECORD;
  _out JSONB := '[]'::jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT * INTO _pack FROM public.game_packs WHERE id = _pack_id;
  IF _pack.id IS NULL THEN RAISE EXCEPTION 'Pacote não encontrado'; END IF;
  IF NOT _pack.is_active THEN RAISE EXCEPTION 'Pacote inativo'; END IF;
  IF _pack.starts_at IS NOT NULL AND _pack.starts_at > now() THEN RAISE EXCEPTION 'Pacote ainda não iniciou'; END IF;
  IF _pack.ends_at   IS NOT NULL AND _pack.ends_at   < now() THEN RAISE EXCEPTION 'Pacote encerrado'; END IF;

  _odds := _pack.rarity_odds;
  SELECT array_agg(k), array_agg((v)::text::numeric)
    INTO _keys, _weights
  FROM jsonb_each_text(_odds) AS x(k, v);
  IF _keys IS NULL OR array_length(_keys,1) = 0 THEN
    RAISE EXCEPTION 'Pacote sem probabilidades definidas';
  END IF;
  FOR _i IN 1..array_length(_weights,1) LOOP _total := _total + _weights[_i]; END LOOP;
  IF _total <= 0 THEN RAISE EXCEPTION 'Probabilidades inválidas'; END IF;

  FOR _i IN 1.._pack.cards_per_pack LOOP
    _r := random() * _total;
    _acc := 0; _rarity := _keys[1];
    FOR _i IN 1..array_length(_keys,1) LOOP
      _acc := _acc + _weights[_i];
      IF _r <= _acc THEN _rarity := _keys[_i]; EXIT; END IF;
    END LOOP;

    SELECT * INTO _card FROM public.game_cards
      WHERE game_id = _pack.game_id AND status='active' AND rarity = _rarity
      ORDER BY random() LIMIT 1;
    IF _card.id IS NULL THEN
      SELECT * INTO _card FROM public.game_cards
        WHERE game_id = _pack.game_id AND status='active'
        ORDER BY random() LIMIT 1;
    END IF;
    IF _card.id IS NULL THEN CONTINUE; END IF;

    INSERT INTO public.game_user_cards (user_id, game_id, card_id, quantity, origin, last_obtained_at)
    VALUES (_uid, _pack.game_id, _card.id, 1, 'pack:'||_pack.code, now())
    ON CONFLICT (user_id, card_id)
      DO UPDATE SET quantity = public.game_user_cards.quantity + 1, last_obtained_at = now();

    _out := _out || jsonb_build_object(
      'card_id', _card.id, 'name', _card.name, 'image_url', _card.image_url,
      'rarity', _card.rarity, 'code', _card.code
    );
  END LOOP;

  INSERT INTO public.game_pack_openings (user_id, game_id, pack_id, cards)
  VALUES (_uid, _pack.game_id, _pack.id, _out);

  RETURN _out;
END;
$$;
REVOKE ALL ON FUNCTION public.game_open_pack(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.game_open_pack(UUID) TO authenticated;

-- Function: entrega deck inicial gratuito (primeiro starter pack ativo do jogo)
CREATE OR REPLACE FUNCTION public.game_claim_starter(_game_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _pack RECORD;
  _already BOOLEAN;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT * INTO _pack FROM public.game_packs
    WHERE game_id = _game_id AND pack_type='starter' AND is_active
    ORDER BY created_at ASC LIMIT 1;
  IF _pack.id IS NULL THEN RAISE EXCEPTION 'Este jogo ainda não tem deck inicial configurado'; END IF;

  SELECT EXISTS (SELECT 1 FROM public.game_pack_openings
    WHERE user_id=_uid AND pack_id=_pack.id) INTO _already;
  IF _already THEN RAISE EXCEPTION 'Você já recebeu o deck inicial deste jogo'; END IF;

  RETURN public.game_open_pack(_pack.id);
END;
$$;
REVOKE ALL ON FUNCTION public.game_claim_starter(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.game_claim_starter(UUID) TO authenticated;
