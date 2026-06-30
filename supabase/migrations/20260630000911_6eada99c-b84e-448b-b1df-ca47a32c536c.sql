
CREATE TABLE IF NOT EXISTS public.event_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id uuid REFERENCES public.tickets(id) ON DELETE SET NULL,
  message text,
  latitude double precision,
  longitude double precision,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.event_checkins TO authenticated;
GRANT SELECT ON public.event_checkins TO anon;
GRANT ALL ON public.event_checkins TO service_role;
ALTER TABLE public.event_checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view event checkins" ON public.event_checkins;
DROP POLICY IF EXISTS "Users can checkin themselves" ON public.event_checkins;
DROP POLICY IF EXISTS "Users can remove own checkin" ON public.event_checkins;
CREATE POLICY "Anyone can view event checkins" ON public.event_checkins FOR SELECT USING (true);
CREATE POLICY "Users can checkin themselves" ON public.event_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own checkin" ON public.event_checkins FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_event_checkins_event ON public.event_checkins(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_checkins_user ON public.event_checkins(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.event_gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL DEFAULT 'image',
  thumbnail_url text,
  caption text,
  likes_count integer NOT NULL DEFAULT 0,
  approved boolean NOT NULL DEFAULT true,
  reported boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_gallery_items TO authenticated;
