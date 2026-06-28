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

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.rpc("get_active_stories_feed" as any);
    setGroups((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="flex gap-3 overflow-x-auto pb-1">
          {currentUserId && (
            <button
              onClick={() => setComposerOpen(true)}
              className="flex flex-col items-center gap-1 shrink-0 w-16 group"
            >
              <div className="relative w-16 h-16 rounded-full bg-secondary border-2 border-dashed border-primary/40 flex items-center justify-center group-hover:border-primary transition-colors">
                <Plus className="h-6 w-6 text-primary" />
              </div>
              <span className="text-[10px] text-muted-foreground truncate w-full text-center">Seu story</span>
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
                        {g.display_name?.[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                  {g.display_name}
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
