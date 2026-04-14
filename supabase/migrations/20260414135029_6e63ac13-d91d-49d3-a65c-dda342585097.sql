
CREATE POLICY "Artists can update own profile"
ON public.artists
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Entrepreneurs can update own profile"
ON public.entrepreneurs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
