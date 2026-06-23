
-- =========================================================
-- Messenger verification
-- =========================================================
CREATE TABLE IF NOT EXISTS public.messenger_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  selfie_url text NOT NULL,
  document_url text NOT NULL,
  full_name text NOT NULL,
  document_number text,
  status text NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.messenger_verifications TO authenticated;
GRANT ALL ON public.messenger_verifications TO service_role;

ALTER TABLE public.messenger_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own verification"
  ON public.messenger_verifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Users insert own verification"
  ON public.messenger_verifications FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own pending"
  ON public.messenger_verifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND status = 'pending')
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage verifications"
  ON public.messenger_verifications FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE INDEX IF NOT EXISTS messenger_verifications_user_idx ON public.messenger_verifications(user_id);
CREATE INDEX IF NOT EXISTS messenger_verifications_status_idx ON public.messenger_verifications(status);

CREATE TRIGGER trg_messenger_verifications_updated
  BEFORE UPDATE ON public.messenger_verifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helper: usuário está verificado?
CREATE OR REPLACE FUNCTION public.is_messenger_verified(_user uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.messenger_verifications
    WHERE user_id = _user AND status = 'approved'
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_messenger_verified(uuid) TO authenticated, anon;

-- =========================================================
-- Conversations & Messages
-- =========================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_b uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.social_products(id) ON DELETE SET NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_preview text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (user_a <> user_b),
  CHECK (user_a < user_b)
);

CREATE UNIQUE INDEX IF NOT EXISTS conversations_pair_product_uidx
  ON public.conversations(user_a, user_b, COALESCE(product_id, '00000000-0000-0000-0000-000000000000'::uuid));

GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view conversation"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (auth.uid() IN (user_a, user_b) OR public.has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Verified users start conversation"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (user_a, user_b)
    AND public.is_messenger_verified(auth.uid())
  );

CREATE POLICY "Admins manage conversations"
  ON public.conversations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

CREATE INDEX IF NOT EXISTS conversations_user_a_idx ON public.conversations(user_a);
CREATE INDEX IF NOT EXISTS conversations_user_b_idx ON public.conversations(user_b);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (length(content) BETWEEN 1 AND 2000),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view messages"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b)
    )
    OR public.has_role(auth.uid(),'admin'::app_role)
  );

-- Quem inicia precisa estar verificado; resposta livre para participante
CREATE POLICY "Participants send messages"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
        AND auth.uid() IN (c.user_a, c.user_b)
    )
    AND (
      -- Verificado pode mandar sempre
      public.is_messenger_verified(auth.uid())
      OR
      -- Não verificado só pode responder se existe mensagem do outro
      EXISTS (
        SELECT 1 FROM public.messages m
        WHERE m.conversation_id = conversation_id AND m.sender_id <> auth.uid()
      )
    )
  );

CREATE POLICY "Recipients mark read"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    sender_id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND auth.uid() IN (c.user_a, c.user_b)
    )
  );

CREATE INDEX IF NOT EXISTS messages_conversation_idx ON public.messages(conversation_id, created_at DESC);

-- Atualiza last_message_at / preview e dispara notificação
CREATE OR REPLACE FUNCTION public.touch_conversation_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _other uuid; _conv RECORD;
BEGIN
  UPDATE public.conversations
    SET last_message_at = NEW.created_at,
        last_preview = LEFT(NEW.content, 140)
    WHERE id = NEW.conversation_id
    RETURNING * INTO _conv;

  _other := CASE WHEN _conv.user_a = NEW.sender_id THEN _conv.user_b ELSE _conv.user_a END;

  INSERT INTO public.social_notifications (user_id, type, actor_user_id, preview, target_type, target_id)
  SELECT _other, 'message_received', NEW.sender_id, LEFT(NEW.content, 140), 'conversation', NEW.conversation_id
  WHERE public.notif_pref_enabled(_other, 'marketplace_messages');

  RETURN NEW;
END $$;

CREATE TRIGGER trg_touch_conversation_on_message
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation_on_message();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
