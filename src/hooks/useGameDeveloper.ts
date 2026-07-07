import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface GameDeveloper {
  id: string;
  user_id: string;
  studio_name: string;
  bio: string | null;
  logo_url: string | null;
  banner_url: string | null;
  links: any;
  status: "pending" | "approved" | "rejected" | "changes_requested";
  approved_at: string | null;
  created_at: string;
}

export function useGameDeveloper(userId: string | null) {
  const [developer, setDeveloper] = useState<GameDeveloper | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) { setDeveloper(null); setLoading(false); return; }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("game_developers")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setDeveloper((data as any) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  return { developer, loading, reload: load };
}
