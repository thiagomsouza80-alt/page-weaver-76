-- Fix "permission denied for table user_progression" when users pick a class.
-- The table had prog_read_all (SELECT) and prog_self_class_update (UPDATE) but
-- no INSERT policy and no GRANTs to authenticated/anon, so upsert() from the
-- ClassPicker was blocked at the GRANT layer.

GRANT SELECT ON public.user_progression TO anon, authenticated;
GRANT INSERT, UPDATE ON public.user_progression TO authenticated;
GRANT ALL ON public.user_progression TO service_role;

DROP POLICY IF EXISTS prog_self_insert ON public.user_progression;
CREATE POLICY prog_self_insert ON public.user_progression
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
