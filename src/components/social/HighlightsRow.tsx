import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import HighlightViewer from "./HighlightViewer";

interface Props {
  userId: string;
}

export default function HighlightsRow({ userId }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("social_story_highlights" as any)
        .select("*")
        .eq("user_id", userId)
        .order("sort_order");
      setItems((data as any) ?? []);
    })();
  }, [userId]);

  if (items.length === 0) return null;

  return (
    <>
      <div className="mt-6">
        <h3 className="text-sm font-semibold mb-2 text-muted-foreground flex items-center gap-1">
          <Star className="h-3.5 w-3.5" /> Destaques
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {items.map((h) => (
            <button
              key={h.id}
              onClick={() => setOpenId(h.id)}
              className="flex flex-col items-center gap-1 shrink-0 w-16"
            >
              <div className="w-16 h-16 rounded-full border-2 border-border bg-secondary overflow-hidden">
                {h.cover_url ? (
                  <img src={h.cover_url} alt={h.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Star className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground truncate w-full text-center">{h.title}</span>
            </button>
          ))}
        </div>
      </div>
      {openId && <HighlightViewer highlightId={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}
