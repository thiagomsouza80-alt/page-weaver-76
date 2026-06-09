import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

let cached: number | null = null;

export const getPlatformFeeCents = async (): Promise<number> => {
  if (cached !== null) return cached;
  const { data } = await supabase.from("platform_settings" as any).select("ticket_fee_cents").eq("id", true).maybeSingle();
  const v = (data as any)?.ticket_fee_cents;
  cached = typeof v === "number" ? v : 100;
  return cached;
};

export const usePlatformFee = () => {
  const [fee, setFee] = useState<number>(cached ?? 100);
  useEffect(() => { getPlatformFeeCents().then(setFee); }, []);
  return fee;
};

export const invalidatePlatformFeeCache = () => { cached = null; };
