import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Award, Lock, Star, Coins } from "lucide-react";

type Props = { gameId: string; userId: string | null };

const RARITY_COLORS: Record<string, string> = {
  common: "text-muted-foreground",
  uncommon: "text-emerald-500",
  rare: "text-sky-500",
  epic: "text-fuchsia-500",
  legendary: "text-amber-500",
  mythic: "text-red-500",
};

const AchievementsList = ({ gameId, userId }: Props) => {
  const [items, setItems] = useState<any[]>([]);
  const [unlocked, setUnlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any).from("game_achievements")
        .select("*").eq("game_id", gameId).eq("is_active", true).order("rarity");
      setItems((data as any) || []);
      if (userId && data?.length) {
        const { data: u } = await (supabase as any).from("game_user_achievements")
          .select("achievement_id").eq("user_id", userId).in("achievement_id", data.map((a: any) => a.id));
        setUnlocked(new Set((u || []).map((x: any) => x.achievement_id)));
      }
      setLoading(false);
    })();
  }, [gameId, userId]);

  if (loading) return <p className="text-sm text-muted-foreground text-center py-6">Carregando conquistas...</p>;
  if (items.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">Nenhuma conquista disponível.</p>;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
      {items.map((a) => {
        const isUnlocked = unlocked.has(a.id);
        return (
          <div key={a.id} className={`p-3 rounded-lg border bg-card ${isUnlocked ? "border-primary/40" : "border-border opacity-70"}`}>
            <div className="flex items-center gap-2">
              {isUnlocked ? <Award className={`h-5 w-5 ${RARITY_COLORS[a.rarity] || ""}`} /> : <Lock className="h-5 w-5 text-muted-foreground" />}
              <p className="font-medium text-sm truncate">{a.title}</p>
            </div>
            {a.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.description}</p>}
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="uppercase">{a.rarity}</span>
              {a.xp_reward > 0 && <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" />{a.xp_reward}</span>}
              {a.coin_reward > 0 && <span className="inline-flex items-center gap-1"><Coins className="h-3 w-3" />{a.coin_reward}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default AchievementsList;
