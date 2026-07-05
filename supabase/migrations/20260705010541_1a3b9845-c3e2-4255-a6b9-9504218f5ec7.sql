
-- 1. user_progression guard
CREATE OR REPLACE FUNCTION public.user_progression_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_privileged boolean := false;
  jwt_role text;
BEGIN
  BEGIN
    jwt_role := current_setting('request.jwt.claim.role', true);
  EXCEPTION WHEN OTHERS THEN
    jwt_role := NULL;
  END;

  IF session_user IN ('postgres','supabase_admin','service_role')
     OR current_user IN ('postgres','supabase_admin','service_role')
     OR jwt_role = 'service_role'
     OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(),'admin'::app_role)) THEN
    is_privileged := true;
  END IF;

  IF is_privileged THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.xp := 0;
    NEW.level := 1;
    NEW.rank_id := NULL;
    NEW.fans_count := 0;
    NEW.followers_count := 0;
    NEW.following_count := 0;
    NEW.likes_received := 0;
    NEW.comments_received := 0;
    NEW.shares_received := 0;
    NEW.events_attended := 0;
    NEW.events_organized := 0;
    NEW.products_sold := 0;
    RETURN NEW;
  END IF;

  IF NEW.xp IS DISTINCT FROM OLD.xp
     OR NEW.level IS DISTINCT FROM OLD.level
     OR NEW.rank_id IS DISTINCT FROM OLD.rank_id
     OR NEW.fans_count IS DISTINCT FROM OLD.fans_count
     OR NEW.followers_count IS DISTINCT FROM OLD.followers_count
     OR NEW.following_count IS DISTINCT FROM OLD.following_count
     OR NEW.likes_received IS DISTINCT FROM OLD.likes_received
     OR NEW.comments_received IS DISTINCT FROM OLD.comments_received
     OR NEW.shares_received IS DISTINCT FROM OLD.shares_received
     OR NEW.events_attended IS DISTINCT FROM OLD.events_attended
     OR NEW.events_organized IS DISTINCT FROM OLD.events_organized
     OR NEW.products_sold IS DISTINCT FROM OLD.products_sold
     OR NEW.user_id IS DISTINCT FROM OLD.user_id
     OR NEW.last_activity_at IS DISTINCT FROM OLD.last_activity_at THEN
    RAISE EXCEPTION 'user_progression: only class_id may be modified directly'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_progression_guard_trg ON public.user_progression;
CREATE TRIGGER user_progression_guard_trg
BEFORE INSERT OR UPDATE ON public.user_progression
FOR EACH ROW EXECUTE FUNCTION public.user_progression_guard();

-- 2. Event gallery storage: scoped by approval status
DROP POLICY IF EXISTS "event-gallery public read" ON storage.objects;

CREATE POLICY "event-gallery public read approved"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'event-gallery'
  AND (
    (auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = (auth.uid())::text)
    OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(),'admin'::app_role))
    OR EXISTS (
      SELECT 1 FROM public.event_gallery_items g
      WHERE (g.media_url LIKE '%/' || storage.objects.name
             OR g.thumbnail_url LIKE '%/' || storage.objects.name)
        AND g.approved = true
        AND COALESCE(g.reported, false) = false
    )
  )
);

-- 3. Revoke EXECUTE on internal/trigger SECURITY DEFINER functions
DO $$
DECLARE
  fn text;
  trigger_fns text[] := ARRAY[
    'community_members_counter()',
    'community_owner_autojoin()',
    'community_post_likes_counter()',
    'community_posts_counter()',
    'dispatch_push_after_insert()',
    'email_queue_wake()',
    'enforce_ticket_limit()',
    'enforce_withdrawal_receipt()',
    'ensure_user_profile()',
    'event_gallery_like_counter()',
    'notify_on_comment()',
    'notify_on_event_change()',
    'notify_on_follow()',
    'notify_on_like()',
    'notify_on_news_published()',
    'notify_on_refund_change()',
    'notify_on_withdrawal_change()',
    'refund_requests_handle_update()',
    'refund_requests_validate_insert()',
    'sync_class_to_progression()',
    'tickets_apply_category_snapshot()',
    'tickets_guard_courtesy()',
    'touch_conversation_on_message()',
    'user_progression_guard()',
    'xp_on_comment()',
    'xp_on_event_attendee()',
    'xp_on_event_checkin()',
    'xp_on_follow()',
    'xp_on_gallery_like()',
    'xp_on_gallery_upload()',
    'xp_on_like()',
    'xp_on_message()',
    'xp_on_post()',
    'xp_on_product()',
    'xp_on_share()',
    'xp_on_story()',
    'xp_on_ticket()',
    'xp_on_ticket_used()',
    'generate_ticket_code()',
    'email_queue_dispatch()',
    'move_to_dlq(text,text,bigint,jsonb)',
    'read_email_batch(text,integer,integer)',
    'delete_email(text,bigint)',
    'enqueue_email(text,jsonb)',
    'recalc_user_rank(uuid)',
    'award_xp(uuid,text,text,uuid,jsonb)',
    'log_financial_event(text,text,uuid,jsonb)',
    'log_validation(uuid,uuid,text,text,text,text)'
  ];
BEGIN
  FOREACH fn IN ARRAY trigger_fns LOOP
    BEGIN
      EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;
