import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Loader2, MapPin, Instagram, Youtube, Globe, Music2, Twitch, Twitter, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import XpProgressBar from "@/components/social/XpProgressBar";
import RankBadge from "@/components/social/RankBadge";
import ClassBadge from "@/components/social/ClassBadge";
import { useUserProgression } from "@/hooks/useUserProgression";
import HighlightsRow from "@/components/social/HighlightsRow";

interface PublicProfile {
  user_id: string;
  username: string;
  display_name: string;
  headline: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  links: Record<string, string>;
  visibility: string;
  xp: number | null;
  level: number | null;
  rank_id: string | null;
  class_id: string | null;
  followers_count: number | null;
  following_count: number | null;
  show_xp: boolean;
  show_achievements: boolean;
  artist_id: string | null;
  artist_name: string | null;
  entrepreneur_id: string | null;
  entrepreneur_slug: string | null;
  city: string | null;
}

const linkMeta: Record<string, { icon: any; label: string; href: (v: string) => string }> = {
  instagram: { icon: Instagram, label: "Instagram", href: v => v.startsWith("http") ? v : `https://instagram.com/${v.replace(/^@/, "")}` },
  tiktok: { icon: Music2, label: "TikTok", href: v => v.startsWith("http") ? v : `https://tiktok.com/@${v.replace(/^@/, "")}` },
  youtube: { icon: Youtube, label: "YouTube", href: v => v.startsWith("http") ? v : `https://youtube.com/${v}` },
  twitter: { icon: Twitter, label: "Twitter/X", href: v => v.startsWith("http") ? v : `https://x.com/${v.replace(/^@/, "")}` },
  twitch: { icon: Twitch, label: "Twitch", href: v => v.startsWith("http") ? v : `https://twitch.tv/${v}` },
  spotify: { icon: Music2, label: "Spotify", href: v => v },
  website: { icon: Globe, label: "Site", href: v => v.startsWith("http") ? v : `https://${v}` },
};

export default function PerfilPublico() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { achievements } = useUserProgression(profile?.user_id ?? null);
  const [klass, setKlass] = useState<any>(null);
  const [rank, setRank] = useState<any>(null);

  useEffect(() => {
    (async () => {
      if (!username) return;
      setLoading(true);
      const { data, error } = await supabase.rpc("get_public_profile" as any, { _username: username });
      if (error || !data || (data as any).length === 0) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const row = (data as any)[0] as PublicProfile;
      setProfile(row);
      const [k, r] = await Promise.all([
        row.class_id ? supabase.from("classes" as any).select("*").eq("id", row.class_id).maybeSingle() : Promise.resolve({ data: null } as any),
        row.rank_id ? supabase.from("ranks" as any).select("*").eq("id", row.rank_id).maybeSingle() : Promise.resolve({ data: null } as any),
      ]);
      setKlass(k.data);
      setRank(r.data);
      setLoading(false);
    })();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="max-w-2xl mx-auto px-4 pt-32 pb-16 text-center">
          <h1 className="text-2xl font-bold mb-2">Perfil não encontrado</h1>
          <p className="text-muted-foreground mb-6">Este perfil pode estar privado ou não existe.</p>
          <Link to="/social"><Button>Voltar para Social Pop</Button></Link>
        </main>
        <Footer />
      </div>
    );
  }

  const links = profile.links || {};

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-3xl mx-auto pt-20 pb-16">
        {/* Cover */}
        <div className="h-44 sm:h-56 bg-gradient-to-br from-primary/30 via-primary/10 to-secondary relative">
          {profile.cover_url && (
            <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />
          )}
        </div>

        <div className="px-4 sm:px-6 -mt-14">
          <div className="flex items-end gap-4">
            <div className="w-28 h-28 rounded-full border-4 border-background bg-secondary overflow-hidden shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.display_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground/40">
                  {profile.display_name?.[0]?.toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold">{profile.display_name}</h1>
              <RankBadge rank={rank} />
              <ClassBadge klass={klass} />
            </div>
            <p className="text-sm text-muted-foreground">@{profile.username}</p>
            {profile.headline && <p className="mt-2 text-foreground/90">{profile.headline}</p>}
            {profile.city && (
              <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {profile.city}
              </p>
            )}
          </div>

          {profile.bio && (
            <p className="mt-4 text-sm text-foreground/80 whitespace-pre-wrap">{profile.bio}</p>
          )}

          <HighlightsRow userId={profile.user_id} />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mt-6 text-center">
            <div className="bg-card rounded-xl border border-border/50 p-3">
              <p className="text-lg font-bold">{profile.followers_count ?? 0}</p>
              <p className="text-xs text-muted-foreground">Seguidores</p>
            </div>
            <div className="bg-card rounded-xl border border-border/50 p-3">
              <p className="text-lg font-bold">{profile.following_count ?? 0}</p>
              <p className="text-xs text-muted-foreground">Seguindo</p>
            </div>
            <div className="bg-card rounded-xl border border-border/50 p-3">
              <p className="text-lg font-bold">{profile.show_xp && profile.level ? profile.level : "—"}</p>
              <p className="text-xs text-muted-foreground">Nível</p>
            </div>
          </div>

          {/* XP */}
          {profile.show_xp && profile.xp !== null && (
            <div className="mt-4 bg-card rounded-xl border border-border/50 p-4">
              <XpProgressBar xp={profile.xp} level={profile.level ?? 1} />
            </div>
          )}

          {/* Social links */}
          {Object.keys(links).length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Redes</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(links).map(([key, value]) => {
                  if (!value) return null;
                  const meta = linkMeta[key];
                  if (!meta) return null;
                  const Icon = meta.icon;
                  return (
                    <a
                      key={key}
                      href={meta.href(value)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-secondary hover:bg-secondary/70 rounded-full text-sm transition-colors"
                    >
                      <Icon className="h-4 w-4" />
                      {meta.label}
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          {/* Linked profiles */}
          {(profile.artist_id || profile.entrepreneur_id) && (
            <div className="mt-6 space-y-2">
              {profile.artist_id && profile.artist_name && (
                <Link
                  to={`/artistas/${profile.artist_name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")}`}
                  className="flex items-center justify-between bg-card rounded-xl border border-border/50 p-4 hover:border-primary/40 transition-colors"
                >
                  <div>
                    <p className="text-xs text-muted-foreground">Perfil de artista</p>
                    <p className="font-semibold">{profile.artist_name}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )}
              {profile.entrepreneur_id && profile.entrepreneur_slug && (
                <Link
                  to={`/empreendedores/${profile.entrepreneur_slug}`}
                  className="flex items-center justify-between bg-card rounded-xl border border-border/50 p-4 hover:border-primary/40 transition-colors"
                >
                  <div>
                    <p className="text-xs text-muted-foreground">Empreendedor</p>
                    <p className="font-semibold">Ver loja</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )}
            </div>
          )}

          {/* Achievements */}
          {profile.show_achievements && achievements.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Conquistas</h3>
              <div className="flex flex-wrap gap-2">
                {achievements.slice(0, 12).map(ua => (
                  <div
                    key={ua.id}
                    title={ua.achievement?.name}
                    className="px-3 py-1.5 bg-card border border-border/50 rounded-full text-xs font-medium"
                  >
                    🏆 {ua.achievement?.name}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
