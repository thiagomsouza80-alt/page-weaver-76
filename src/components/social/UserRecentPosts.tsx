import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PostCard, { type SocialPost } from "@/components/social/PostCard";
import { Loader2 } from "lucide-react";

interface Props {
  userId: string | null | undefined;
  limit?: number;
}

export default function UserRecentPosts({ userId, limit = 10 }: Props) {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setCurrentUserId(data.session?.user.id ?? null));
  }, []);

  const load = async () => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from("social_posts")
      .select("*")
      .eq("user_id", userId)
      .eq("deleted", false)
      .eq("hidden", false)
      .order("created_at", { ascending: false })
      .limit(limit);
    setPosts((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId, limit]);

  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold mb-4">Publicações recentes</h2>
      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 py-10 text-center text-muted-foreground text-sm">
          Ainda sem publicações.
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} currentUserId={currentUserId} isAdmin={false} onChanged={load} />
          ))}
        </div>
      )}
    </section>
  );
}
