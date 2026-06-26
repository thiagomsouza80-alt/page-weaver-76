
-- =========================================================
-- FASE 1 — Fundação de Gamificação (Social Pop)
-- =========================================================

-- CLASSES
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  icon text,
  color text DEFAULT '#7c3aed',
  description text,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.classes TO anon, authenticated;
GRANT ALL ON public.classes TO service_role;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "classes_read_all" ON public.classes FOR SELECT USING (true);
CREATE POLICY "classes_admin_write" ON public.classes FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER classes_touch BEFORE UPDATE ON public.classes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RANKS
CREATE TABLE public.ranks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  min_xp int NOT NULL DEFAULT 0,
  icon text,
  color text DEFAULT '#94a3b8',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ranks TO anon, authenticated;
GRANT ALL ON public.ranks TO service_role;
ALTER TABLE public.ranks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ranks_read_all" ON public.ranks FOR SELECT USING (true);
CREATE POLICY "ranks_admin_write" ON public.ranks FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER ranks_touch BEFORE UPDATE ON public.ranks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ACHIEVEMENTS
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  icon text,
  rarity text NOT NULL DEFAULT 'common',
  xp_bonus int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ach_read_all" ON public.achievements FOR SELECT USING (true);
CREATE POLICY "ach_admin_write" ON public.achievements FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER ach_touch BEFORE UPDATE ON public.achievements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- XP RULES
CREATE TABLE public.xp_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL UNIQUE,
  label text NOT NULL,
  xp int NOT NULL DEFAULT 0,
  daily_cap int,                 -- max por dia (NULL = ilimitado)
  per_target_once boolean NOT NULL DEFAULT false,  -- 1x por alvo (ex: like por post)
  cooldown_seconds int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.xp_rules TO anon, authenticated;
GRANT ALL ON public.xp_rules TO service_role;
ALTER TABLE public.xp_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_rules_read_all" ON public.xp_rules FOR SELECT USING (true);
CREATE POLICY "xp_rules_admin_write" ON public.xp_rules FOR ALL
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));
CREATE TRIGGER xp_rules_touch BEFORE UPDATE ON public.xp_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- USER PROGRESSION
CREATE TABLE public.user_progression (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp bigint NOT NULL DEFAULT 0,
  level int NOT NULL DEFAULT 1,
  rank_id uuid REFERENCES public.ranks(id) ON DELETE SET NULL,
  class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL,
  fans_count int NOT NULL DEFAULT 0,
  followers_count int NOT NULL DEFAULT 0,
  following_count int NOT NULL DEFAULT 0,
  likes_received int NOT NULL DEFAULT 0,
  comments_received int NOT NULL DEFAULT 0,
  shares_received int NOT NULL DEFAULT 0,
  events_attended int NOT NULL DEFAULT 0,
  events_organized int NOT NULL DEFAULT 0,
  products_sold int NOT NULL DEFAULT 0,
  last_activity_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_progression TO anon, authenticated;
GRANT UPDATE ON public.user_progression TO authenticated;
GRANT ALL ON public.user_progression TO service_role;
ALTER TABLE public.user_progression ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prog_read_all" ON public.user_progression FOR SELECT USING (true);
CREATE POLICY "prog_self_class_update" ON public.user_progression FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER prog_touch BEFORE UPDATE ON public.user_progression
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- XP EVENTS
CREATE TABLE public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  xp int NOT NULL DEFAULT 0,
  flagged boolean NOT NULL DEFAULT false,
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX xp_events_user_idx ON public.xp_events(user_id, created_at DESC);
CREATE INDEX xp_events_dedup_idx ON public.xp_events(user_id, action, target_type, target_id);
GRANT SELECT ON public.xp_events TO authenticated;
GRANT ALL ON public.xp_events TO service_role;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_events_self_read" ON public.xp_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'::app_role));

-- USER ACHIEVEMENTS
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);
GRANT SELECT ON public.user_achievements TO anon, authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uach_read_all" ON public.user_achievements FOR SELECT USING (true);

