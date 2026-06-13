
-- 1. Bloqueia leitura anônima de colunas sensíveis em artists e entrepreneurs
REVOKE SELECT (email, phone, birth_date, guardian_name, guardian_phone)
  ON public.artists FROM anon;
REVOKE SELECT (email, phone, birth_date, guardian_name, guardian_phone)
  ON public.entrepreneurs FROM anon;

-- 2. Corrige a UPDATE policy quebrada do organizers (auto-join sem referência ao row)
DROP POLICY IF EXISTS "Organizers can update own profile (limited)" ON public.organizers;

CREATE POLICY "Organizers can update own profile (limited)"
  ON public.organizers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND approval_status IS NOT DISTINCT FROM (
      SELECT o2.approval_status FROM public.organizers o2 WHERE o2.id = organizers.id
    )
    AND approved_at IS NOT DISTINCT FROM (
      SELECT o2.approved_at FROM public.organizers o2 WHERE o2.id = organizers.id
    )
    AND rejection_reason IS NOT DISTINCT FROM (
      SELECT o2.rejection_reason FROM public.organizers o2 WHERE o2.id = organizers.id
    )
  );

-- 3. Remove tickets do Realtime (qualquer authenticated podia escutar dados de outros)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'tickets'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.tickets';
  END IF;
END $$;

-- 4. Storage: artistas podem apagar seus próprios arquivos no bucket "artists"
DROP POLICY IF EXISTS "Artists can delete own files" ON storage.objects;
CREATE POLICY "Artists can delete own files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'artists' AND owner = auth.uid());

DROP POLICY IF EXISTS "Artists can update own files" ON storage.objects;
CREATE POLICY "Artists can update own files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'artists' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'artists' AND owner = auth.uid());

-- 5. Storage: apenas admins podem sobrescrever objetos no bucket privado "banners"
DROP POLICY IF EXISTS "Admins can update banners" ON storage.objects;
CREATE POLICY "Admins can update banners"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'::app_role));
