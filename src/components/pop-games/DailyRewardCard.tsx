import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Gift, Flame, Coins, Star } from "lucide-react";

type Props = { gameId: string; userId: string | null; onClaimed?: () => void };

const DailyRewardCard = ({ gameId, userId, onClaimed }: Props) => {
  const [claimedToday, setClaimedToday] = useState(false);
  const [streak, setStreak] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    if (!userId) return;
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await (supabase as any)
      .from("game_daily_claims")
      .select("claim_date, streak")
      .eq("user_id", userId).eq("game_id", gameId)
      .order("claim_date", { ascending: false }).limit(1).maybeSingle();
    if (data) {
      setStreak(data.streak);
      setClaimedToday(data.claim_date === today);
    }
  };
  useEffect(() => { load(); }, [gameId, userId]);

  const claim = async () => {
    if (!userId) { toast({ title: "Entre para resgatar" }); return; }
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("game_claim_daily", { _game_id: gameId });
    setLoading(false);
    if (error) { toast({ title: "Não foi possível", description: error.message, variant: "destructive" }); return; }
    toast({ title: `+${data.xp} XP e +${data.coins} moedas`, description: `Sequência de ${data.streak} dias!` });
    setClaimedToday(true); setStreak(data.streak);
    onClaimed?.();
  };

  if (!userId) return null;

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-secondary border border-border flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Gift className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="font-bold text-sm">Recompensa diária</p>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Flame className="h-3 w-3" /> {streak} dias
            <Star className="h-3 w-3 ml-1" /> XP
            <Coins className="h-3 w-3 ml-1" /> Moedas
          </p>
        </div>
      </div>
      <Button size="sm" onClick={claim} disabled={claimedToday || loading}>
        {claimedToday ? "Resgatado hoje" : loading ? "..." : "Resgatar"}
      </Button>
    </div>
  );
};

export default DailyRewardCard;