-- =========================================================
-- FUNÇÕES
-- =========================================================

-- Curva de nível: nível N requer round(100 * 1.15^(N-1)) acumulado em "xp por nível"
-- Total para alcançar nível L = soma das exigências; simplificamos por busca incremental.
CREATE OR REPLACE FUNCTION public.calc_level_for_xp(_xp bigint)
RETURNS int LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE _level int := 1; _need numeric := 100; _acc numeric := 0;
BEGIN
  WHILE _acc + _need <= _xp AND _level < 999 LOOP
    _acc := _acc + _need;
    _level := _level + 1;
    _need := _need * 1.15;
  END LOOP;
  RETURN _level;
END $$;

-- Recalcula rank com base em XP atual
CREATE OR REPLACE FUNCTION public.recalc_user_rank(_user uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _xp bigint; _rank uuid;
BEGIN
  SELECT xp INTO _xp FROM public.user_progression WHERE user_id = _user;
  IF _xp IS NULL THEN RETURN; END IF;
  SELECT id INTO _rank FROM public.ranks
    WHERE is_active = true AND min_xp <= _xp
    ORDER BY min_xp DESC LIMIT 1;
  UPDATE public.user_progression
    SET rank_id = _rank,
        level = public.calc_level_for_xp(_xp)
    WHERE user_id = _user;
END $$;

-- Award XP (com deduplicação e cap diário)
CREATE OR REPLACE FUNCTION public.award_xp(
  _user uuid,
  _action text,
  _target_type text DEFAULT NULL,
  _target_id uuid DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
) RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _rule public.xp_rules;
  _today_total int;
  _last_at timestamptz;
  _exists boolean;
  _award int := 0;
BEGIN
  IF _user IS NULL OR _action IS NULL THEN RETURN 0; END IF;

  SELECT * INTO _rule FROM public.xp_rules WHERE action = _action AND is_active = true;
  IF _rule.id IS NULL OR _rule.xp <= 0 THEN RETURN 0; END IF;

  -- per_target_once
  IF _rule.per_target_once AND _target_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.xp_events
      WHERE user_id = _user AND action = _action
        AND target_type IS NOT DISTINCT FROM _target_type
        AND target_id = _target_id
    ) INTO _exists;
    IF _exists THEN RETURN 0; END IF;
  END IF;

  -- cooldown
  IF _rule.cooldown_seconds > 0 THEN
    SELECT max(created_at) INTO _last_at FROM public.xp_events
      WHERE user_id = _user AND action = _action;
    IF _last_at IS NOT NULL AND _last_at > now() - make_interval(secs => _rule.cooldown_seconds) THEN
      RETURN 0;
    END IF;
  END IF;

  -- daily_cap
  IF _rule.daily_cap IS NOT NULL THEN
    SELECT COALESCE(SUM(xp),0) INTO _today_total FROM public.xp_events
      WHERE user_id = _user AND action = _action
        AND created_at >= date_trunc('day', now());
    IF _today_total >= _rule.daily_cap THEN RETURN 0; END IF;
    _award := LEAST(_rule.xp, _rule.daily_cap - _today_total);
  ELSE
    _award := _rule.xp;
  END IF;

  INSERT INTO public.xp_events (user_id, action, target_type, target_id, xp, metadata)
  VALUES (_user, _action, _target_type, _target_id, _award, COALESCE(_metadata,'{}'::jsonb));

  INSERT INTO public.user_progression (user_id, xp, last_activity_at)
  VALUES (_user, _award, now())
  ON CONFLICT (user_id) DO UPDATE
    SET xp = public.user_progression.xp + _award,
        last_activity_at = now();

  PERFORM public.recalc_user_rank(_user);
  RETURN _award;
EXCEPTION WHEN OTHERS THEN
  RETURN 0;
END $$;

