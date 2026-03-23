-- Table to store pending artist profile updates awaiting admin approval
CREATE TABLE public.artist_pending_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artist_id uuid NOT NULL REFERENCES public.artists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  changes jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX idx_pending_updates_artist ON public.artist_pending_updates(artist_id);
CREATE INDEX idx_pending_updates_status ON public.artist_pending_updates(status);

ALTER TABLE public.artist_pending_updates ENABLE ROW LEVEL SECURITY;

-- Artists can insert their own pending updates
CREATE POLICY "Artists can create own pending updates"
ON public.artist_pending_updates
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Artists can view their own pending updates
CREATE POLICY "Artists can view own pending updates"
ON public.artist_pending_updates
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can view all pending updates
CREATE POLICY "Admins can view all pending updates"
ON public.artist_pending_updates
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Admins can update pending updates (approve/reject)
CREATE POLICY "Admins can update pending updates"
ON public.artist_pending_updates
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Remove direct update policy for artists (they must go through pending)
DROP POLICY IF EXISTS "Artists can update own profile" ON public.artists;