GRANT SELECT ON public.event_gallery_items TO anon;
GRANT ALL ON public.event_gallery_items TO service_role;
ALTER TABLE public.event_gallery_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view approved gallery" ON public.event_gallery_items;
DROP POLICY IF EXISTS "Authenticated can upload to gallery" ON public.event_gallery_items;
DROP POLICY IF EXISTS "Owner or admin can update gallery item" ON public.event_gallery_items;
DROP POLICY IF EXISTS "Owner or admin can delete gallery item" ON public.event_gallery_items;
CREATE POLICY "Anyone can view approved gallery" ON public.event_gallery_items FOR SELECT
  USING (approved = true OR auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can upload to gallery" ON public.event_gallery_items FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner or admin can update gallery item" ON public.event_gallery_items FOR UPDATE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Owner or admin can delete gallery item" ON public.event_gallery_items FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));
CREATE INDEX IF NOT EXISTS idx_event_gallery_event ON public.event_gallery_items(event_id, created_at DESC);
DROP TRIGGER IF EXISTS trg_event_gallery_updated ON public.event_gallery_items;
CREATE TRIGGER trg_event_gallery_updated BEFORE UPDATE ON public.event_gallery_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.event_gallery_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_item_id uuid NOT NULL REFERENCES public.event_gallery_items(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gallery_item_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.event_gallery_likes TO authenticated;
GRANT SELECT ON public.event_gallery_likes TO anon;
GRANT ALL ON public.event_gallery_likes TO service_role;
ALTER TABLE public.event_gallery_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view gallery likes" ON public.event_gallery_likes;
DROP POLICY IF EXISTS "Auth can like gallery" ON public.event_gallery_likes;
DROP POLICY IF EXISTS "Auth can unlike own gallery like" ON public.event_gallery_likes;
CREATE POLICY "Anyone can view gallery likes" ON public.event_gallery_likes FOR SELECT USING (true);
CREATE POLICY "Auth can like gallery" ON public.event_gallery_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth can unlike own gallery like" ON public.event_gallery_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.event_gallery_like_counter()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.event_gallery_items SET likes_count = likes_count + 1 WHERE id = NEW.gallery_item_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.event_gallery_items SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.gallery_item_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_event_gallery_like_counter ON public.event_gallery_likes;
CREATE TRIGGER trg_event_gallery_like_counter AFTER INSERT OR DELETE ON public.event_gallery_likes
  FOR EACH ROW EXECUTE FUNCTION public.event_gallery_like_counter();

INSERT INTO public.xp_rules (action, label, xp, daily_cap, per_target_once, cooldown_seconds, is_active) VALUES
  ('event_checkin', 'Check-in em evento', 25, NULL, true, 0, true),
  ('gallery_upload', 'Upload na galeria do evento', 15, 90, false, 30, true),
  ('gallery_like_received', 'Curtida recebida na galeria', 1, 50, false, 0, true)
ON CONFLICT (action) DO UPDATE SET xp = EXCLUDED.xp, daily_cap = EXCLUDED.daily_cap,
  per_target_once = EXCLUDED.per_target_once, label = EXCLUDED.label, is_active = true;

CREATE OR REPLACE FUNCTION public.xp_on_event_checkin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_xp(NEW.user_id, 'event_checkin', 'event', NEW.event_id);
  BEGIN
    INSERT INTO public.event_attendees (event_id, user_id) VALUES (NEW.event_id, NEW.user_id)
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_xp_event_checkin ON public.event_checkins;
CREATE TRIGGER trg_xp_event_checkin AFTER INSERT ON public.event_checkins
  FOR EACH ROW EXECUTE FUNCTION public.xp_on_event_checkin();

CREATE OR REPLACE FUNCTION public.xp_on_gallery_upload()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.award_xp(NEW.user_id, 'gallery_upload', 'event', NEW.event_id);
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_xp_gallery_upload ON public.event_gallery_items;
CREATE TRIGGER trg_xp_gallery_upload AFTER INSERT ON public.event_gallery_items
  FOR EACH ROW EXECUTE FUNCTION public.xp_on_gallery_upload();

CREATE OR REPLACE FUNCTION public.xp_on_gallery_like()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid;
BEGIN
  SELECT user_id INTO _owner FROM public.event_gallery_items WHERE id = NEW.gallery_item_id;
  IF _owner IS NOT NULL AND _owner <> NEW.user_id THEN
    PERFORM public.award_xp(_owner, 'gallery_like_received', 'gallery_item', NEW.gallery_item_id);
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_xp_gallery_like ON public.event_gallery_likes;
CREATE TRIGGER trg_xp_gallery_like AFTER INSERT ON public.event_gallery_likes
  FOR EACH ROW EXECUTE FUNCTION public.xp_on_gallery_like();

CREATE OR REPLACE FUNCTION public.event_checkin(
  _event_id uuid, _message text DEFAULT NULL,
  _latitude double precision DEFAULT NULL, _longitude double precision DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _event RECORD; _id uuid; _ticket uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Não autenticado'; END IF;
  SELECT id, event_date, published INTO _event FROM public.events WHERE id = _event_id;
  IF _event.id IS NULL THEN RAISE EXCEPTION 'Evento não encontrado'; END IF;
  IF _event.published = false THEN RAISE EXCEPTION 'Evento indisponível'; END IF;
  IF _event.event_date IS NOT NULL THEN
    IF now() < _event.event_date - interval '12 hours' THEN
      RAISE EXCEPTION 'Check-in disponível somente próximo ao horário do evento';
    END IF;
    IF now() > _event.event_date + interval '24 hours' THEN
      RAISE EXCEPTION 'Janela de check-in encerrada';
    END IF;
  END IF;
  SELECT id INTO _ticket FROM public.tickets
    WHERE event_id = _event_id AND user_id = _uid AND status <> 'cancelled'
    ORDER BY created_at DESC LIMIT 1;
  INSERT INTO public.event_checkins (event_id, user_id, ticket_id, message, latitude, longitude, source)
  VALUES (_event_id, _uid, _ticket, _message, _latitude, _longitude, 'manual')
  ON CONFLICT (event_id, user_id) DO UPDATE
    SET message = COALESCE(EXCLUDED.message, public.event_checkins.message)
  RETURNING id INTO _id;
  RETURN _id;
END $$;
GRANT EXECUTE ON FUNCTION public.event_checkin(uuid, text, double precision, double precision) TO authenticated;

CREATE OR REPLACE FUNCTION public.event_checkins_feed(_event_id uuid, _limit int DEFAULT 50)
RETURNS TABLE(
  id uuid, user_id uuid, username text, display_name text, avatar_url text,
  message text, created_at timestamptz
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.user_id, up.username,
         COALESCE(up.display_name, up.username) AS display_name,
         COALESCE(up.avatar_url, a.profile_image_url) AS avatar_url,
         c.message, c.created_at
  FROM public.event_checkins c
  LEFT JOIN public.user_profiles up ON up.user_id = c.user_id
  LEFT JOIN public.artists a ON a.user_id = c.user_id
  WHERE c.event_id = _event_id
  ORDER BY c.created_at DESC
  LIMIT LEAST(GREATEST(_limit,1), 200);
$$;
GRANT EXECUTE ON FUNCTION public.event_checkins_feed(uuid, int) TO anon, authenticated;
