import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Heart, MessageCircle, UserPlus, Reply, Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Notification = {
  id: string;
  type: "like" | "comment" | "follower" | "reply" | "share";
  actor_name: string | null;
  actor_avatar_url: string | null;
  post_id: string | null;
  preview: string | null;
  read: boolean;
  created_at: string;
};

const icons = {
  like: <Heart className="h-4 w-4 text-red-500" />,
  comment: <MessageCircle className="h-4 w-4 text-primary" />,
  follower: <UserPlus className="h-4 w-4 text-green-500" />,
  reply: <Reply className="h-4 w-4 text-primary" />,
  share: <Share2 className="h-4 w-4 text-blue-500" />,
};

const labels = {
  like: "curtiu sua publicação",
  comment: "comentou sua publicação",
  follower: "começou a seguir você",
  reply: "respondeu seu comentário",
  share: "compartilhou sua publicação",
};

const NotificationsBell = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const unread = items.filter(i => !i.read).length;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setUserId(s?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("social_notifications" as any)
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems((data as any) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) { setItems([]); return; }
    load();
    const channel = supabase
      .channel(`notif-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "social_notifications", filter: `user_id=eq.${userId}` },
        (payload) => setItems(prev => [payload.new as Notification, ...prev]))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const markAllRead = async () => {
    if (!userId || unread === 0) return;
    await supabase.from("social_notifications" as any).update({ read: true } as any).eq("user_id", userId).eq("read", false);
    setItems(items.map(i => ({ ...i, read: true })));
  };

  if (!userId) return null;

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (o) markAllRead(); }}>
      <PopoverTrigger asChild>
        <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors" aria-label="Notificações">
          <Bell className="h-5 w-5 text-foreground" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {unread > 0 && <span className="text-xs text-muted-foreground">{unread} novas</span>}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
          ) : items.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">Nenhuma notificação ainda.</p>
          ) : items.map(n => {
            const inner = (
              <div className={`flex gap-3 px-4 py-3 border-b border-border/50 hover:bg-secondary/50 transition-colors ${!n.read ? "bg-primary/5" : ""}`}>
                <div className="mt-0.5">{icons[n.type]}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">{n.actor_name || "Alguém"}</span>{" "}
                    <span className="text-muted-foreground">{labels[n.type]}</span>
                  </p>
                  {n.preview && <p className="text-xs text-muted-foreground truncate mt-0.5">"{n.preview}"</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>
              </div>
            );
            return n.post_id ? (
              <Link key={n.id} to="/social" onClick={() => setOpen(false)}>{inner}</Link>
            ) : (
              <div key={n.id}>{inner}</div>
            );
          })}
        </div>
        <div className="px-4 py-2 border-t border-border">
          <Link to="/social" onClick={() => setOpen(false)}>
            <Button variant="ghost" size="sm" className="w-full">Ver no Social Pop</Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsBell;
