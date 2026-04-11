ALTER TABLE public.artists
  ADD COLUMN membership_approved_at timestamp with time zone DEFAULT NULL,
  ADD COLUMN membership_expires_at timestamp with time zone DEFAULT NULL;