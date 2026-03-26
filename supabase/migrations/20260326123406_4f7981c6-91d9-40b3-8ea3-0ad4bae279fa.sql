
CREATE TABLE public.fan_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  artist_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, artist_id)
);

ALTER TABLE public.fan_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fan clicks" ON public.fan_clicks FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert own fan clicks" ON public.fan_clicks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own fan clicks" ON public.fan_clicks FOR DELETE TO authenticated USING (auth.uid() = user_id);