GRANT EXECUTE ON FUNCTION public.award_xp(uuid,text,text,uuid,jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.recalc_user_rank(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.calc_level_for_xp(bigint) TO anon, authenticated, service_role;

-- =========================================================
-- TRIGGERS DE XP (não-bloqueantes)
-- =========================================================
CREATE OR REPLACE FUNCTION public.xp_on_post() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.award_xp(NEW.user_id, 'create_post', 'post', NEW.id); RETURN NEW; EXCEPTION WHEN OTHERS THEN RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.xp_on_comment() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _owner uuid;
BEGIN
  PERFORM public.award_xp(NEW.user_id, 'create_comment', 'post', NEW.post_id);
  SELECT user_id INTO _owner FROM public.social_posts WHERE id = NEW.post_id;
  IF _owner IS NOT NULL AND _owner <> NEW.user_id THEN
    PERFORM public.award_xp(_owner, 'receive_comment', 'post', NEW.post_id);
    UPDATE public.user_progression SET comments_received = comments_received + 1 WHERE user_id = _owner;
  END IF;
  RETURN NEW; EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.xp_on_like() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _owner uuid;
BEGIN
  PERFORM public.award_xp(NEW.user_id, 'give_like', 'post', NEW.post_id);
  SELECT user_id INTO _owner FROM public.social_posts WHERE id = NEW.post_id;
  IF _owner IS NOT NULL AND _owner <> NEW.user_id THEN
    PERFORM public.award_xp(_owner, 'receive_like', 'post', NEW.post_id);
    UPDATE public.user_progression SET likes_received = likes_received + 1 WHERE user_id = _owner;
  END IF;
  RETURN NEW; EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.xp_on_share() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _owner uuid;
BEGIN
  PERFORM public.award_xp(NEW.user_id, 'give_share', 'post', NEW.post_id);
  SELECT user_id INTO _owner FROM public.social_posts WHERE id = NEW.post_id;
  IF _owner IS NOT NULL AND _owner <> NEW.user_id THEN
    PERFORM public.award_xp(_owner, 'receive_share', 'post', NEW.post_id);
    UPDATE public.user_progression SET shares_received = shares_received + 1 WHERE user_id = _owner;
  END IF;
  RETURN NEW; EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.xp_on_follow() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _target uuid;
BEGIN
  PERFORM public.award_xp(NEW.follower_user_id, 'give_follow', NEW.target_type, NEW.target_id);
  UPDATE public.user_progression SET following_count = following_count + 1 WHERE user_id = NEW.follower_user_id;
  IF NEW.target_type = 'artist' THEN
    SELECT user_id INTO _target FROM public.artists WHERE id = NEW.target_id;
  ELSIF NEW.target_type = 'entrepreneur' THEN
    SELECT user_id INTO _target FROM public.entrepreneurs WHERE id = NEW.target_id;
  END IF;
  IF _target IS NOT NULL AND _target <> NEW.follower_user_id THEN
    PERFORM public.award_xp(_target, 'receive_follow', NEW.target_type, NEW.target_id);
    UPDATE public.user_progression SET followers_count = followers_count + 1 WHERE user_id = _target;
  END IF;
  RETURN NEW; EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.xp_on_event_attendee() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  PERFORM public.award_xp(NEW.user_id, 'event_rsvp', 'event', NEW.event_id);
  UPDATE public.user_progression SET events_attended = events_attended + 1 WHERE user_id = NEW.user_id;
  RETURN NEW; EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.xp_on_ticket() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.is_courtesy THEN
    PERFORM public.award_xp(NEW.user_id, 'ticket_redeem', 'ticket', NEW.id);
  ELSE
    PERFORM public.award_xp(NEW.user_id, 'ticket_purchase', 'ticket', NEW.id);
  END IF;
  RETURN NEW; EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.xp_on_ticket_used() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status = 'used' AND (OLD.status IS DISTINCT FROM 'used') AND NEW.user_id IS NOT NULL THEN
    PERFORM public.award_xp(NEW.user_id, 'ticket_validated', 'ticket', NEW.id);
  END IF;
  RETURN NEW; EXCEPTION WHEN OTHERS THEN RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.xp_on_product() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.award_xp(NEW.user_id, 'create_product', 'product', NEW.id); RETURN NEW; EXCEPTION WHEN OTHERS THEN RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION public.xp_on_message() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public.award_xp(NEW.sender_id, 'send_message', 'conversation', NEW.conversation_id); RETURN NEW; EXCEPTION WHEN OTHERS THEN RETURN NEW; END $$;

-- Aplicar triggers (idempotente)
DROP TRIGGER IF EXISTS trg_xp_post ON public.social_posts;
CREATE TRIGGER trg_xp_post AFTER INSERT ON public.social_posts FOR EACH ROW EXECUTE FUNCTION public.xp_on_post();

DROP TRIGGER IF EXISTS trg_xp_comment ON public.social_comments;
CREATE TRIGGER trg_xp_comment AFTER INSERT ON public.social_comments FOR EACH ROW EXECUTE FUNCTION public.xp_on_comment();

DROP TRIGGER IF EXISTS trg_xp_like ON public.social_likes;
CREATE TRIGGER trg_xp_like AFTER INSERT ON public.social_likes FOR EACH ROW EXECUTE FUNCTION public.xp_on_like();

DROP TRIGGER IF EXISTS trg_xp_share ON public.social_shares;
CREATE TRIGGER trg_xp_share AFTER INSERT ON public.social_shares FOR EACH ROW EXECUTE FUNCTION public.xp_on_share();

DROP TRIGGER IF EXISTS trg_xp_follow ON public.social_follows;
CREATE TRIGGER trg_xp_follow AFTER INSERT ON public.social_follows FOR EACH ROW EXECUTE FUNCTION public.xp_on_follow();

DROP TRIGGER IF EXISTS trg_xp_attendee ON public.event_attendees;
CREATE TRIGGER trg_xp_attendee AFTER INSERT ON public.event_attendees FOR EACH ROW EXECUTE FUNCTION public.xp_on_event_attendee();

DROP TRIGGER IF EXISTS trg_xp_ticket ON public.tickets;
CREATE TRIGGER trg_xp_ticket AFTER INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.xp_on_ticket();

DROP TRIGGER IF EXISTS trg_xp_ticket_used ON public.tickets;
CREATE TRIGGER trg_xp_ticket_used AFTER UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.xp_on_ticket_used();

DROP TRIGGER IF EXISTS trg_xp_product ON public.social_products;
CREATE TRIGGER trg_xp_product AFTER INSERT ON public.social_products FOR EACH ROW EXECUTE FUNCTION public.xp_on_product();

DROP TRIGGER IF EXISTS trg_xp_message ON public.messages;
CREATE TRIGGER trg_xp_message AFTER INSERT ON public.messages FOR EACH ROW EXECUTE FUNCTION public.xp_on_message();

-- =========================================================
-- SEEDS
-- =========================================================
INSERT INTO public.classes (code,name,icon,color,sort_order) VALUES
 ('cosplayer','Cosplayer','sparkles','#ec4899',1),
 ('dancer','Dançarino','music','#f59e0b',2),
 ('singer','Cantor','mic','#ef4444',3),
 ('musician','Músico','music-2','#f97316',4),
 ('gamer','Gamer','gamepad-2','#22c55e',5),
 ('army','Army','shield','#a855f7',6),
 ('artist','Artista','palette','#06b6d4',7),
 ('creator','Criador de Conteúdo','video','#8b5cf6',8),
 ('streamer','Streamer','tv','#6366f1',9),
 ('influencer','Influenciador','megaphone','#d946ef',10),
 ('photographer','Fotógrafo','camera','#0ea5e9',11),
 ('videomaker','Videomaker','film','#14b8a6',12),
 ('entrepreneur','Empreendedor','briefcase','#84cc16',13),
 ('organizer','Organizador de Eventos','calendar','#f43f5e',14),
 ('fan','Fã','heart','#fb7185',15)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.ranks (code,name,min_xp,color,sort_order) VALUES
 ('starter','Iniciante',0,'#94a3b8',1),
 ('bronze','Bronze',500,'#b45309',2),
 ('silver','Prata',2000,'#9ca3af',3),
 ('gold','Ouro',5000,'#eab308',4),
 ('platinum','Platina',12000,'#22d3ee',5),
 ('diamond','Diamante',25000,'#60a5fa',6),
 ('master','Mestre',50000,'#a78bfa',7),
 ('legendary','Lendário',100000,'#f43f5e',8)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.achievements (code,name,description,icon,rarity,xp_bonus) VALUES
 ('first_post','Primeira Publicação','Você publicou pela primeira vez!','edit','common',50),
 ('first_comment','Primeiro Comentário','Comentou pela primeira vez.','message-circle','common',20),
 ('first_like','Primeira Curtida','Curtiu uma publicação.','heart','common',10),
 ('first_follow','Primeiro Seguidor','Conquistou seu primeiro seguidor.','user-plus','common',50),
 ('first_fan','Primeiro Fã','Conquistou seu primeiro fã.','star','rare',100),
 ('first_event','Primeiro Evento','Confirmou presença em um evento.','calendar','common',30),
 ('first_ticket','Primeiro Ingresso','Resgatou ou comprou seu primeiro ingresso.','ticket','common',50),
 ('first_sale','Primeira Venda','Vendeu seu primeiro produto.','shopping-bag','rare',150),
 ('verified','Perfil Verificado','Sua identidade foi verificada.','badge-check','epic',300),
 ('hundred_likes','100 Curtidas','Recebeu 100 curtidas.','heart','rare',200),
 ('hundred_comments','100 Comentários','Recebeu 100 comentários.','message-square','rare',200),
 ('top_category','Top da Categoria','Liderou sua categoria por uma semana.','trophy','legendary',500)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.xp_rules (action,label,xp,daily_cap,per_target_once,cooldown_seconds) VALUES
 ('create_post','Criar publicação',25,200,false,30),
 ('create_comment','Comentar',5,150,false,5),
 ('give_like','Curtir',1,100,true,0),
 ('give_share','Compartilhar',3,60,true,0),
 ('give_follow','Seguir alguém',5,100,true,0),
 ('receive_like','Receber curtida',2,500,false,0),
 ('receive_comment','Receber comentário',5,500,false,0),
 ('receive_share','Receber compartilhamento',10,500,false,0),
 ('receive_follow','Ganhar seguidor',15,NULL,true,0),
 ('event_rsvp','Confirmar presença',10,NULL,true,0),
 ('ticket_purchase','Comprar ingresso',50,NULL,true,0),
 ('ticket_redeem','Resgatar cortesia',20,NULL,true,0),
 ('ticket_validated','Check-in validado',30,NULL,true,0),
 ('create_product','Publicar produto',20,50,false,30),
 ('product_sold','Venda concluída',100,NULL,false,0),
 ('send_message','Enviar mensagem',1,30,false,2),
 ('daily_login','Login diário',10,1,false,0),
 ('complete_profile','Completar perfil',100,1,true,0),
 ('add_avatar','Adicionar foto',30,1,true,0),
 ('add_bio','Adicionar biografia',20,1,true,0),
 ('identity_verified','Identidade verificada',300,1,true,0),
 ('create_story','Publicar Story',15,30,false,30),
 ('story_reaction_received','Reação no Story',2,500,false,0),
 ('checkin_event','Check-in no evento',50,NULL,true,0),
 ('organize_event','Publicar evento',150,NULL,true,0),
 ('event_completed','Evento concluído com sucesso',500,NULL,true,0)
ON CONFLICT (action) DO NOTHING;
