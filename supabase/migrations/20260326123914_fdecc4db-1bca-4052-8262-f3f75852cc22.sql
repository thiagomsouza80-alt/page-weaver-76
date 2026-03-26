
CREATE POLICY "Admins can delete fan clicks" ON public.fan_clicks FOR DELETE USING (public.has_role(auth.uid(), 'admin'::public.app_role));
CREATE POLICY "Admins can manage all fan clicks" ON public.fan_clicks FOR ALL USING (public.has_role(auth.uid(), 'admin'::public.app_role));
