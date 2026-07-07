
-- ============ MESSENGER FASE 2: grupos, anexos, respostas, reações, presença, encaminhamento ============

-- 1) CONVERSATIONS: suporte a grupos
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS is_group boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- Tornar user_a/user_b opcionais para grupos
ALTER TABLE public.conversations ALTER COLUMN user_a DROP NOT NULL;
ALTER TABLE public.conversations ALTER COLUMN user_b DROP NOT NULL;

-- 2) CONVERSATION_MEMBERS
CREATE TABLE IF NOT EXISTS public.conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  last_read_at timestamptz,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversation_members TO authenticated;
GRANT ALL ON public.conversation_members TO service_role;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_conversation_member(_conv uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_members WHERE conversation_id=_conv AND user_id=_user)
      OR EXISTS (SELECT 1 FROM public.conversations WHERE id=_conv AND (user_a=_user OR user_b=_user))
$$;
REVOKE EXECUTE ON FUNCTION public.is_conversation_member(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid,uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_conversation_admin(_conv uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.conversation_members
                 WHERE conversation_id=_conv AND user_id=_user AND role IN ('owner','admin'))
$$;
REVOKE EXECUTE ON FUNCTION public.is_conversation_admin(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_conversation_admin(uuid,uuid) TO authenticated, service_role;

CREATE POLICY "cm_select_members" ON public.conversation_members
  FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id, auth.uid()) OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "cm_insert_self_or_admin" ON public.conversation_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_conversation_admin(conversation_id, auth.uid())
    OR has_role(auth.uid(),'admin'::app_role)
  );

CREATE POLICY "cm_update_self_or_admin" ON public.conversation_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_conversation_admin(conversation_id, auth.uid()) OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (user_id = auth.uid() OR public.is_conversation_admin(conversation_id, auth.uid()) OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "cm_delete_self_or_admin" ON public.conversation_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_conversation_admin(conversation_id, auth.uid()) OR has_role(auth.uid(),'admin'::app_role));

-- 3) MESSAGES: anexos, resposta, encaminhamento, deletado
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_type text,
  ADD COLUMN IF NOT EXISTS attachment_meta jsonb,
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS forwarded_from_id uuid REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS edited_at timestamptz;

-- Permitir content vazio quando houver anexo
ALTER TABLE public.messages ALTER COLUMN content DROP NOT NULL;

-- Reescrever policies removendo dependência de is_messenger_verified e suportando grupos
DROP POLICY IF EXISTS "Participants view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants send messages" ON public.messages;
DROP POLICY IF EXISTS "Recipients mark read" ON public.messages;

CREATE POLICY "msg_select_members" ON public.messages
  FOR SELECT TO authenticated
  USING (public.is_conversation_member(conversation_id, auth.uid()) OR has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "msg_insert_members" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "msg_update_own_or_read" ON public.messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid() OR public.is_conversation_member(conversation_id, auth.uid()))
  WITH CHECK (sender_id = auth.uid() OR public.is_conversation_member(conversation_id, auth.uid()));

CREATE POLICY "msg_delete_own_or_admin" ON public.messages
  FOR DELETE TO authenticated
  USING (sender_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));

-- Conversations: liberar SELECT/INSERT para membros de grupo e sem exigir messenger_verified
DROP POLICY IF EXISTS "Verified users start conversation" ON public.conversations;
DROP POLICY IF EXISTS "Participants view conversation" ON public.conversations;

CREATE POLICY "conv_select_members" ON public.conversations
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_a OR auth.uid() = user_b
    OR public.is_conversation_member(id, auth.uid())
    OR has_role(auth.uid(),'admin'::app_role)
  );

CREATE POLICY "conv_insert_participants" ON public.conversations
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_a OR auth.uid() = user_b OR auth.uid() = created_by
  );

CREATE POLICY "conv_update_admins" ON public.conversations
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = user_a OR auth.uid() = user_b
    OR public.is_conversation_admin(id, auth.uid())
    OR has_role(auth.uid(),'admin'::app_role)
  )
  WITH CHECK (
    auth.uid() = user_a OR auth.uid() = user_b
    OR public.is_conversation_admin(id, auth.uid())
    OR has_role(auth.uid(),'admin'::app_role)
  );

