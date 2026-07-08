import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { Target, CheckCircle2, Coins, Star } from "lucide-react";

type Props = { gameId: string; userId: string | null; refreshKey?: number };

const MissionsList = ({ gameId, userId, refreshKey }: Props) => {
  const [missions, setMissions] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: ms } = await (supabase as any).from("game_missions")
        .select("*").eq("game_id", gameId).eq("is_active", true).order("mission_type");
      setMissions((ms as any) || []);
      if (userId && ms?.length) {
        const ids = ms.map((m: any) => m.id);
        const { data: pr } = await (supabase as any).from("game_user_mission_progress")
          .select("*").eq("user_id", userId).in("mission_id", ids);
        const map: Record<string, any> = {};
        (pr || []).forEach((p: any) => { map[p.mission_id] = p; });
        setProgress(map);
      }
      setLoading(false);
    })();
  }, [gameId, userId, refreshKey]);

  if (loading) return <p className="text-sm text-muted-foreground text-center py-6">Carregando missões...</p>;
  if (missions.length === 0) return <p className="text-sm text-muted-foreground text-center py-6">Nenhuma missão disponível.</p>;

  return (
    <div className="space-y-2">
      {missions.map((m) => {
        const p = progress[m.id];
        const cur = Math.min(p?.progress ?? 0, m.target_value);
        const pct = (cur / m.target_value) * 100;
        const done = !!p?.completed_at;
        return (
          <div key={m.id} className="p-3 rounded-lg border border-border bg-card">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 min-w-0">
                {done ? <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" /> : <Target className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{m.title}</p>
                  {m.description && <p className="text-xs text-muted-foreground line-clamp-2">{m.description}</p>}
                </div>
              </div>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-secondary text-muted-foreground shrink-0">{m.mission_type}</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Progress value={pct} className="h-1.5 flex-1" />
              <span className="text-xs text-muted-foreground shrink-0">{cur}/{m.target_value}</span>
            </div>
            <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
              {m.xp_reward > 0 && <span className="inline-flex items-center gap-1"><Star className="h-3 w-3" />{m.xp_reward} XP</span>}
              {m.coin_reward > 0 && <span className="inline-flex items-center gap-1"><Coins className="h-3 w-3" />{m.coin_reward}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MissionsList;
