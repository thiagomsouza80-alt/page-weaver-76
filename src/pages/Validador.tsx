import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, QrCode, CalendarDays, MapPin, Ticket } from "lucide-react";

type Assignment = {
  id: string;
  event_id: string;
  status: string;
  starts_at: string;
  ends_at: string | null;
  permissions: any;
  events: {
    id: string;
    title: string;
    event_date: string;
    location: string;
    image_url: string | null;
    tickets_total: number | null;
  } | null;
};

const Validador = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Assignment[]>([]);
  const [counts, setCounts] = useState<Record<string, { validated: number; remaining: number; total: number }>>({});

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data } = await supabase
        .from("event_validators" as any)
        .select("id, event_id, status, starts_at, ends_at, permissions, events:event_id(id, title, event_date, location, image_url, tickets_total)")
        .eq("user_id", user.id)
        .order("starts_at", { ascending: false });

      const list = ((data as any[]) || []) as Assignment[];
      setItems(list);

      const c: Record<string, { validated: number; remaining: number; total: number }> = {};
      await Promise.all(list.map(async (it) => {
        const { data: sum } = await supabase.rpc("validator_event_summary", { _event_id: it.event_id });
        if (sum && sum[0]) {
          c[it.event_id] = {
            total: sum[0].tickets_total ?? 0,
            validated: sum[0].tickets_validated ?? 0,
            remaining: sum[0].tickets_remaining ?? 0,
          };
        }
      }));
      setCounts(c);
      setLoading(false);
    };
    load();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">🎟️ Meus Eventos</h1>
          <p className="text-muted-foreground">Eventos em que você está autorizado a validar ingressos.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Você ainda não foi designado como validador em nenhum evento.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {items.map((it) => {
              const ev = it.events;
              if (!ev) return null;
              const c = counts[it.event_id] || { total: 0, validated: 0, remaining: 0 };
              const active = it.status === "active";
              return (
                <Card key={it.id} className={!active ? "opacity-60" : ""}>
                  {ev.image_url && (
                    <div className="aspect-video overflow-hidden rounded-t-xl">
                      <img src={ev.image_url} alt={ev.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between gap-2">
                      <span className="truncate">{ev.title}</span>
                      <Badge variant={active ? "default" : "secondary"}>{active ? "Ativo" : "Suspenso"}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-sm text-muted-foreground space-y-1">
                      <div className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" /> {new Date(ev.event_date).toLocaleString("pt-BR")}</div>
                      <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5" /> {ev.location}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg border border-border p-2">
                        <div className="text-xs text-muted-foreground">Total</div>
                        <div className="text-lg font-bold">{c.total}</div>
                      </div>
                      <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-2">
                        <div className="text-xs text-green-700 dark:text-green-400">Validados</div>
                        <div className="text-lg font-bold text-green-700 dark:text-green-400">{c.validated}</div>
                      </div>
                      <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-2">
                        <div className="text-xs text-yellow-700 dark:text-yellow-400">Restantes</div>
                        <div className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{c.remaining}</div>
                      </div>
                    </div>
                    <Link to={`/validador/eventos/${ev.id}`}>
                      <Button className="w-full gap-2" disabled={!active}>
                        <QrCode className="h-4 w-4" /> Validar Ingressos
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default Validador;
