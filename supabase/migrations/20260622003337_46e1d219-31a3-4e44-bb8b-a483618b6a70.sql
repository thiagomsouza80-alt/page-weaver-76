
-- 1. Expandir tipos permitidos na tabela social_notifications
ALTER TABLE public.social_notifications DROP CONSTRAINT IF EXISTS social_notifications_type_check;
ALTER TABLE public.social_notifications ADD CONSTRAINT social_notifications_type_check CHECK (
  type IN (
    'like','comment','follower','reply','share',
    'validator_added',
    'news_published',
    'event_published','event_cancelled','event_changed',
    'product_interest','product_message',
    'message_received',
    'withdrawal_requested','withdrawal_approved','withdrawal_paid',
    'refund_requested','refund_approved','refund_paid',
    'inactivity_reminder',
    'generic'
  )
);

-- Permitir inserts via SECURITY DEFINER triggers (NULL actor)
DROP POLICY IF EXISTS "Actors or admins can insert notifications" ON public.social_notifications;
CREATE POLICY "Actors admins or system can insert notifications"
  ON public.social_notifications FOR INSERT TO authenticated
  WITH CHECK (
    actor_user_id IS NULL
    OR actor_user_id = auth.uid()
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 2. Preferências de notificação
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  events_new boolean NOT NULL DEFAULT true,
  events_changes boolean NOT NULL DEFAULT true,
  events_cancelled boolean NOT NULL DEFAULT true,
  news_new boolean NOT NULL DEFAULT true,
  social_likes boolean NOT NULL DEFAULT true,
  social_comments boolean NOT NULL DEFAULT true,
  social_followers boolean NOT NULL DEFAULT true,
  social_posts boolean NOT NULL DEFAULT true,
  marketplace_messages boolean NOT NULL DEFAULT true,
  financial_withdrawals boolean NOT NULL DEFAULT true,
  financial_refunds boolean NOT NULL DEFAULT true,
  retention_reminders boolean NOT NULL DEFAULT true,
  push_enabled boolean NOT NULL DEFAULT true,
  email_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own preferences"
  ON public.notification_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper para checar preferência (default true se não houver linha)
CREATE OR REPLACE FUNCTION public.notif_pref_enabled(_user uuid, _key text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.notification_preferences;
BEGIN
  SELECT * INTO _row FROM public.notification_preferences WHERE user_id = _user;
  IF _row.user_id IS NULL THEN RETURN true; END IF;
  RETURN CASE _key
    WHEN 'events_new' THEN _row.events_new
    WHEN 'events_changes' THEN _row.events_changes
    WHEN 'events_cancelled' THEN _row.events_cancelled
    WHEN 'news_new' THEN _row.news_new
    WHEN 'social_likes' THEN _row.social_likes
    WHEN 'social_comments' THEN _row.social_comments
    WHEN 'social_followers' THEN _row.social_followers
    WHEN 'social_posts' THEN _row.social_posts
    WHEN 'marketplace_messages' THEN _row.marketplace_messages
    WHEN 'financial_withdrawals' THEN _row.financial_withdrawals
    WHEN 'financial_refunds' THEN _row.financial_refunds
    WHEN 'retention_reminders' THEN _row.retention_reminders
    WHEN 'push_enabled' THEN _row.push_enabled
    WHEN 'email_enabled' THEN _row.email_enabled
    ELSE true
  END;
END $$;

-- 3. Assinaturas Web Push
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own subscriptions"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- 4. Segredos internos (VAPID etc.) — só admin lê via SQL, edge function lê via service_role
CREATE TABLE IF NOT EXISTS public.app_secrets (
  key text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.app_secrets TO service_role;
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read app secrets"
  ON public.app_secrets FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Apenas a chave pública pode ser lida sem autenticação
CREATE OR REPLACE FUNCTION public.get_vapid_public_key()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT value FROM public.app_secrets WHERE key = 'vapid_public_key'
$$;
GRANT EXECUTE ON FUNCTION public.get_vapid_public_key() TO anon, authenticated;

-- 5. Triggers para notificações automáticas

-- Notícia publicada → notifica todos os usuários cadastrados (best-effort: artists+entrepreneurs+organizers)
CREATE OR REPLACE FUNCTION public.notify_on_news_published()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.published = true AND (TG_OP = 'INSERT' OR OLD.published IS DISTINCT FROM true) THEN
    INSERT INTO public.social_notifications (user_id, type, preview, target_type, target_id)
    SELECT DISTINCT u.id, 'news_published', LEFT(NEW.title, 140), 'news', NEW.id
    FROM auth.users u
    WHERE public.notif_pref_enabled(u.id, 'news_new');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_news_published ON public.news;
CREATE TRIGGER trg_notify_news_published
  AFTER INSERT OR UPDATE OF published ON public.news
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_news_published();

-- Evento publicado / alterado / cancelado
CREATE OR REPLACE FUNCTION public.notify_on_event_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _type text; _preview text;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.published = true THEN
    _type := 'event_published';
    _preview := 'Novo evento: ' || LEFT(NEW.title, 120);
    INSERT INTO public.social_notifications (user_id, type, preview, target_type, target_id)
    SELECT DISTINCT u.id, _type, _preview, 'event', NEW.id
    FROM auth.users u
    WHERE public.notif_pref_enabled(u.id, 'events_new');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Cancelado (published true→false)
    IF OLD.published = true AND NEW.published = false THEN
      INSERT INTO public.social_notifications (user_id, type, preview, target_type, target_id)
      SELECT DISTINCT ea.user_id, 'event_cancelled', 'Evento cancelado: ' || LEFT(NEW.title, 120), 'event', NEW.id
      FROM public.event_attendees ea
      WHERE ea.event_id = NEW.id
        AND public.notif_pref_enabled(ea.user_id, 'events_cancelled');
      RETURN NEW;
    END IF;

    -- Publicado pela primeira vez
    IF OLD.published = false AND NEW.published = true THEN
      INSERT INTO public.social_notifications (user_id, type, preview, target_type, target_id)
      SELECT DISTINCT u.id, 'event_published', 'Novo evento: ' || LEFT(NEW.title, 120), 'event', NEW.id
      FROM auth.users u
      WHERE public.notif_pref_enabled(u.id, 'events_new');
      RETURN NEW;
    END IF;

    -- Data ou local alterados → avisa quem marcou "Eu vou"
    IF NEW.published = true AND (OLD.event_date IS DISTINCT FROM NEW.event_date OR OLD.location IS DISTINCT FROM NEW.location) THEN
      _preview := 'Atualização em "' || LEFT(NEW.title, 80) || '": ' ||
        CASE WHEN OLD.event_date IS DISTINCT FROM NEW.event_date THEN 'nova data ' || to_char(NEW.event_date,'DD/MM/YYYY HH24:MI') ELSE '' END ||
        CASE WHEN OLD.location IS DISTINCT FROM NEW.location THEN ' • novo local: ' || LEFT(NEW.location, 80) ELSE '' END;
      INSERT INTO public.social_notifications (user_id, type, preview, target_type, target_id)
      SELECT DISTINCT ea.user_id, 'event_changed', _preview, 'event', NEW.id
      FROM public.event_attendees ea
      WHERE ea.event_id = NEW.id
        AND public.notif_pref_enabled(ea.user_id, 'events_changes');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_event_change ON public.events;
CREATE TRIGGER trg_notify_event_change
  AFTER INSERT OR UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_event_change();

-- Saque: solicitado / aprovado / pago
CREATE OR REPLACE FUNCTION public.notify_on_withdrawal_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _owner uuid;
BEGIN
  SELECT user_id INTO _owner FROM public.organizers WHERE id = NEW.organizer_id;
  IF _owner IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.social_notifications (user_id, type, preview, target_type, target_id)
    SELECT _owner, 'withdrawal_requested', 'Solicitação de saque enviada.', 'withdrawal', NEW.id
    WHERE public.notif_pref_enabled(_owner, 'financial_withdrawals');
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.social_notifications (user_id, type, preview, target_type, target_id)
      SELECT _owner, 'withdrawal_approved', 'Seu saque foi aprovado e será pago em breve.', 'withdrawal', NEW.id
      WHERE public.notif_pref_enabled(_owner, 'financial_withdrawals');
    ELSIF NEW.status = 'paid' THEN
      INSERT INTO public.social_notifications (user_id, type, preview, target_type, target_id)
      SELECT _owner, 'withdrawal_paid', 'Saque pago! Confira o comprovante.', 'withdrawal', NEW.id
      WHERE public.notif_pref_enabled(_owner, 'financial_withdrawals');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_withdrawal_change ON public.withdrawal_requests;
CREATE TRIGGER trg_notify_withdrawal_change
  AFTER INSERT OR UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_withdrawal_change();

-- Reembolso: solicitado / aprovado / pago (notifica o comprador)
CREATE OR REPLACE FUNCTION public.notify_on_refund_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _buyer uuid;
BEGIN
  SELECT t.user_id INTO _buyer FROM public.tickets t WHERE t.id = NEW.ticket_id;
  IF _buyer IS NULL THEN RETURN NEW; END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.social_notifications (user_id, type, preview, target_type, target_id)
    SELECT _buyer, 'refund_requested', 'Solicitação de reembolso recebida.', 'refund', NEW.id
    WHERE public.notif_pref_enabled(_buyer, 'financial_refunds');
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.social_notifications (user_id, type, preview, target_type, target_id)
      SELECT _buyer, 'refund_approved', 'Seu reembolso foi aprovado.', 'refund', NEW.id
      WHERE public.notif_pref_enabled(_buyer, 'financial_refunds');
    ELSIF NEW.status = 'paid' THEN
      INSERT INTO public.social_notifications (user_id, type, preview, target_type, target_id)
      SELECT _buyer, 'refund_paid', 'Reembolso pago! Confira o comprovante.', 'refund', NEW.id
      WHERE public.notif_pref_enabled(_buyer, 'financial_refunds');
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_notify_refund_change ON public.refund_requests;
CREATE TRIGGER trg_notify_refund_change
  AFTER INSERT OR UPDATE ON public.refund_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_on_refund_change();

-- Realtime para notificações novas
ALTER PUBLICATION supabase_realtime ADD TABLE public.social_notifications;
