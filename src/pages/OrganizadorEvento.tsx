import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Download, Loader2, Search, Users, CalendarDays, MapPin, BarChart3 } from "lucide-react";
import EventTicketingManager from "@/components/organizer/EventTicketingManager";
import { formatBRL } from "@/lib/money";

type Ticket = {
  id: string;
  code: string;
  status: string;
  holder_name: string;
  holder_email: string;
  holder_phone: string;
  issued_at: string;
  used_at: string | null;
  category_id: string | null;
  category_kind: string | null;
  category_name: string | null;
  batch_id: string | null;
  batch_name: string | null;
  unit_price_cents: number | null;
  is_courtesy: boolean | null;
};

type Category = {
  id: string;
  name: string;
  kind: string;
  price_cents: number;
  is_free: boolean;
  quantity: number | null;
  is_active: boolean;
};

type Batch = { id: string; name: string };

const KIND_LABEL: Record<string, { label: string; icon: string }> = {
  full: { label: "Inteira", icon: "🎫" },
  half: { label: "Meia", icon: "🎟️" },
  solidarity: { label: "Solidário", icon: "🎁" },
  pcd: { label: "PCD", icon: "♿" },
  elderly: { label: "Idoso", icon: "👴" },
  courtesy: { label: "Cortesia", icon: "✨" },
};

