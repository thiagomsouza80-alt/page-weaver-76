import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Loader2 } from "lucide-react";
import StoryComposer from "./StoryComposer";
import StoryViewer from "./StoryViewer";

interface StoryGroup {
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  story_count: number;
  latest_at: string;
  has_unseen: boolean;
}

interface Props {
  currentUserId: string | null;
}

export default function StoriesBar({ currentUserId }: Props) {
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [viewerUserId, setViewerUserId] = useState<string | null>(null);
  const [hasOwnStory, setHasOwnStory] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.rpc("get_active_stories_feed" as any);
    let rows = ((data as any) ?? []) as StoryGroup[];

    // Garante que o próprio story do usuário sempre apareça (mesmo se a RPC não incluir)
    if (currentUserId) {
      const { data: ownActive } = await supabase
        .from("social_stories" as any)
        .select("id, created_at")
        .eq("user_id", currentUserId)
        .eq("deleted", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
      const own = (ownActive as any[]) || [];
      setHasOwnStory(own.length > 0);
      if (own.length > 0 && !rows.some((r) => r.user_id === currentUserId)) {
        const { data: prof } = await supabase
          .from("user_profiles")
          .select("username, display_name, avatar_url")
          .eq("user_id", currentUserId)
          .maybeSingle();
        rows = [
          {
            user_id: currentUserId,
            username: (prof as any)?.username || "",
            display_name: (prof as any)?.display_name || (prof as any)?.username || "Você",
            avatar_url: (prof as any)?.avatar_url || null,
            story_count: own.length,
            latest_at: own[0].created_at,
            has_unseen: true,
          },
          ...rows,
        ];
      }
    } else {
      setHasOwnStory(false);
    }
    setGroups(rows);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [currentUserId]);

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {currentUserId && (
            <button
              onClick={() => (hasOwnStory ? setViewerUserId(currentUserId) : setComposerOpen(true))}
              className="flex flex-col items-center gap-1 shrink-0 w-16 group relative"
            >
              <div className="relative w-16 h-16 rounded-full bg-secondary border-2 border-dashed border-primary/40 flex items-center justify-center group-hover:border-primary transition-colors">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                {hasOwnStory ? "Ver + adicionar" : "Seu story"}
              </span>
            </button>
          )}

          {loading ? (
            <div className="flex items-center px-4">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <p className="text-xs text-muted-foreground self-center pl-2">Nenhum story ativo agora.</p>
          ) : (
            groups.map((g) => (
              <button
                key={g.user_id}
                onClick={() => setViewerUserId(g.user_id)}
                className="flex flex-col items-center gap-1 shrink-0 w-16"
              >
                <div
                  className={`w-16 h-16 rounded-full p-[2px] ${
                    g.has_unseen
                      ? "bg-gradient-to-tr from-primary via-fuchsia-500 to-orange-400"
                      : "bg-border"
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-background p-[2px]">
                    {g.avatar_url ? (
                      <img src={g.avatar_url} alt={g.display_name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground">
                        {g.display_name?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                  {g.user_id === currentUserId ? "Você" : g.display_name}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {composerOpen && currentUserId && (
        <StoryComposer
          userId={currentUserId}
          onClose={() => setComposerOpen(false)}
          onPosted={() => {
            setComposerOpen(false);
            load();
          }}
        />
      )}

      {viewerUserId && (
        <StoryViewer
          authorUserId={viewerUserId}
          onClose={() => {
            setViewerUserId(null);
            load();
          }}
        />
      )}
    </>
  );
}
