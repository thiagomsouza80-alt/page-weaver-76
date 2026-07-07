import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageCircle, UserPlus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import FanButton from "@/components/FanButton";
import FollowButton from "@/components/social/FollowButton";

interface Props {
  userId: string | null | undefined;
  displayName: string;
  fallbackUsername?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  artistId?: string | null;
  fanCount?: number;
  followTarget?: { type: "artist" | "entrepreneur"; id: string; count: number };
}

const slugifyFallback = (n: string) =>
  n.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");

export default function ProfileHeaderCard({
  userId,
  displayName,
  fallbackUsername,
  avatarUrl,
  coverUrl,
  followersCount = 0,
  followingCount = 0,
  postsCount = 0,
  artistId,
  fanCount = 0,
  followTarget,
}: Props) {
  const navigate = useNavigate();
  const [username, setUsername] = useState<string | null>(fallbackUsername || null);
  const [profileAvatar, setProfileAvatar] = useState<string | null>(null);
  const [profileCover, setProfileCover] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [dynFollowers, setDynFollowers] = useState(followersCount);
  const [dynFollowing, setDynFollowing] = useState(followingCount);
  const [dynPosts, setDynPosts] = useState(postsCount);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setCurrentUserId(data.session?.user.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("user_profiles")
        .select("username, display_name, avatar_url, cover_url, followers_count, following_count")
        .eq("user_id", userId)
        .maybeSingle();
      const p: any = data;
      if (p) {
        setUsername(p.username || fallbackUsername || slugifyFallback(displayName));
        setProfileAvatar(p.avatar_url || null);
        setProfileCover(p.cover_url || null);
        if (typeof p.followers_count === "number") setDynFollowers(p.followers_count);
        if (typeof p.following_count === "number") setDynFollowing(p.following_count);
      } else {
        setUsername(fallbackUsername || slugifyFallback(displayName));
      }
      const { count } = await supabase
        .from("social_posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("deleted", false)
        .eq("hidden", false);
      if (typeof count === "number") setDynPosts(count);
    })();
  }, [userId, displayName, fallbackUsername]);

  const finalAvatar = avatarUrl || profileAvatar;
  const finalCover = coverUrl || profileCover;

  const startMessage = () => {
    if (!userId) return;
    if (!currentUserId) {
      toast({ title: "Faça login para enviar mensagem." });
      navigate("/login");
      return;
    }
    if (currentUserId === userId) return;
    navigate(`/mensagens?to=${userId}`);
  };

  const isOwn = currentUserId && userId && currentUserId === userId;

  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border/50 shadow-sm">
      {/* Cover */}
      <div className="relative h-40 sm:h-52 bg-gradient-to-br from-primary/25 via-primary/10 to-secondary">
        {finalCover && <img src={finalCover} alt="" className="w-full h-full object-cover" />}
      </div>

      {/* Avatar + info */}
      <div className="px-5 sm:px-8 pb-6 -mt-14">
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-card bg-secondary overflow-hidden">
          {finalAvatar ? (
            <img src={finalAvatar} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-muted-foreground/40">
              {displayName?.[0]?.toUpperCase()}
            </div>
          )}
        </div>

        <div className="mt-4">
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{displayName}</h1>
          {username && <p className="text-sm text-muted-foreground mt-1">@{username}</p>}
        </div>

        {!isOwn && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            {artistId && <FanButton artistId={artistId} initialCount={fanCount} />}
            {followTarget && (
              <FollowButton
                targetType={followTarget.type}
                targetId={followTarget.id}
                initialCount={followTarget.count}
              />
            )}
            {userId && (
              <Button onClick={startMessage} variant="outline" className="gap-2 rounded-full">
                <MessageCircle className="h-4 w-4" /> Mensagem
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 border-t border-border/50 text-center">
        <Stat value={dynFollowers} label="Seguidores" />
        <Stat value={dynFollowing} label="Seguindo" divider />
        <Stat value={dynPosts} label="Publicações" divider />
      </div>
    </div>
  );
}

function Stat({ value, label, divider }: { value: number; label: string; divider?: boolean }) {
  return (
    <div className={`py-4 ${divider ? "border-l border-border/50" : ""}`}>
      <p className="text-2xl font-bold tabular-nums">{value.toLocaleString("pt-BR")}</p>
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
