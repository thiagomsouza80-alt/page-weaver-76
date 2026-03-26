
ALTER TABLE public.entrepreneurs ADD COLUMN IF NOT EXISTS user_id uuid;
ALTER TABLE public.entrepreneurs ADD COLUMN IF NOT EXISTS email text;

CREATE TABLE IF NOT EXISTS public.entrepreneur_pending_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entrepreneur_id uuid NOT NULL REFERENCES public.entrepreneurs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  changes jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

ALTER TABLE public.entrepreneur_pending_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all entrepreneur pending updates"
  ON public.entrepreneur_pending_updates FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update entrepreneur pending updates"
  ON public.entrepreneur_pending_updates FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create own entrepreneur pending updates"
  ON public.entrepreneur_pending_updates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own entrepreneur pending updates"
  ON public.entrepreneur_pending_updates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Entrepreneurs can view own profile"
  ON public.entrepreneurs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);
