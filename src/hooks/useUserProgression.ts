import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserProgression {
  user_id: string;
  xp: number;
  level: number;
  rank_id: string | null;
  class_id: string | null;
  fans_count: number;
  followers_count: number;
  following_count: number;
  likes_received: number;
  comments_received: number;
  shares_received: number;
  events_attended: number;
  events_organized: number;
  products_sold: number;
}

export interface ClassRow {
  id: string;
  code: string;
  name: string;
  icon: string | null;
  color: string | null;
  description: string | null;
}

export interface RankRow {
  id: string;
  code: string;
  name: string;
  min_xp: number;
  icon: string | null;
  color: string | null;
}

export interface AchievementRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  icon: string | null;
  rarity: string;
  xp_bonus: number;
}

export interface UserAchievementRow {
  id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement: AchievementRow;
}

// XP needed to reach next level — mirrors calc_level_for_xp curve
export function xpRangeForLevel(level: number) {
  let need = 100;
  let acc = 0;
  for (let i = 1; i < level; i++) {
    acc += need;
    need = need * 1.15;
  }
  return { start: Math.round(acc), end: Math.round(acc + need), need: Math.round(need) };
}

export function useUserProgression(userId: string | null) {
  const [progression, setProgression] = useState<UserProgression | null>(null);
  const [klass, setKlass] = useState<ClassRow | null>(null);
  const [rank, setRank] = useState<RankRow | null>(null);
  const [achievements, setAchievements] = useState<UserAchievementRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setProgression(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Ensure row exists (upsert empty if missing)
      let { data: prog } = await supabase
        .from("user_progression" as any)
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (!prog) {
        await supabase.from("user_progression" as any).insert({ user_id: userId });
        const res = await supabase
          .from("user_progression" as any)
          .select("*")
          .eq("user_id", userId)
          .maybeSingle();
        prog = res.data;
      }
      setProgression(prog as any);

      const p = prog as any;
      const [{ data: k }, { data: r }, { data: ua }] = await Promise.all([
        p?.class_id
          ? supabase.from("classes" as any).select("*").eq("id", p.class_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        p?.rank_id
          ? supabase.from("ranks" as any).select("*").eq("id", p.rank_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        supabase
          .from("user_achievements" as any)
          .select("id, achievement_id, unlocked_at, achievement:achievements(*)")
          .eq("user_id", userId)
          .order("unlocked_at", { ascending: false }),
      ]);
      setKlass(k as any);
      setRank(r as any);
      setAchievements((ua as any) || []);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime: keep XP/level in sync
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`progression:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_progression", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "user_achievements", filter: `user_id=eq.${userId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, load]);

  return { progression, klass, rank, achievements, loading, reload: load };
}
