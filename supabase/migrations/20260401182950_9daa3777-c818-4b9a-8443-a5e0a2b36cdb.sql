
ALTER TABLE public.artists
  ADD COLUMN birth_date date,
  ADD COLUMN guardian_name text,
  ADD COLUMN guardian_phone text;

ALTER TABLE public.entrepreneurs
  ADD COLUMN birth_date date,
  ADD COLUMN guardian_name text,
  ADD COLUMN guardian_phone text;
