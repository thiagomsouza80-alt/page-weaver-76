import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, BarChart3, Wallet, Receipt, Users, CalendarDays, Download } from "lucide-react";
import { centsToBRL } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const AdminFinancePanel = () => {
  const [loading, setLoading] = useState(true);
  const [txs, setTxs] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [filters, setFilters] = useState({ organizer: "", event: "", status: "", from: "", to: "" });

  const load = async () => {
    setLoading(true);
    const [{ data: t }, { data: w }, { data: o }, { data: e }] = await Promise.all([
      supabase.from("payment_transactions" as any).select("*, organizer:organizer_id(organization_name), event:event_id(title)").order("created_at", { ascending: false }),
      supabase.from("withdrawal_requests" as any).select("amount_cents, status"),
      supabase.from("organizers").select("id, organization_name, approval_status"),
      supabase.from("events").select("id, title, ticket_type, published"),
    ]);
    setTxs((t as any) || []);
    setWithdrawals((w as any) || []);
    setOrganizers((o as any) || []);
    setEvents((e as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => txs.filter((t: any) => {
    if (filters.organizer && t.organizer_id !== filters.organizer) return false;
    if (filters.event && t.event_id !== filters.event) return false;
    if (filters.status && t.status !== filters.status) return false;
    if (filters.from && new Date(t.created_at) < new Date(filters.from)) return false;
    if (filters.to && new Date(t.created_at) > new Date(filters.to + "T23:59:59")) return false;
    return true;
  }), [txs, filters]);

  const paid = filtered.filter(t => t.status === "paid");
  const grossRevenue = paid.reduce((s, t) => s + (t.amount_cents + t.fee_cents), 0);
  const feesCollected = paid.reduce((s, t) => s + t.fee_cents, 0);
  const pendingWith = withdrawals.filter(w => w.status === "pending" || w.status === "approved").reduce((s, w) => s + w.amount_cents, 0);
  const paidWith = withdrawals.filter(w => w.status === "paid").reduce((s, w) => s + w.amount_cents, 0);

  const exportCsv = () => {
    const rows = [
      ["Data", "Organizador", "Evento", "Comprador", "Valor", "Taxa", "Total", "Status", "Transaction ID"],
      ...filtered.map((t: any) => [
        new Date(t.created_at).toLocaleString("pt-BR"),
        t.organizer?.organization_name || "",
        t.event?.title || "",
        t.buyer_name, (t.amount_cents/100).toFixed(2), (t.fee_cents/100).toFixed(2),
        (t.total_cents/100).toFixed(2), t.status, t.provider_transaction_id || t.id,
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `financeiro-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Controle Financeiro</h2>
        <Button onClick={exportCsv} variant="outline" className="gap-2"><Download className="h-4 w-4" />Exportar CSV</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card icon={Wallet} label="Receita Total" value={centsToBRL(grossRevenue)} />
        <Card icon={Receipt} label="Taxas Arrecadadas" value={centsToBRL(feesCollected)} highlight />
        <Card icon={CalendarDays} label="Ingressos Pagos" value={String(paid.length)} />
        <Card icon={Users} label="Organizadores Ativos" value={String(organizers.filter(o => o.approval_status === "approved").length)} />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card icon={Wallet} label="Saques Pendentes" value={centsToBRL(pendingWith)} />
        <Card icon={Wallet} label="Saques Pagos" value={centsToBRL(paidWith)} />
        <Card icon={CalendarDays} label="Eventos Pagos" value={String(events.filter(e => e.ticket_type === "paid" && e.published).length)} />
        <Card icon={Receipt} label="Transações Totais" value={String(filtered.length)} />
      </div>

      <div className="bg-card rounded-xl border border-border p-4 mb-4 grid grid-cols-1 sm:grid-cols-5 gap-3">
        <select value={filters.organizer} onChange={e => setFilters(f => ({ ...f, organizer: e.target.value }))} className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm">
          <option value="">Todos organizadores</option>
          {organizers.map(o => <option key={o.id} value={o.id}>{o.organization_name}</option>)}
        </select>
        <select value={filters.event} onChange={e => setFilters(f => ({ ...f, event: e.target.value }))} className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm">
          <option value="">Todos eventos</option>
          {events.map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
        </select>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm">
          <option value="">Todos status</option>
          <option value="pending">Aguardando</option>
          <option value="paid">Pago</option>
          <option value="cancelled">Cancelado</option>
          <option value="expired">Expirado</option>
        </select>
        <Input type="date" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
        <Input type="date" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
      </div>

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/50">
              <tr className="text-left">
                <th className="px-3 py-2">Data</th>
                <th className="px-3 py-2">Evento</th>
                <th className="px-3 py-2">Organizador</th>
                <th className="px-3 py-2">Comprador</th>
                <th className="px-3 py-2 text-right">Valor</th>
                <th className="px-3 py-2 text-right">Taxa</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">Nenhuma transação.</td></tr>
              ) : filtered.slice(0, 200).map((t: any) => (
                <tr key={t.id} className="border-t border-border/40">
                  <td className="px-3 py-2 whitespace-nowrap text-xs">{new Date(t.created_at).toLocaleString("pt-BR")}</td>
                  <td className="px-3 py-2">{t.event?.title}</td>
                  <td className="px-3 py-2">{t.organizer?.organization_name}</td>
                  <td className="px-3 py-2">{t.buyer_name}</td>
                  <td className="px-3 py-2 text-right">{centsToBRL(t.amount_cents)}</td>
                  <td className="px-3 py-2 text-right">{centsToBRL(t.fee_cents)}</td>
                  <td className="px-3 py-2 text-right font-semibold">{centsToBRL(t.total_cents)}</td>
                  <td className="px-3 py-2"><StatusPill s={t.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const Card = ({ icon: Icon, label, value, highlight }: any) => (
  <div className={`rounded-xl border p-4 ${highlight ? "bg-primary/10 border-primary/30" : "bg-card border-border"}`}>
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Icon className="h-3.5 w-3.5" />{label}</div>
    <div className={`text-xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</div>
  </div>
);
const StatusPill = ({ s }: { s: string }) => {
  const map: any = { paid: "bg-green-500/15 text-green-600", pending: "bg-yellow-500/15 text-yellow-700", cancelled: "bg-muted text-muted-foreground", expired: "bg-muted text-muted-foreground", failed: "bg-destructive/15 text-destructive" };
  return <span className={`text-xs px-2 py-0.5 rounded ${map[s] || "bg-muted"}`}>{s}</span>;
};

export default AdminFinancePanel;
