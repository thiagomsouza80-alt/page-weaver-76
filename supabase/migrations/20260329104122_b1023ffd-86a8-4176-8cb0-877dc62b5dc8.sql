DROP POLICY IF EXISTS "Anyone can register as entrepreneur" ON public.entrepreneurs;
CREATE POLICY "Anyone can register as entrepreneur"
  ON public.entrepreneurs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);