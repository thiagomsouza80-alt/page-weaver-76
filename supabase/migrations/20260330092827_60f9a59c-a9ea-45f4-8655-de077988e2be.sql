
CREATE POLICY "Anyone can upload entrepreneur images"
ON storage.objects
FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'entrepreneurs');
