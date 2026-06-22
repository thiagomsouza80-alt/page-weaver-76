// Envia notificações Web Push (VAPID) para um ou mais usuários.
// Body: { user_id?: string, user_ids?: string[], title: string, body: string, url?: string, tag?: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

let vapidLoaded = false;
async function ensureVapid() {
  if (vapidLoaded) return true;
  const { data, error } = await supabase
    .from("app_secrets")
    .select("key,value")
    .in("key", ["vapid_public_key", "vapid_private_key", "vapid_subject"]);
  if (error || !data) return false;
  const map = Object.fromEntries(data.map((r: any) => [r.key, r.value]));
  if (!map.vapid_public_key || !map.vapid_private_key) return false;
  webpush.setVapidDetails(
    map.vapid_subject || "mailto:contato@amazoniapop.com",
    map.vapid_public_key,
    map.vapid_private_key,
  );
  vapidLoaded = true;
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!(await ensureVapid())) {
      return new Response(JSON.stringify({ error: "VAPID not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { user_id, user_ids, title, body: msgBody, url, tag } = body as any;
    if (!title || !msgBody) {
      return new Response(JSON.stringify({ error: "title and body required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ids = (user_ids && Array.isArray(user_ids)) ? user_ids : (user_id ? [user_id] : []);
    if (ids.length === 0) {
      return new Response(JSON.stringify({ error: "user_id or user_ids required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("id, user_id, endpoint, p256dh, auth")
      .in("user_id", ids);

    const payload = JSON.stringify({ title, body: msgBody, url: url || "/", tag: tag || "amazonia-pop" });

    let sent = 0; let failed = 0; const toDelete: string[] = [];
    await Promise.allSettled((subs || []).map(async (s: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
        );
        sent++;
      } catch (err: any) {
        failed++;
        const status = err?.statusCode;
        if (status === 404 || status === 410) toDelete.push(s.id);
      }
    }));

    if (toDelete.length) {
      await supabase.from("push_subscriptions").delete().in("id", toDelete);
    }

    return new Response(JSON.stringify({ sent, failed, removed: toDelete.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
