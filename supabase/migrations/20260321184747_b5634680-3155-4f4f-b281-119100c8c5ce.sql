
CREATE TABLE public.entrepreneurs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  badge text NOT NULL,
  description text NOT NULL,
  image_url text,
  published boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.entrepreneurs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published entrepreneurs" ON public.entrepreneurs
  FOR SELECT USING (published = true);

CREATE POLICY "Admins can manage entrepreneurs" ON public.entrepreneurs
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
