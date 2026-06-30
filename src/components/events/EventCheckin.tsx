import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Loader2, CheckCircle2, Users } from "lucide-react";
import { Link } from "react-router-dom";

interface Props {
  eventId: string;
  eventDate: string;
}

interface CheckinRow {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  message: string | null;
  created_at: string;
}

export default function EventCheckin({ eventId, eventDate }: Props) {
  const { toast } = useToast();
  const [uid, setUid] = useState<string | null>(null);
  const [feed, setFeed] = useState<CheckinRow[]>([]);
  const [hasMine, setHasMine] = useState(false);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const loadFeed = useCallback(async () => {
    const { data } = await supabase.rpc("event_checkins_feed" as any, {
      _event_id: eventId,
      _limit: 60,
    });
    const rows = (data as any[]) || [];
    setFeed(rows);
    if (uid) setHasMine(rows.some((r) => r.user_id === uid));
  }, [eventId, uid]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    loadFeed();
    const ch = supabase
      .channel(`event-checkins:${eventId}:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_checkins", filter: `event_id=eq.${eventId}` },
        () => loadFeed(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [eventId, loadFeed]);

  const submit = async () => {
    if (!uid) {
      toast({ title: "Faça login para fazer check-in", variant: "destructive" });
      return;
    }
    setSaving(true);
    let lat: number | undefined;
    let lng: number | undefined;
    try {
      if (navigator.geolocation) {
        await new Promise<void>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (p) => {
              lat = p.coords.latitude;
              lng = p.coords.longitude;
              resolve();
            },
            () => resolve(),
            { timeout: 3000, maximumAge: 60000 },
          );
        });
      }
    } catch {}

    const { error } = await supabase.rpc("event_checkin" as any, {
      _event_id: eventId,
      _message: message.trim() || null,
      _latitude: lat ?? null,
      _longitude: lng ?? null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Não foi possível fazer check-in", description: error.message, variant: "destructive" });
      return;
    }
    setOpen(false);
    setMessage("");
    setHasMine(true);
    toast({ title: "Check-in realizado!", description: "+25 XP" });
    loadFeed();
  };

  // janela: 12h antes até 24h depois
  const now = Date.now();
  const evt = new Date(eventDate).getTime();
  const inWindow = now >= evt - 12 * 3600_000 && now <= evt + 24 * 3600_000;

  return (
    <section className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <MapPin className="h-4 w-4 text-primary" />
          Check-in social
          <span className="text-xs text-muted-foreground font-normal inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {feed.length}
          </span>
        </h2>
        {hasMine ? (
          <span className="text-xs inline-flex items-center gap-1 text-emerald-500 font-medium">
            <CheckCircle2 className="h-4 w-4" /> Você está aqui
          </span>
        ) : (
          <Button
            size="sm"
            disabled={!inWindow}
            onClick={() => setOpen(true)}
            title={!inWindow ? "Disponível próximo ao horário do evento" : undefined}
          >
            {inWindow ? "Fazer check-in" : "Em breve"}
          </Button>
        )}
      </div>

      {feed.length === 0 ? (
        <p className="text-sm text-muted-foreground">Seja o primeiro a fazer check-in!</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {feed.slice(0, 24).map((c) => (
            <Link
              key={c.id}
              to={c.username ? `/u/${c.username}` : "#"}
              className="flex flex-col items-center gap-1 w-16 text-center"
              title={c.message || c.display_name || c.username || ""}
            >
              <Avatar className="h-12 w-12 ring-2 ring-primary/40">
                <AvatarImage src={c.avatar_url || undefined} />
                <AvatarFallback>
                  {(c.display_name || c.username || "?").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-[10px] truncate w-full text-muted-foreground">
                @{c.username || "user"}
              </span>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estou no evento 🎉</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Deixe uma mensagem para mostrar que você está curtindo o evento. Ganhe XP e apareça no feed dos participantes.
          </p>
          <Textarea
            placeholder="Curtindo demais! 🔥"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={140}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar check-in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
