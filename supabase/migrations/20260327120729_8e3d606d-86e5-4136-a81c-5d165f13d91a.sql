CREATE OR REPLACE FUNCTION public.decrement_fan_count(_artist_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE public.artists
  SET fan_count = GREATEST(fan_count - 1, 0)
  WHERE id = _artist_id;
  
  SELECT fan_count INTO new_count FROM public.artists WHERE id = _artist_id;
  RETURN new_count;
END;
$$;