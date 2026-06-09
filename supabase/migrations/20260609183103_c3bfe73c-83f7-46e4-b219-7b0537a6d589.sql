
-- Admin gerencia comprovantes
CREATE POLICY "Admins manage withdrawal receipts"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'withdrawal-receipts' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'withdrawal-receipts' AND public.has_role(auth.uid(), 'admin'));

-- Organizadores leem comprovantes dos próprios saques
-- (path layout: <organizer_id>/<withdrawal_id>.<ext>)
CREATE POLICY "Organizers read own receipts"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'withdrawal-receipts'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text FROM public.organizers
    WHERE user_id = auth.uid() AND approval_status = 'approved'
  )
);
