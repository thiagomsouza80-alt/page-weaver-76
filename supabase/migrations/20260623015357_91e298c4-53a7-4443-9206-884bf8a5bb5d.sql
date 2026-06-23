
-- Views públicas sem dados sensíveis (RLS herdada via security_invoker)
CREATE OR REPLACE VIEW public.artists_public
WITH (security_invoker = true)
AS
SELECT
  id, name, segment, bio, city, instagram,
  profile_image_url, portfolio_images, youtube_url,
  membership_type, fan_count, followers_count, posts_count,
  approved, created_at, user_id
FROM public.artists;

CREATE OR REPLACE VIEW public.entrepreneurs_public
WITH (security_invoker = true)
AS
SELECT
  id, name, slug, badge, description, full_description,
  image_url, hero_image_url, instagram, address,
  portfolio_images, posts_count, followers_count,
  published, created_at, user_id
FROM public.entrepreneurs;

GRANT SELECT ON public.artists_public TO anon, authenticated;
GRANT SELECT ON public.entrepreneurs_public TO anon, authenticated;

-- Bloqueia leitura anônima de colunas sensíveis nas tabelas-base
-- (autenticados continuam a poder ler para suas próprias linhas via RLS)
REVOKE SELECT ON public.artists FROM anon;
REVOKE SELECT ON public.entrepreneurs FROM anon;

GRANT SELECT (
  id, name, segment, bio, city, instagram,
  profile_image_url, portfolio_images, youtube_url,
  membership_type, fan_count, followers_count, posts_count,
  approved, created_at, user_id, updated_at,
  membership_approved_at, membership_expires_at
) ON public.artists TO anon;

GRANT SELECT (
  id, name, slug, badge, description, full_description,
  image_url, hero_image_url, instagram, address,
  portfolio_images, posts_count, followers_count,
  published, created_at, user_id, updated_at
) ON public.entrepreneurs TO anon;
