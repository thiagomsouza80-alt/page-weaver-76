import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Gamepad2 } from "lucide-react";

const GAME_TYPES = [
  "game_new", "game_update", "game_event", "game_reward",
  "game_mission_done", "game_free_pack", "game_dev_approved",
  "game_dev_changes", "game_dev_rejected",
];

const GamesBellIcon = ({ userId }: { userId: string | null }) => {
  const [unread, setUnread] = useState(0);

  const load = async (uid: string) => {
    const { count } = await (supabase as any)
      .from("social_notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("read", false)
      .in("type", GAME_TYPES);
    setUnread(count || 0);
  };

  useEffect(() => {
    if (!userId) { setUnread(0); return; }
    load(userId);
    const ch = supabase
      .channel(`gb-${userId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "social_notifications", filter: `user_id=eq.${userId}` },
        () => load(userId))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId]);

  return (
    <Link
      to="/pop-games"
      aria-label="Pop Games"
      className="relative inline-flex items-center justify-center h-10 w-10 rounded-full bg-secondary hover:bg-secondary/70 transition-colors"
    >
      <Gamepad2 className="h-5 w-5" />
      {unread > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
};

export default GamesBellIcon;
