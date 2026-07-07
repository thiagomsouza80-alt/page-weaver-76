import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Marca o usuário como online e atualiza last_seen_at periodicamente. */
export const usePresenceHeartbeat = (userId: string | null) => {
  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    const beat = async (online: boolean) => {
      if (!mounted) return;
      await (supabase as any).from("user_presence").upsert(
        { user_id: userId, is_online: online, last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    };
    beat(true);
    const iv = setInterval(() => beat(true), 30_000);
    const onVis = () => beat(document.visibilityState === "visible");
    const onOffline = () => beat(false);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("beforeunload", onOffline);
    return () => {
      mounted = false;
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("beforeunload", onOffline);
      beat(false);
    };
  }, [userId]);
};

export type PresenceInfo = { is_online: boolean; last_seen_at: string | null };

/** Busca presença de múltiplos usuários e assina realtime updates. */
export const usePresenceOf = (userIds: string[]) => {
  const [map, setMap] = useState<Record<string, PresenceInfo>>({});
  const key = userIds.slice().sort().join(",");

  useEffect(() => {
    if (userIds.length === 0) return;
    let active = true;
    (async () => {
      const { data } = await (supabase as any)
        .from("user_presence")
        .select("user_id,is_online,last_seen_at")
        .in("user_id", userIds);
      if (!active) return;
      const m: Record<string, PresenceInfo> = {};
      (data || []).forEach((r: any) => {
        m[r.user_id] = { is_online: !!r.is_online && (Date.now() - new Date(r.last_seen_at).getTime() < 90_000), last_seen_at: r.last_seen_at };
      });
      setMap(m);
    })();

    const ch = supabase
      .channel(`pres-${key}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, (payload: any) => {
        const row = payload.new || payload.old;
        if (!row?.user_id || !userIds.includes(row.user_id)) return;
        setMap((cur) => ({
          ...cur,
          [row.user_id]: {
            is_online: !!row.is_online && (Date.now() - new Date(row.last_seen_at).getTime() < 90_000),
            last_seen_at: row.last_seen_at,
          },
        }));
      })
      .subscribe();
    return () => { active = false; supabase.removeChannel(ch); };
  }, [key]);

  return map;
};

export const formatLastSeen = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "agora";
  if (diff < 3600_000) return `há ${Math.floor(diff / 60_000)} min`;
  if (diff < 86_400_000) return `há ${Math.floor(diff / 3600_000)} h`;
  return new Date(iso).toLocaleDateString("pt-BR");
};
