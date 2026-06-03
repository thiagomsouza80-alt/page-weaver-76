
-- Banners da Home
CREATE TABLE public.homepage_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  subtitle TEXT,
  image_url TEXT,
  video_url TEXT,
  link_url TEXT,
  button_text TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  display_order INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  views INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.homepage_banners TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.homepage_banners TO authenticated;
GRANT ALL ON public.homepage_banners TO service_role;

ALTER TABLE public.homepage_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners in window"
ON public.homepage_banners FOR SELECT
USING (
  active = true
  AND (start_date IS NULL OR start_date <= now())
  AND (end_date IS NULL OR end_date >= now())
);

CREATE POLICY "Admins can view all banners"
ON public.homepage_banners FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage banners"
ON public.homepage_banners FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_homepage_banners_updated_at
BEFORE UPDATE ON public.homepage_banners
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Métricas: público pode incrementar views/clicks (somente esses campos via RPC)
CREATE OR REPLACE FUNCTION public.banner_increment_view(_id UUID)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ UPDATE public.homepage_banners SET views = views + 1 WHERE id = _id; $$;

CREATE OR REPLACE FUNCTION public.banner_increment_click(_id UUID)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$ UPDATE public.homepage_banners SET clicks = clicks + 1 WHERE id = _id; $$;

GRANT EXECUTE ON FUNCTION public.banner_increment_view(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.banner_increment_click(UUID) TO anon, authenticated;
