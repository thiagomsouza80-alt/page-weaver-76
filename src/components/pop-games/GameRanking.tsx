import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Coins, Star, Loader2 } from "lucide-react";

type Props = { gameId: string };

const GameRanking = ({ gameId }: Props) => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: players } = await (supabase as any)
        .from("game_players")
        .select("user_id, xp, level, pop_coins, wins, matches")
        .eq("game_id", gameId)
        .order("xp", { ascending: false })
        .limit(50);
      const list = (players as any) || [];
      if (list.length) {
        const ids = list.map((p: any) => p.user_id);
        const { data: profs } = await (supabase as any).from("user_profiles")
          .select("user_id, display_name, username, avatar_url").in("user_id", ids);
        const map = new Map((profs || []).map((p: any) => [p.user_id, p]));
        list.forEach((r: any) => { r.profile = map.get(r.user_id); });
      }
      setRows(list);
      setLoading(false);
    })();
  }, [gameId]);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  if (rows.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">Nenhum jogador no ranking ainda.</p>;

  return (
    <div className="space-y-1">
      {rows.map((r, i) => {
        const name = r.profile?.display_name || r.profile?.username || "Jogador";
        return (
          <div key={r.user_id} className={`flex items-center gap-3 p-2 rounded-lg border border-border ${i < 3 ? "bg-primary/5" : "bg-card"}`}>
            <div className={`w-8 text-center font-bold ${i === 0 ? "text-amber-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-orange-600" : "text-muted-foreground"}`}>
              {i < 3 ? <Trophy className="h-4 w-4 mx-auto" /> : `#${i + 1}`}
            </div>
            {r.profile?.avatar_url ? (
              <img src={r.profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-secondary" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{name}</p>
              <p className="text-xs text-muted-foreground">Nível {r.level} · {r.wins}/{r.matches} vitórias</p>
            </div>
            <div className="text-right text-xs">
              <p className="inline-flex items-center gap-1 font-bold"><Star className="h-3 w-3" />{r.xp}</p>
              <p className="inline-flex items-center gap-1 text-muted-foreground"><Coins className="h-3 w-3" />{r.pop_coins}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GameRanking;
