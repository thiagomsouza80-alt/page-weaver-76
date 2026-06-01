
-- Products (vitrine)
CREATE TABLE public.social_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entrepreneur_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2),
  images TEXT[] DEFAULT '{}',
  whatsapp TEXT,
  external_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.social_products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_products TO authenticated;
GRANT ALL ON public.social_products TO service_role;

ALTER TABLE public.social_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
ON public.social_products FOR SELECT
USING (active = true AND hidden = false);

CREATE POLICY "Owner can view own products"
ON public.social_products FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all products"
ON public.social_products FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owner can create products"
ON public.social_products FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can update own products"
ON public.social_products FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner can delete own products"
ON public.social_products FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins manage products"
ON public.social_products FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_social_products_updated_at
BEFORE UPDATE ON public.social_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Follows
CREATE TABLE public.social_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_user_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('artist','entrepreneur')),
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_user_id, target_type, target_id)
);

GRANT SELECT ON public.social_follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.social_follows TO authenticated;
GRANT ALL ON public.social_follows TO service_role;

ALTER TABLE public.social_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows"
ON public.social_follows FOR SELECT USING (true);

CREATE POLICY "Users can follow"
ON public.social_follows FOR INSERT TO authenticated
WITH CHECK (auth.uid() = follower_user_id);

CREATE POLICY "Users can unfollow"
ON public.social_follows FOR DELETE TO authenticated
USING (auth.uid() = follower_user_id);

-- Counters columns
ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS followers_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS posts_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.entrepreneurs
  ADD COLUMN IF NOT EXISTS followers_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS posts_count INTEGER NOT NULL DEFAULT 0;

-- Follow counter functions
CREATE OR REPLACE FUNCTION public.social_increment_followers(_target_type text, _target_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c integer;
BEGIN
  IF _target_type = 'artist' THEN
    UPDATE public.artists SET followers_count = followers_count + 1 WHERE id = _target_id RETURNING followers_count INTO c;
  ELSIF _target_type = 'entrepreneur' THEN
    UPDATE public.entrepreneurs SET followers_count = followers_count + 1 WHERE id = _target_id RETURNING followers_count INTO c;
  END IF;
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION public.social_decrement_followers(_target_type text, _target_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c integer;
BEGIN
  IF _target_type = 'artist' THEN
    UPDATE public.artists SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = _target_id RETURNING followers_count INTO c;
  ELSIF _target_type = 'entrepreneur' THEN
    UPDATE public.entrepreneurs SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = _target_id RETURNING followers_count INTO c;
  END IF;
  RETURN c;
END $$;

CREATE INDEX IF NOT EXISTS idx_social_follows_target ON public.social_follows (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_social_follows_follower ON public.social_follows (follower_user_id);
CREATE INDEX IF NOT EXISTS idx_social_products_user ON public.social_products (user_id);
