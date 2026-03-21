-- Create storage bucket for entrepreneurs
INSERT INTO storage.buckets (id, name, public) VALUES ('entrepreneurs', 'entrepreneurs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view entrepreneur images
CREATE POLICY "Anyone can view entrepreneur images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'entrepreneurs');

-- Allow admins to upload entrepreneur images
CREATE POLICY "Admins can upload entrepreneur images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'entrepreneurs' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete entrepreneur images
CREATE POLICY "Admins can delete entrepreneur images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'entrepreneurs' AND public.has_role(auth.uid(), 'admin'));

-- Add portfolio_images column
ALTER TABLE public.entrepreneurs ADD COLUMN IF NOT EXISTS portfolio_images text[] DEFAULT '{}'::text[];