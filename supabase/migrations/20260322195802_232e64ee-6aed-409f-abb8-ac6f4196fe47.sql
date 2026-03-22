ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS fan_count integer NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.increment_fan_count(_artist_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.artists
  SET fan_count = fan_count + 1
  WHERE id = _artist_id;
  
  SELECT fan_count INTO new_count FROM public.artists WHERE id = _artist_id;
  RETURN new_count;
END;
$$;