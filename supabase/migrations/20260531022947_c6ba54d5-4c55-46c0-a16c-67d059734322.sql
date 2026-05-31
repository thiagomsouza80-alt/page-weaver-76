
-- Social Pop Phase 1: Feed Social
CREATE TABLE public.social_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  author_type TEXT NOT NULL DEFAULT 'fan',
  author_name TEXT NOT NULL,
  author_avatar_url TEXT,
  content TEXT,
  media_urls TEXT[] DEFAULT '{}',
  media_type TEXT NOT NULL DEFAULT 'text',
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  shares_count INTEGER NOT NULL DEFAULT 0,
  hidden BOOLEAN NOT NULL DEFAULT false,
  deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_social_posts_created ON public.social_posts(created_at DESC) WHERE deleted = false AND hidden = false;
CREATE INDEX idx_social_posts_user ON public.social_posts(user_id);

GRANT SELECT ON public.social_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_posts TO authenticated;
GRANT ALL ON public.social_posts TO service_role;

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view visible posts" ON public.social_posts
  FOR SELECT USING (deleted = false AND hidden = false);
CREATE POLICY "Admins can view all posts" ON public.social_posts
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can create posts" ON public.social_posts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.social_posts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts" ON public.social_posts
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can update any post" ON public.social_posts
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete any post" ON public.social_posts
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_social_posts_updated_at
  BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
CREATE TABLE public.social_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_comment_id UUID REFERENCES public.social_comments(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  author_avatar_url TEXT,
  content TEXT NOT NULL,
  hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_social_comments_post ON public.social_comments(post_id, created_at);

GRANT SELECT ON public.social_comments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.social_comments TO authenticated;
GRANT ALL ON public.social_comments TO service_role;

ALTER TABLE public.social_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view visible comments" ON public.social_comments
  FOR SELECT USING (hidden = false);
CREATE POLICY "Admins view all comments" ON public.social_comments
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated users can create comments" ON public.social_comments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.social_comments
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage comments" ON public.social_comments
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Likes
CREATE TABLE public.social_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
CREATE INDEX idx_social_likes_post ON public.social_likes(post_id);
CREATE INDEX idx_social_likes_recent ON public.social_likes(created_at DESC);

GRANT SELECT ON public.social_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.social_likes TO authenticated;
GRANT ALL ON public.social_likes TO service_role;

ALTER TABLE public.social_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view likes" ON public.social_likes FOR SELECT USING (true);
CREATE POLICY "Users like" ON public.social_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unlike" ON public.social_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage likes" ON public.social_likes FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Saved posts
CREATE TABLE public.social_saved_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.social_saved_posts TO authenticated;
GRANT ALL ON public.social_saved_posts TO service_role;
ALTER TABLE public.social_saved_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own saved" ON public.social_saved_posts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users save" ON public.social_saved_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users unsave" ON public.social_saved_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Shares (audit/counter)
CREATE TABLE public.social_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.social_shares TO anon;
GRANT SELECT, INSERT ON public.social_shares TO authenticated;
GRANT ALL ON public.social_shares TO service_role;
ALTER TABLE public.social_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view shares" ON public.social_shares FOR SELECT USING (true);
CREATE POLICY "Anyone can share" ON public.social_shares FOR INSERT WITH CHECK (true);

-- Counter functions
CREATE OR REPLACE FUNCTION public.social_increment_likes(_post_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c integer;
BEGIN
  UPDATE public.social_posts SET likes_count = likes_count + 1 WHERE id = _post_id RETURNING likes_count INTO c;
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION public.social_decrement_likes(_post_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c integer;
BEGIN
  UPDATE public.social_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = _post_id RETURNING likes_count INTO c;
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION public.social_increment_comments(_post_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c integer;
BEGIN
  UPDATE public.social_posts SET comments_count = comments_count + 1 WHERE id = _post_id RETURNING comments_count INTO c;
  RETURN c;
END $$;

CREATE OR REPLACE FUNCTION public.social_increment_shares(_post_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c integer;
BEGIN
  UPDATE public.social_posts SET shares_count = shares_count + 1 WHERE id = _post_id RETURNING shares_count INTO c;
  RETURN c;
END $$;

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('social-media', 'social-media', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Social media public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'social-media');
CREATE POLICY "Authenticated upload social media" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'social-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own social media" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'social-media' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Admins manage social media" ON storage.objects
  FOR ALL TO authenticated USING (bucket_id = 'social-media' AND has_role(auth.uid(), 'admin'::app_role));
