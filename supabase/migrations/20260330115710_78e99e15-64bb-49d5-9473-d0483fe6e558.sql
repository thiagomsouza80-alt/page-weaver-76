
-- Create sponsors table
CREATE TABLE public.sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text NOT NULL,
  website_url text,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

-- Anyone can view active sponsors (public)
CREATE POLICY "Anyone can view active sponsors"
ON public.sponsors FOR SELECT
TO public
USING (active = true);

-- Admins can manage sponsors
CREATE POLICY "Admins can manage sponsors"
ON public.sponsors FOR ALL
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create storage bucket for sponsor logos
INSERT INTO storage.buckets (id, name, public) VALUES ('sponsors', 'sponsors', true)
ON CONFLICT DO NOTHING;

-- Anyone can view sponsor images
CREATE POLICY "Anyone can view sponsor images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'sponsors');

-- Admins can upload sponsor images
CREATE POLICY "Admins can upload sponsor images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'sponsors' AND has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete sponsor images
CREATE POLICY "Admins can delete sponsor images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'sponsors' AND has_role(auth.uid(), 'admin'::app_role));
