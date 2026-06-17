
-- Admin pode tudo
CREATE POLICY "Admin manages refund receipts"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'refund-receipts' AND public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (bucket_id = 'refund-receipts' AND public.has_role(auth.uid(), 'admin'::app_role));

-- Comprador pode ver o seu comprovante (path começa com {user_id}/)
CREATE POLICY "Buyer reads own refund receipt"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'refund-receipts'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
