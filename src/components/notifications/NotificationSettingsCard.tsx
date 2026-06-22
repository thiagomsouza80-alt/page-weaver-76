import { useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { enablePushNotifications, disablePushNotifications, isPushSupported } from "@/lib/push";

type Prefs = {
  events_new: boolean; events_changes: boolean; events_cancelled: boolean;
  news_new: boolean;
  social_likes: boolean; social_comments: boolean; social_followers: boolean; social_posts: boolean;
  marketplace_messages: boolean;
  financial_withdrawals: boolean; financial_refunds: boolean;
  retention_reminders: boolean;
  push_enabled: boolean; email_enabled: boolean;
};

const DEFAULT_PREFS: Prefs = {
  events_new: true, events_changes: true, events_cancelled: true,
  news_new: true,
  social_likes: true, social_comments: true, social_followers: true, social_posts: true,
  marketplace_messages: true,
  financial_withdrawals: true, financial_refunds: true,
  retention_reminders: true,
  push_enabled: true, email_enabled: true,
};

const GROUPS: { title: string; items: { key: keyof Prefs; label: string }[] }[] = [
  { title: "Eventos", items: [
    { key: "events_new", label: "Novos eventos publicados" },
    { key: "events_changes", label: "Mudanças de data, horário ou local em eventos que você marcou" },
    { key: "events_cancelled", label: "Eventos cancelados" },
  ]},
  { title: "Notícias", items: [
    { key: "news_new", label: "Novas notícias publicadas" },
  ]},
  { title: "Social", items: [
    { key: "social_posts", label: "Publicações de pessoas favoritas" },
    { key: "social_likes", label: "Curtidas nas suas publicações" },
    { key: "social_comments", label: "Comentários e respostas" },
    { key: "social_followers", label: "Novos seguidores" },
  ]},
  { title: "Marketplace e Mensagens", items: [
    { key: "marketplace_messages", label: "Mensagens e interesses em produtos" },
  ]},
  { title: "Financeiro", items: [
    { key: "financial_withdrawals", label: "Solicitações, aprovação e pagamento de saques" },
    { key: "financial_refunds", label: "Solicitações, aprovação e pagamento de reembolsos" },
  ]},
  { title: "Retenção", items: [
    { key: "retention_reminders", label: "Lembretes para retomar o uso após períodos de inatividade" },
  ]},
];

const NotificationSettingsCard = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushActive, setPushActive] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      const { data } = await supabase
        .from("notification_preferences" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setPrefs({ ...DEFAULT_PREFS, ...(data as any) });
      try {
        if (isPushSupported()) {
          const reg = await navigator.serviceWorker.getRegistration("/sw.js");
          const sub = await reg?.pushManager.getSubscription();
          setPushActive(!!sub && Notification.permission === "granted");
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  const update = (key: keyof Prefs, value: boolean) => {
    setPrefs((p) => ({ ...p, [key]: value }));
  };

  const save = async () => {
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("notification_preferences" as any)
      .upsert({ user_id: userId, ...prefs } as any, { onConflict: "user_id" } as any);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Preferências salvas!" });
  };

  const togglePush = async () => {
    setPushBusy(true);
    if (pushActive) {
      await disablePushNotifications();
      setPushActive(false);
      toast({ title: "Notificações push desativadas" });
    } else {
      const res = await enablePushNotifications();
      if (res.ok) {
        setPushActive(true);
        toast({ title: "Notificações push ativadas!", description: "Você receberá avisos mesmo com o navegador fechado." });
      } else {
        const map: Record<string,string> = {
          preview: "Notificações push só funcionam no site publicado, não na pré-visualização.",
          unsupported: "Seu navegador não suporta notificações push.",
          denied: "Você bloqueou notificações. Libere nas configurações do navegador.",
          not_authenticated: "Faça login primeiro.",
          sw_failed: "Não foi possível registrar o serviço de notificações.",
          no_vapid: "Servidor de notificações ainda não está configurado.",
        };
        toast({ title: "Não foi possível ativar", description: map[res.reason || ""] || res.reason, variant: "destructive" });
      }
    }
    setPushBusy(false);
  };

  if (loading) {
    return (
      <div className="bg-card rounded-2xl p-6 border border-border">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!userId) return null;

  return (
    <div className="bg-card rounded-2xl p-6 border border-border space-y-6">
      <div>
        <h3 className="font-display text-xl font-bold flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" /> Notificações
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Controle quais avisos você quer receber.
        </p>
      </div>

      <div className="rounded-lg border border-border p-4 bg-secondary/30 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="font-semibold flex items-center gap-2">
              {pushActive ? <Bell className="h-4 w-4 text-primary" /> : <BellOff className="h-4 w-4" />}
              Notificações push no navegador
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Receba avisos em tempo real mesmo com o site fechado.
            </p>
          </div>
          <Button onClick={togglePush} disabled={pushBusy || !isPushSupported()} variant={pushActive ? "outline" : "default"}>
            {pushBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : (pushActive ? "Desativar" : "Ativar")}
          </Button>
        </div>
        {!isPushSupported() && (
          <p className="text-xs text-muted-foreground">Seu navegador não suporta notificações push.</p>
        )}
      </div>

      {GROUPS.map((group) => (
        <div key={group.title} className="space-y-2">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{group.title}</h4>
          <div className="space-y-2">
            {group.items.map((item) => (
              <label key={item.key} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-secondary/30 cursor-pointer">
                <span className="text-sm flex-1">{item.label}</span>
                <Switch
                  checked={Boolean(prefs[item.key])}
                  onCheckedChange={(v) => update(item.key, !!v)}
                />
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Canais</h4>
        <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
          <span className="text-sm">Receber por e-mail</span>
          <Switch checked={prefs.email_enabled} onCheckedChange={(v) => update("email_enabled", !!v)} />
        </label>
        <label className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border">
          <span className="text-sm">Receber push no navegador</span>
          <Switch checked={prefs.push_enabled} onCheckedChange={(v) => update("push_enabled", !!v)} />
        </label>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar preferências"}
        </Button>
      </div>
    </div>
  );
};

export default NotificationSettingsCard;
