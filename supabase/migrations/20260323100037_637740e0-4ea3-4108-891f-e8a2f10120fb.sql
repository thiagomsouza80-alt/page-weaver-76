-- Add user_id column to artists table to link with auth
ALTER TABLE public.artists ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_artists_user_id ON public.artists(user_id);

-- RLS policy: Artists can update their own profile
CREATE POLICY "Artists can update own profile"
ON public.artists
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policy: Artists can view their own unapproved profile
CREATE POLICY "Artists can view own profile"
ON public.artists
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);