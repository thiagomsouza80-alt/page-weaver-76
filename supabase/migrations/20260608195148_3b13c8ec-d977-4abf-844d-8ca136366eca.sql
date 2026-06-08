
-- 1) Add 'organizer' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'organizer';

-- 2) Organizers table
CREATE TABLE public.organizers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  organization_name text NOT NULL,
  document text,
  bio text,
  logo_url text,
  instagram text,
  website text,
  approval_status text NOT NULL DEFAULT 'pending',
  rejection_reason text,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizers TO authenticated;
GRANT ALL ON public.organizers TO service_role;

ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizers can view own profile"
  ON public.organizers FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone authenticated can create own organizer profile"
  ON public.organizers FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND approval_status = 'pending');

CREATE POLICY "Organizers can update own profile (limited)"
  ON public.organizers FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage organizers"
  ON public.organizers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_organizers_updated_at
  BEFORE UPDATE ON public.organizers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Events: organizer link + approval status
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS organizer_id uuid REFERENCES public.organizers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Update existing public read policy: only published AND approved
DROP POLICY IF EXISTS "Anyone can view published events" ON public.events;
CREATE POLICY "Anyone can view published approved events"
  ON public.events FOR SELECT
  USING (published = true AND approval_status = 'approved');

-- Organizers manage their own events
CREATE POLICY "Organizers view own events"
  ON public.events FOR SELECT TO authenticated
  USING (
    organizer_id IN (SELECT id FROM public.organizers WHERE user_id = auth.uid())
  );

CREATE POLICY "Approved organizers insert own events"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (
    organizer_id IN (
      SELECT id FROM public.organizers
      WHERE user_id = auth.uid() AND approval_status = 'approved'
    )
  );

CREATE POLICY "Organizers update own events"
  ON public.events FOR UPDATE TO authenticated
  USING (
    organizer_id IN (SELECT id FROM public.organizers WHERE user_id = auth.uid() AND approval_status = 'approved')
  )
  WITH CHECK (
    organizer_id IN (SELECT id FROM public.organizers WHERE user_id = auth.uid() AND approval_status = 'approved')
  );

CREATE POLICY "Organizers delete own events"
  ON public.events FOR DELETE TO authenticated
  USING (
    organizer_id IN (SELECT id FROM public.organizers WHERE user_id = auth.uid() AND approval_status = 'approved')
  );
