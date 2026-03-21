
-- Enum para segmentos de artistas
CREATE TYPE public.artist_segment AS ENUM ('cosplayer', 'cosmaker', 'kpop', 'ilustrador', 'empreendedor');

-- Tabela de artistas
CREATE TABLE public.artists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  segment artist_segment NOT NULL,
  bio TEXT,
  city TEXT,
  instagram TEXT,
  profile_image_url TEXT,
  portfolio_images TEXT[] DEFAULT '{}',
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (public registration)
CREATE POLICY "Anyone can register as artist" ON public.artists
  FOR INSERT WITH CHECK (true);

-- Anyone can view approved artists
CREATE POLICY "Anyone can view approved artists" ON public.artists
  FOR SELECT USING (approved = true);

-- Tabela de notícias
CREATE TABLE public.news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  category TEXT NOT NULL DEFAULT 'geral',
  published BOOLEAN NOT NULL DEFAULT false,
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

-- Anyone can view published news
CREATE POLICY "Anyone can view published news" ON public.news
  FOR SELECT USING (published = true);

-- Tabela de eventos
CREATE TABLE public.events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  event_date TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT NOT NULL,
  published BOOLEAN NOT NULL DEFAULT false,
  author_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Anyone can view published events
CREATE POLICY "Anyone can view published events" ON public.events
  FOR SELECT USING (published = true);

-- Roles de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Função para verificar role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admins podem ver todos os artistas (incluindo não aprovados)
CREATE POLICY "Admins can view all artists" ON public.artists
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Admins podem atualizar artistas
CREATE POLICY "Admins can update artists" ON public.artists
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Admins podem gerenciar notícias
CREATE POLICY "Admins can manage news" ON public.news
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Admins podem gerenciar eventos
CREATE POLICY "Admins can manage events" ON public.events
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Admins podem ver roles
CREATE POLICY "Admins can view roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Users can see own role
CREATE POLICY "Users can see own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_artists_updated_at BEFORE UPDATE ON public.artists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_news_updated_at BEFORE UPDATE ON public.news
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('artists', 'artists', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('news', 'news', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('events', 'events', true);

-- Storage policies - anyone can upload to artists bucket
CREATE POLICY "Anyone can upload artist images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'artists');

CREATE POLICY "Anyone can view artist images" ON storage.objects
  FOR SELECT USING (bucket_id IN ('artists', 'news', 'events'));

-- Admins can upload to news and events
CREATE POLICY "Admins can upload news images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id IN ('news', 'events') AND public.has_role(auth.uid(), 'admin'));

-- Admins can delete images
CREATE POLICY "Admins can delete images" ON storage.objects
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
