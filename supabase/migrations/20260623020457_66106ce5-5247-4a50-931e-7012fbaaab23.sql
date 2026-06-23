
CREATE POLICY "Verif users read own files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'messenger-verifications'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(),'admin'::app_role)
    )
  );

CREATE POLICY "Verif users upload own files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'messenger-verifications'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Verif users update own files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'messenger-verifications'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Verif users delete own files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'messenger-verifications'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.has_role(auth.uid(),'admin'::app_role)
    )
  );
