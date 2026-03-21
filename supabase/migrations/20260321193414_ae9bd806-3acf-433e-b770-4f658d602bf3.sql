CREATE POLICY "Admins can delete artists"
ON public.artists
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));