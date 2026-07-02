
-- Restore missing GRANTs that made artists/entrepreneurs/organizers unreadable
-- RLS still enforces per-row visibility.

GRANT SELECT ON public.artists TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.artists TO authenticated;
GRANT ALL ON public.artists TO service_role;

GRANT SELECT ON public.entrepreneurs TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.entrepreneurs TO authenticated;
GRANT ALL ON public.entrepreneurs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizers TO authenticated;
GRANT ALL ON public.organizers TO service_role;

-- Recreate public views with security_invoker so RLS applies, and grant read
DROP VIEW IF EXISTS public.artists_public;
CREATE VIEW public.artists_public
WITH (security_invoker=on) AS
SELECT id, name, segment, bio, city, instagram, profile_image_url, portfolio_images,
       youtube_url, membership_type, fan_count, followers_count, posts_count,
       approved, created_at, user_id
FROM public.artists;
GRANT SELECT ON public.artists_public TO anon, authenticated;

DROP VIEW IF EXISTS public.entrepreneurs_public;
CREATE VIEW public.entrepreneurs_public
WITH (security_invoker=on) AS
SELECT id, name, slug, badge, description, full_description, image_url,
       hero_image_url, instagram, address, portfolio_images,
       posts_count, followers_count, published, created_at, user_id
FROM public.entrepreneurs;
GRANT SELECT ON public.entrepreneurs_public TO anon, authenticated;

-- Ensure signed-URL access to stories objects works for anyone
-- (stories bucket stays private; we serve via signed URLs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Stories authenticated upload'
  ) THEN
    CREATE POLICY "Stories authenticated upload"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects' AND policyname='Stories anyone read via signed'
  ) THEN
    CREATE POLICY "Stories anyone read via signed"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'stories');
  END IF;
END $$;
