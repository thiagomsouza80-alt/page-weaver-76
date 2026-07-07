
CREATE POLICY "game-assets public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'game-assets');

CREATE POLICY "game-assets authenticated write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'game-assets');

CREATE POLICY "game-assets authenticated update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'game-assets')
  WITH CHECK (bucket_id = 'game-assets');

CREATE POLICY "game-assets authenticated delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'game-assets');