-- 4) MESSAGE_REACTIONS
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT ALL ON public.message_reactions TO service_role;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rx_select_members" ON public.message_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.messages m
            WHERE m.id = message_reactions.message_id
              AND public.is_conversation_member(m.conversation_id, auth.uid()))
  );

CREATE POLICY "rx_insert_own_member" ON public.message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.messages m
                WHERE m.id = message_reactions.message_id
                  AND public.is_conversation_member(m.conversation_id, auth.uid()))
  );

CREATE POLICY "rx_delete_own" ON public.message_reactions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- 5) USER_PRESENCE (last seen / online)
CREATE TABLE IF NOT EXISTS public.user_presence (
  user_id uuid PRIMARY KEY,
  is_online boolean NOT NULL DEFAULT false,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_presence TO authenticated, anon;
GRANT INSERT, UPDATE ON public.user_presence TO authenticated;
GRANT ALL ON public.user_presence TO service_role;
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pres_select_all" ON public.user_presence FOR SELECT USING (true);
CREATE POLICY "pres_insert_own" ON public.user_presence FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "pres_update_own" ON public.user_presence FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 6) Sync last_read_at para DMs criando membros automaticamente
CREATE OR REPLACE FUNCTION public.conv_autoseed_members()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.user_a IS NOT NULL THEN
    INSERT INTO public.conversation_members(conversation_id, user_id, role)
    VALUES (NEW.id, NEW.user_a, CASE WHEN NEW.created_by = NEW.user_a THEN 'owner' ELSE 'member' END)
    ON CONFLICT DO NOTHING;
  END IF;
  IF NEW.user_b IS NOT NULL THEN
    INSERT INTO public.conversation_members(conversation_id, user_id, role)
    VALUES (NEW.id, NEW.user_b, 'member')
    ON CONFLICT DO NOTHING;
  END IF;
  IF NEW.is_group AND NEW.created_by IS NOT NULL THEN
    INSERT INTO public.conversation_members(conversation_id, user_id, role)
    VALUES (NEW.id, NEW.created_by, 'owner')
    ON CONFLICT (conversation_id,user_id) DO UPDATE SET role='owner';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_conv_autoseed ON public.conversations;
CREATE TRIGGER trg_conv_autoseed AFTER INSERT ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.conv_autoseed_members();

-- Backfill: criar membros para conversas DMs já existentes
INSERT INTO public.conversation_members(conversation_id, user_id, role)
SELECT c.id, c.user_a, 'member' FROM public.conversations c WHERE c.user_a IS NOT NULL
ON CONFLICT DO NOTHING;
INSERT INTO public.conversation_members(conversation_id, user_id, role)
SELECT c.id, c.user_b, 'member' FROM public.conversations c WHERE c.user_b IS NOT NULL
ON CONFLICT DO NOTHING;

-- 7) touch_conversation_on_message: atualizar para grupos (notificar todos os membros exceto o remetente)
CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _preview text;
BEGIN
  _preview := COALESCE(NULLIF(LEFT(NEW.content,140),''),
              CASE NEW.attachment_type
                WHEN 'image' THEN '📷 Foto'
                WHEN 'video' THEN '🎬 Vídeo'
                WHEN 'audio' THEN '🎤 Áudio'
                WHEN 'file'  THEN '📎 Arquivo'
                ELSE '' END);

  UPDATE public.conversations
    SET last_message_at = NEW.created_at,
        last_preview = _preview
    WHERE id = NEW.conversation_id;

  INSERT INTO public.social_notifications (user_id, type, actor_user_id, preview, target_type, target_id)
  SELECT cm.user_id, 'message_received', NEW.sender_id, _preview, 'conversation', NEW.conversation_id
    FROM public.conversation_members cm
   WHERE cm.conversation_id = NEW.conversation_id
     AND cm.user_id <> NEW.sender_id
     AND public.notif_pref_enabled(cm.user_id, 'marketplace_messages');

  RETURN NEW;
END $$;

-- 8) Realtime
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_members; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.message_reactions REPLICA IDENTITY FULL;
ALTER TABLE public.conversation_members REPLICA IDENTITY FULL;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
