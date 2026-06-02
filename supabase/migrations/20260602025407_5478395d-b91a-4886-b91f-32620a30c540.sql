
-- ============== REPORTS ==============
CREATE TABLE public.social_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_user_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('post','comment','product','profile')),
  target_id UUID NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed','actioned')),
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_reports TO authenticated;
GRANT ALL ON public.social_reports TO service_role;

ALTER TABLE public.social_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can create reports"
  ON public.social_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reporter_user_id);

CREATE POLICY "Users view own reports"
  ON public.social_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_user_id);

CREATE POLICY "Admins view all reports"
  ON public.social_reports FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage reports"
  ON public.social_reports FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete reports"
  ON public.social_reports FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_social_reports_status ON public.social_reports(status, created_at DESC);
CREATE INDEX idx_social_reports_target ON public.social_reports(target_type, target_id);

-- ============== NOTIFICATIONS ==============
CREATE TABLE public.social_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('like','comment','follower','reply','share')),
  actor_user_id UUID,
  actor_name TEXT,
  actor_avatar_url TEXT,
  target_type TEXT,
  target_id UUID,
  post_id UUID,
  preview TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_notifications TO authenticated;
GRANT ALL ON public.social_notifications TO service_role;

ALTER TABLE public.social_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notifications"
  ON public.social_notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users update own notifications"
  ON public.social_notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users delete own notifications"
  ON public.social_notifications FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.social_notifications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE INDEX idx_social_notifications_user ON public.social_notifications(user_id, read, created_at DESC);

-- ============== USER STATUS ==============
CREATE TABLE public.social_user_status (
  user_id UUID PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','banned')),
  reason TEXT,
  suspended_until TIMESTAMPTZ,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.social_user_status TO authenticated;
GRANT ALL ON public.social_user_status TO service_role;

ALTER TABLE public.social_user_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own status"
  ON public.social_user_status FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all statuses"
  ON public.social_user_status FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage statuses"
  ON public.social_user_status FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============== BLOCK CHECK FUNCTION ==============
CREATE OR REPLACE FUNCTION public.is_user_blocked(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.social_user_status
    WHERE user_id = _user_id
      AND (status = 'banned'
        OR (status = 'suspended' AND (suspended_until IS NULL OR suspended_until > now())))
  )
$$;

-- ============== TRIGGERS: AUTO-NOTIFICATIONS ==============
CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _post RECORD; _actor_name TEXT; _actor_avatar TEXT;
BEGIN
  SELECT user_id, content INTO _post FROM public.social_posts WHERE id = NEW.post_id;
  IF _post.user_id IS NULL OR _post.user_id = NEW.user_id THEN RETURN NEW; END IF;
  SELECT author_name, author_avatar_url INTO _actor_name, _actor_avatar
    FROM public.social_posts WHERE user_id = NEW.user_id LIMIT 1;
  INSERT INTO public.social_notifications (user_id, type, actor_user_id, actor_name, actor_avatar_url, post_id, preview)
  VALUES (_post.user_id, 'like', NEW.user_id, COALESCE(_actor_name,'Alguém'), _actor_avatar, NEW.post_id, LEFT(COALESCE(_post.content,''),120));
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_on_like
AFTER INSERT ON public.social_likes
FOR EACH ROW EXECUTE FUNCTION public.notify_on_like();

CREATE OR REPLACE FUNCTION public.notify_on_comment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _post_owner UUID; _parent_owner UUID;
BEGIN
  SELECT user_id INTO _post_owner FROM public.social_posts WHERE id = NEW.post_id;
  IF NEW.parent_comment_id IS NOT NULL THEN
    SELECT user_id INTO _parent_owner FROM public.social_comments WHERE id = NEW.parent_comment_id;
    IF _parent_owner IS NOT NULL AND _parent_owner <> NEW.user_id THEN
      INSERT INTO public.social_notifications (user_id, type, actor_user_id, actor_name, actor_avatar_url, post_id, preview)
      VALUES (_parent_owner, 'reply', NEW.user_id, NEW.author_name, NEW.author_avatar_url, NEW.post_id, LEFT(NEW.content,120));
    END IF;
  END IF;
  IF _post_owner IS NOT NULL AND _post_owner <> NEW.user_id AND _post_owner <> COALESCE(_parent_owner, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.social_notifications (user_id, type, actor_user_id, actor_name, actor_avatar_url, post_id, preview)
    VALUES (_post_owner, 'comment', NEW.user_id, NEW.author_name, NEW.author_avatar_url, NEW.post_id, LEFT(NEW.content,120));
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_on_comment
AFTER INSERT ON public.social_comments
FOR EACH ROW EXECUTE FUNCTION public.notify_on_comment();

CREATE OR REPLACE FUNCTION public.notify_on_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _target_user UUID; _actor_name TEXT; _actor_avatar TEXT;
BEGIN
  IF NEW.target_type = 'artist' THEN
    SELECT user_id INTO _target_user FROM public.artists WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'entrepreneur' THEN
    SELECT user_id INTO _target_user FROM public.entrepreneurs WHERE id = NEW.target_id;
  END IF;
  IF _target_user IS NULL OR _target_user = NEW.follower_user_id THEN RETURN NEW; END IF;
  SELECT author_name, author_avatar_url INTO _actor_name, _actor_avatar
    FROM public.social_posts WHERE user_id = NEW.follower_user_id LIMIT 1;
  INSERT INTO public.social_notifications (user_id, type, actor_user_id, actor_name, actor_avatar_url, target_type, target_id)
  VALUES (_target_user, 'follower', NEW.follower_user_id, COALESCE(_actor_name,'Novo seguidor'), _actor_avatar, NEW.target_type, NEW.target_id);
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_on_follow
AFTER INSERT ON public.social_follows
FOR EACH ROW EXECUTE FUNCTION public.notify_on_follow();
