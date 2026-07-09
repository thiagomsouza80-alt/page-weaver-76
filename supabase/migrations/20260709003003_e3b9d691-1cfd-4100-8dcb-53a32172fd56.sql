
-- Fase 1 Joano TCG: expand game_cards + default card back on games

ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS default_card_back_url text;

ALTER TABLE public.game_cards
  ADD COLUMN IF NOT EXISTS class text,
  ADD COLUMN IF NOT EXISTS faction text,
  ADD COLUMN IF NOT EXISTS card_type text,
  ADD COLUMN IF NOT EXISTS value_points integer,
  ADD COLUMN IF NOT EXISTS attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS abilities jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS effects jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS front_image_url text,
  ADD COLUMN IF NOT EXISTS back_image_url text;

-- migrate existing image_url into front_image_url when empty
UPDATE public.game_cards
  SET front_image_url = image_url
  WHERE front_image_url IS NULL AND image_url IS NOT NULL;

-- value_points must be null or 1..3
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'game_cards_value_points_range'
  ) THEN
    ALTER TABLE public.game_cards
      ADD CONSTRAINT game_cards_value_points_range
      CHECK (value_points IS NULL OR (value_points BETWEEN 1 AND 3));
  END IF;
END $$;
