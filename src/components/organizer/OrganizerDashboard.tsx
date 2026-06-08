import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import {
  CalendarDays, Ticket, CheckCircle2, Users, Loader2, Pencil, Eye, TrendingUp,
} from "lucide-react";

interface Props {
  organizerId: string;
}

type EventRow = {
  id: string;
  title: string;
  event_date: string;
  tickets_total: number | null;
  tickets_enabled: boolean;
  approval_status: string;
  published: boolean;
};

type TicketRow = {
  id: string;
  event_id: string;
  status: string;
  issued_at: string;
  used_at: string | null;
};

const statusOf = (e: EventRow, redeemed: number) => {
  const now = Date.now();
  const date = new Date(e.event_date).getTime();
  if (date < now) return { label: "Encerrado", color: "bg-red-500/15 text-red-600 border-red-500/30", code: "ended" };
  if (e.tickets_total && redeemed >= e.tickets_total)
    return { label: "Esgotado", color: "bg-red-500/15 text-red-600 border-red-500/30", code: "soldout" };
  if (date - now < 1000 * 60 * 60 * 24 * 7)
    return { label: "Ativo", color: "bg-green-500/15 text-green-600 border-green-500/30", code: "active" };
  return { label: "Em Breve", color: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30", code: "soon" };
};

const OrganizerDashboard = ({ organizerId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);

  const load = async () => {
    setLoading(true);
    const { data: evs } = await supabase
      .from("events")
      .select("id, title, event_date, tickets_total, tickets_enabled, approval_status, published")
      .eq("organizer_id", organizerId)
      .order("event_date", { ascending: false });
    const eventList = (evs as any[]) || [];
    setEvents(eventList as EventRow[]);

    if (eventList.length) {
      const ids = eventList.map((e) => e.id);
      const { data: tks } = await supabase
        .from("tickets" as any)
        .select("id, event_id, status, issued_at, used_at")
        .in("event_id", ids);
      setTickets(((tks as any[]) || []) as TicketRow[]);
    } else {
      setTickets([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`org-${organizerId}-tickets`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizerId]);

  const ticketsByEvent = useMemo(() => {
    const m = new Map<string, TicketRow[]>();
    tickets.forEach((t) => {
      if (!m.has(t.event_id)) m.set(t.event_id, []);
      m.get(t.event_id)!.push(t);
    });
    return m;
  }, [tickets]);

  const metrics = useMemo(() => {
    const now = Date.now();
    const active = events.filter((e) => new Date(e.event_date).getTime() >= now);
    const ended = events.filter((e) => new Date(e.event_date).getTime() < now);
    const available = active.reduce((acc, e) => {
      if (!e.tickets_total) return acc;
      const redeemed = (ticketsByEvent.get(e.id) || []).filter((t) => t.status !== "cancelled").length;
      return acc + Math.max(e.tickets_total - redeemed, 0);
    }, 0);
    const redeemedTotal = tickets.filter((t) => t.status !== "cancelled").length;
    const participants = new Set(
      tickets.filter((t) => t.status !== "cancelled").map((t) => t.id),
    ).size;
    return {
      total: events.length,
      active: active.length,
      ended: ended.length,
      available,
      redeemedTotal,
      participants,
    };
  }, [events, tickets, ticketsByEvent]);

  const dailyData = useMemo(() => {
    const map = new Map<string, number>();
    tickets.forEach((t) => {
      if (t.status === "cancelled") return;
      const d = new Date(t.issued_at).toISOString().slice(0, 10);
      map.set(d, (map.get(d) || 0) + 1);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, count]) => ({
        date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        resgates: count,
      }));
  }, [tickets]);

  const topEventsData = useMemo(() => {
    return events
      .map((e) => ({
        name: e.title.length > 18 ? e.title.slice(0, 18) + "…" : e.title,
        participantes: (ticketsByEvent.get(e.id) || []).filter((t) => t.status !== "cancelled").length,
      }))
      .sort((a, b) => b.participantes - a.participantes)
      .slice(0, 5);
  }, [events, ticketsByEvent]);

  const evolutionData = useMemo(() => {
    const sorted = [...tickets]
      .filter((t) => t.status !== "cancelled")
      .sort((a, b) => a.issued_at.localeCompare(b.issued_at));
    let total = 0;
    const map = new Map<string, number>();
    sorted.forEach((t) => {
      total++;
      const d = new Date(t.issued_at).toISOString().slice(0, 10);
      map.set(d, total);
    });
    return Array.from(map.entries())
      .slice(-30)
      .map(([date, total]) => ({
        date: new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
        total,
      }));
  }, [tickets]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const cards = [
    { icon: CalendarDays, label: "Meus Eventos", value: metrics.total, sub: `${metrics.active} ativos · ${metrics.ended} encerrados` },
    { icon: Ticket, label: "Ingressos Disponíveis", value: metrics.available, sub: "Em eventos ativos" },
    { icon: CheckCircle2, label: "Ingressos Resgatados", value: metrics.redeemedTotal, sub: "Total geral" },
    { icon: Users, label: "Participantes", value: metrics.participants, sub: "Cadastrados em seus eventos" },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
              <c.icon className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{c.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />📈 Resgates por Dia</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {dailyData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center pt-12">Sem dados ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="resgates" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">📊 Eventos com Mais Participantes</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {topEventsData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center pt-12">Sem dados ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topEventsData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="participantes" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">👥 Evolução de Participantes</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            {evolutionData.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center pt-12">Sem dados ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total" name="Acumulado" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">📋 Meus Eventos</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Você ainda não criou nenhum evento.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Evento</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Disponíveis</TableHead>
                    <TableHead className="text-right">Resgatados</TableHead>
                    <TableHead className="text-right">Ocupação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => {
                    const redeemed = (ticketsByEvent.get(e.id) || []).filter((t) => t.status !== "cancelled").length;
                    const total = e.tickets_total || 0;
                    const available = total ? Math.max(total - redeemed, 0) : null;
                    const occupancy = total ? Math.min(Math.round((redeemed / total) * 100), 100) : null;
                    const s = statusOf(e, redeemed);
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-medium max-w-[220px] truncate">{e.title}</TableCell>
                        <TableCell className="text-sm">{new Date(e.event_date).toLocaleDateString("pt-BR")}</TableCell>
                        <TableCell><Badge className={s.color} variant="outline">{s.label}</Badge></TableCell>
                        <TableCell className="text-right text-sm">{available ?? "—"}</TableCell>
                        <TableCell className="text-right text-sm">{redeemed}</TableCell>
                        <TableCell className="text-right text-sm">{occupancy !== null ? `${occupancy}%` : "—"}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Link to={`/organizador/eventos/${e.id}`}>
                              <Button variant="ghost" size="icon" title="Ver detalhes"><Eye className="h-4 w-4" /></Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizerDashboard;
