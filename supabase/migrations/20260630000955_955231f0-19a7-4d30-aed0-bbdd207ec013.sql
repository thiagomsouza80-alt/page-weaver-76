
DROP POLICY IF EXISTS "event-gallery public read" ON storage.objects;
DROP POLICY IF EXISTS "event-gallery user upload" ON storage.objects;
DROP POLICY IF EXISTS "event-gallery user update" ON storage.objects;
DROP POLICY IF EXISTS "event-gallery user delete" ON storage.objects;
DROP POLICY IF EXISTS "event-gallery admin all" ON storage.objects;

CREATE POLICY "event-gallery public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'event-gallery');
CREATE POLICY "event-gallery user upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'event-gallery' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "event-gallery user update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'event-gallery' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "event-gallery user delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'event-gallery' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "event-gallery admin all" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'event-gallery' AND public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (bucket_id = 'event-gallery' AND public.has_role(auth.uid(),'admin'::app_role));
