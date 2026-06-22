import { supabase } from "@/integrations/supabase/client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function isPreviewOrDev(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const h = window.location.hostname;
    if (h.startsWith("id-preview--") || h.startsWith("preview--")) return true;
    if (h === "lovableproject.com" || h.endsWith(".lovableproject.com")) return true;
    if (h === "lovableproject-dev.com" || h.endsWith(".lovableproject-dev.com")) return true;
    if (h.endsWith(".beta.lovable.dev") || h === "beta.lovable.dev") return true;
    if (window.self !== window.top) return true;
  } catch (_) { return true; }
  return !import.meta.env.PROD;
}

async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function enablePushNotifications(): Promise<{ ok: boolean; reason?: string }> {
  if (isPreviewOrDev()) return { ok: false, reason: "preview" };
  if (!("Notification" in window) || !("PushManager" in window)) {
    return { ok: false, reason: "unsupported" };
  }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "not_authenticated" };

  if (Notification.permission === "denied") return { ok: false, reason: "denied" };
  if (Notification.permission !== "granted") {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, reason: "denied" };
  }

  const reg = await registerSW();
  if (!reg) return { ok: false, reason: "sw_failed" };
  await navigator.serviceWorker.ready;

  const { data: pubKey } = await supabase.rpc("get_vapid_public_key" as any);
  if (!pubKey) return { ok: false, reason: "no_vapid" };

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(pubKey as string),
    });
  }

  const json: any = sub.toJSON();
  await supabase.from("push_subscriptions" as any).upsert({
    user_id: user.id,
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
    user_agent: navigator.userAgent,
  } as any, { onConflict: "endpoint" } as any);

  return { ok: true };
}

export async function disablePushNotifications(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.from("push_subscriptions" as any).delete().eq("endpoint", sub.endpoint);
      await sub.unsubscribe();
    }
  } catch {}
}

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}