const OrganizadorEvento = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any | null>(null);
  const [organizer, setOrganizer] = useState<any | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [filter, setFilter] = useState<"all" | "active" | "used" | "unused">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [batchFilter, setBatchFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }

    const { data: ev } = await supabase.from("events").select("*").eq("id", id!).maybeSingle();
    if (!ev) { setLoading(false); return; }

    const { data: org } = await supabase
      .from("organizers")
      .select("*")
      .eq("id", (ev as any).organizer_id)
      .maybeSingle();

    if (!org || (org as any).user_id !== user.id) {
      navigate("/organizador");
      return;
    }

    const [{ data: tks }, { data: cats }, { data: bts }] = await Promise.all([
      supabase
        .from("tickets" as any)
        .select("id, code, status, holder_name, holder_email, holder_phone, issued_at, used_at, category_id, category_kind, category_name, batch_id, batch_name, unit_price_cents, is_courtesy")
        .eq("event_id", id!)
        .order("issued_at", { ascending: false }),
      supabase
        .from("event_ticket_categories" as any)
        .select("id, name, kind, price_cents, is_free, quantity, is_active")
        .eq("event_id", id!),
      supabase
        .from("event_ticket_batches" as any)
        .select("id, name")
        .eq("event_id", id!),
    ]);

    setEvent(ev);
    setOrganizer(org);
    setTickets(((tks as any[]) || []) as Ticket[]);
    setCategories(((cats as any[]) || []) as Category[]);
    setBatches(((bts as any[]) || []) as Batch[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`event-${id}-tickets`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets", filter: `event_id=eq.${id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const filtered = useMemo(() => {
    let list = tickets;
    if (filter === "active") list = list.filter((t) => t.status === "active" && !t.used_at);
    else if (filter === "used") list = list.filter((t) => !!t.used_at || t.status === "used");
    else if (filter === "unused") list = list.filter((t) => !t.used_at && t.status === "active");
    if (categoryFilter !== "all") {
      if (categoryFilter === "__legacy__") list = list.filter((t) => !t.category_id);
      else list = list.filter((t) => t.category_id === categoryFilter);
    }
    if (batchFilter !== "all") {
      list = list.filter((t) => t.batch_id === batchFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((t) =>
        [t.holder_name, t.holder_email, t.holder_phone, t.code, t.category_name, t.batch_name].some((v) => v?.toLowerCase().includes(q)),
      );
    }
    return list;
  }, [tickets, filter, categoryFilter, batchFilter, search]);

  // ===== Report by modalidade =====
  const report = useMemo(() => {
    const platformFee = 100; // R$1,00 — informativo (cortesia/free isentos)
    const rows = categories.map((c) => {
      const ts = tickets.filter((t) => t.category_id === c.id && t.status !== "cancelled");
      const redeemed = ts.length;
      const validated = ts.filter((t) => !!t.used_at || t.status === "used").length;
      const free = c.is_free || c.kind === "courtesy";
      const revenue = ts.reduce((s, t) => s + (t.unit_price_cents || 0), 0);
      const fees = free ? 0 : redeemed * platformFee;
      const total = c.quantity ?? null;
      const available = total != null ? Math.max(total - redeemed, 0) : null;
      const occupancy = total ? Math.round((redeemed / total) * 100) : null;
      return {
        id: c.id,
        name: c.name,
        kind: c.kind,
        total,
        available,
        redeemed,
        validated,
        revenue,
        fees,
        occupancy,
      };
    });
    // legacy bucket (tickets sem categoria)
    const legacy = tickets.filter((t) => !t.category_id && t.status !== "cancelled");
    if (legacy.length > 0) {
      rows.push({
        id: "__legacy__",
        name: "Sem modalidade (legado)",
        kind: "full",
        total: null,
        available: null,
        redeemed: legacy.length,
        validated: legacy.filter((t) => !!t.used_at || t.status === "used").length,
        revenue: legacy.reduce((s, t) => s + (t.unit_price_cents || 0), 0),
        fees: 0,
        occupancy: null,
      });
    }
    return rows;
  }, [categories, tickets]);

  const exportCSV = () => {
    const headers = ["Nome", "E-mail", "Telefone", "Código", "Modalidade", "Lote", "Valor (R$)", "Resgatado em", "Status", "Utilizado em"];
    const rows = filtered.map((t) => [
      t.holder_name, t.holder_email, t.holder_phone, t.code,
      t.category_name || (t.category_id ? t.category_id : "—"),
      t.batch_name || "—",
      formatBRL((t.unit_price_cents || 0) / 100),
      new Date(t.issued_at).toLocaleString("pt-BR"),
      t.used_at ? "Utilizado" : t.status,
      t.used_at ? new Date(t.used_at).toLocaleString("pt-BR") : "",
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `participantes-${event?.slug || id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 px-6 max-w-3xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-4">Evento não encontrado</h1>
          <Link to="/organizador" className="text-primary hover:underline">← Voltar ao painel</Link>
        </div>
        <Footer />
      </div>
    );
  }

  const redeemed = tickets.filter((t) => t.status !== "cancelled").length;
  const total = event.tickets_total || 0;
  const remaining = total ? Math.max(total - redeemed, 0) : null;
  const occupancy = total ? Math.min(Math.round((redeemed / total) * 100), 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-6xl mx-auto">
        <Link to="/organizador" className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar ao painel
        </Link>

        <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-6">
          <span className="flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{new Date(event.event_date).toLocaleString("pt-BR")}</span>
          <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{event.location}</span>
          {organizer && <span>Organizador: <strong>{organizer.organization_name}</strong></span>}
        </div>
        <p className="text-muted-foreground mb-8 max-w-3xl">{event.description}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Ingressos Totais</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{total || "Ilimitado"}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Resgatados</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{redeemed}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Disponíveis</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{remaining ?? "—"}</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Ocupação</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{total ? `${occupancy}%` : "—"}</div>{total ? <Progress value={occupancy} className="mt-2 h-2" /> : null}</CardContent></Card>
        </div>

        <div className="mb-6">
          <EventTicketingManager
            eventId={event.id}
            useBatches={!!event.use_batches}
            onUseBatchesChange={(v) => setEvent({ ...event, use_batches: v })}
          />
        </div>

        {/* Relatório por modalidade */}
        {report.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />📊 Por modalidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Modalidade</TableHead>
                      <TableHead className="text-right">Disponível</TableHead>
                      <TableHead className="text-right">Resgatado</TableHead>
                      <TableHead className="text-right">Validado</TableHead>
                      <TableHead className="text-right">Receita</TableHead>
                      <TableHead className="text-right">Taxas</TableHead>
                      <TableHead className="text-right">% Ocupação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.map((r) => {
                      const meta = KIND_LABEL[r.kind] || { label: r.name, icon: "🎫" };
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            <span className="mr-1">{meta.icon}</span>{r.name}
                          </TableCell>
                          <TableCell className="text-right">{r.available ?? "—"}</TableCell>
                          <TableCell className="text-right">{r.redeemed}</TableCell>
                          <TableCell className="text-right">{r.validated}</TableCell>
                          <TableCell className="text-right">{formatBRL(r.revenue / 100)}</TableCell>
                          <TableCell className="text-right text-muted-foreground">{formatBRL(r.fees / 100)}</TableCell>
                          <TableCell className="text-right">{r.occupancy != null ? `${r.occupancy}%` : "—"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" />👥 Participantes do Evento</CardTitle>
              <Button onClick={exportCSV} variant="outline" size="sm" className="gap-2"><Download className="h-4 w-4" />Exportar CSV</Button>
            </div>
            <div className="flex flex-wrap gap-3 mt-4">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input className="pl-9" placeholder="Buscar por nome, e-mail, telefone, código, modalidade…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
                <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Resgatados</SelectItem>
                  <SelectItem value="used">Utilizados</SelectItem>
                  <SelectItem value="unused">Não Utilizados</SelectItem>
                </SelectContent>
              </Select>
              {categories.length > 0 && (
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]"><SelectValue placeholder="Modalidade" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas modalidades</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {KIND_LABEL[c.kind]?.icon} {c.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__legacy__">Sem modalidade</SelectItem>
                  </SelectContent>
                </Select>
              )}
              {batches.length > 0 && (
                <Select value={batchFilter} onValueChange={setBatchFilter}>
                  <SelectTrigger className="w-[160px]"><SelectValue placeholder="Lote" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos lotes</SelectItem>
                    {batches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhum participante encontrado.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Modalidade</TableHead>
                      <TableHead>Lote</TableHead>
                      <TableHead>Resgatado em</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((t) => {
                      const meta = t.category_kind ? KIND_LABEL[t.category_kind] : null;
                      return (
                        <TableRow key={t.id}>
                          <TableCell className="font-medium">{t.holder_name}</TableCell>
                          <TableCell className="text-sm">{t.holder_email}</TableCell>
                          <TableCell className="text-sm">{t.holder_phone}</TableCell>
                          <TableCell className="font-mono text-xs">{t.code}</TableCell>
                          <TableCell className="text-sm">
                            {t.category_name ? (
                              <span>{meta?.icon} {t.category_name}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm">{t.batch_name || <span className="text-muted-foreground">—</span>}</TableCell>
                          <TableCell className="text-sm">{new Date(t.issued_at).toLocaleString("pt-BR")}</TableCell>
                          <TableCell>
                            {t.used_at ? (
                              <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30" variant="outline">Utilizado</Badge>
                            ) : t.status === "cancelled" ? (
                              <Badge variant="destructive">Cancelado</Badge>
                            ) : (
                              <Badge className="bg-green-500/15 text-green-600 border-green-500/30" variant="outline">Ativo</Badge>
                            )}
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
      <Footer />
    </div>
  );
};

export default OrganizadorEvento;
