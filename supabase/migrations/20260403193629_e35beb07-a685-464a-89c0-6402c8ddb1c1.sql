
CREATE TABLE public.event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, event_id)
);

ALTER TABLE public.event_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view event attendees" ON public.event_attendees FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can insert own attendance" ON public.event_attendees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own attendance" ON public.event_attendees FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all attendees" ON public.event_attendees FOR ALL TO public USING (has_role(auth.uid(), 'admin'::app_role));
