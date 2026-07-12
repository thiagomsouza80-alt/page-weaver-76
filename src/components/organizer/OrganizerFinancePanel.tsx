import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet, ArrowDownToLine, Receipt, CheckCircle2, Clock, XCircle, FileDown, Package, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { centsToBRL } from "@/lib/money";
import WithdrawalRequestDialog from "./WithdrawalRequestDialog";

interface Props { organizerId: string }

interface AddonStat {
  product_id: string | null;
  product_name: string;
  quantity: number;
  revenue_cents: number;
}

interface Summary {
  tickets_sold: number;
  gross_revenue_cents: number;
  platform_fees_cents: number;
  net_revenue_cents: number;
  withdrawn_cents: number;
  pending_withdrawal_cents: number;
  available_cents: number;
}

const statusMeta = (s: string) => {
  switch (s) {
    case "approved": return { label: "Aprovado", cls: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: CheckCircle2 };
    case "paid": return { label: "Pago", cls: "bg-green-500/15 text-green-600 border-green-500/30", icon: CheckCircle2 };
    case "rejected": return { label: "Recusado", cls: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle };
    default: return { label: "Em Análise", cls: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30", icon: Clock };
  }
};

const OrganizerFinancePanel = ({ organizerId }: Props) => {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [addons, setAddons] = useState<AddonStat[]>([]);
  const [ticketsCount, setTicketsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openWithdraw, setOpenWithdraw] = useState(false);

  const load = async () => {
    setLoading(true);
    // events do organizador
    const { data: evs } = await supabase.from("events").select("id").eq("organizer_id", organizerId);
    const eventIds = (evs || []).map((e: any) => e.id);

    const [{ data: sum }, { data: wd }, addonsRes, ticketsRes] = await Promise.all([
      supabase.rpc("organizer_financial_summary" as any, { _organizer_id: organizerId }),
      supabase.from("withdrawal_requests" as any).select("*").eq("organizer_id", organizerId).order("created_at", { ascending: false }),
      eventIds.length
        ? supabase.from("ticket_addons" as any).select("product_id, product_name, quantity, unit_price_cents").in("event_id", eventIds)
        : Promise.resolve({ data: [] as any[] }),
      eventIds.length
        ? supabase.from("tickets" as any).select("id", { count: "exact", head: true }).in("event_id", eventIds).neq("status", "cancelled")
        : Promise.resolve({ count: 0 }),
    ]);

    const row = Array.isArray(sum) ? sum[0] : sum;
    setSummary(row || null);
    setWithdrawals((wd as any) || []);
    setTicketsCount(((ticketsRes as any).count as number) || 0);

    const map = new Map<string, AddonStat>();
    for (const a of ((addonsRes as any).data || []) as any[]) {
      const key = a.product_id || a.product_name;
      const cur = map.get(key) || { product_id: a.product_id, product_name: a.product_name, quantity: 0, revenue_cents: 0 };
      cur.quantity += a.quantity;
      cur.revenue_cents += (a.unit_price_cents || 0) * a.quantity;
      map.set(key, cur);
    }
    setAddons(Array.from(map.values()).sort((a, b) => b.revenue_cents - a.revenue_cents));

    setLoading(false);
  };

  useEffect(() => { load(); }, [organizerId]);

  const addonTotals = useMemo(() => {
    const revenue = addons.reduce((s, a) => s + a.revenue_cents, 0);
    const quantity = addons.reduce((s, a) => s + a.quantity, 0);
    const top = addons[0]?.product_name || "—";
    return { revenue, quantity, top };
  }, [addons]);

  const downloadReceipt = async (path: string) => {
    const { data, error } = await supabase.storage.from("withdrawal-receipts").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) return;
    window.open(data.signedUrl, "_blank");
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const s = summary ?? { tickets_sold: 0, gross_revenue_cents: 0, platform_fees_cents: 0, net_revenue_cents: 0, withdrawn_cents: 0, pending_withdrawal_cents: 0, available_cents: 0 };

  const ticketRevenue = s.gross_revenue_cents; // ingressos (RPC atual)
  const totalRevenue = ticketRevenue + addonTotals.revenue;
  const avgTicket = ticketsCount > 0 ? Math.round(totalRevenue / ticketsCount) : 0;

  return (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={Wallet} label="Receita Ingressos" value={centsToBRL(ticketRevenue)} />
        <Card icon={Package} label="Receita Adicionais" value={centsToBRL(addonTotals.revenue)} />
        <Card icon={TrendingUp} label="Receita Total" value={centsToBRL(totalRevenue)} highlight />
        <Card icon={ArrowDownToLine} label="Saldo Disponível" value={centsToBRL(s.available_cents)} highlight />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={Receipt} label="Ingressos Vendidos" value={String(s.tickets_sold)} />
        <Card icon={TrendingUp} label="Ticket Médio" value={centsToBRL(avgTicket)} />
        <Card icon={Wallet} label="Taxas Retidas" value={centsToBRL(s.platform_fees_cents)} />
        <Card icon={CheckCircle2} label="Total Já Sacado" value={centsToBRL(s.withdrawn_cents)} />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setOpenWithdraw(true)} disabled={s.available_cents <= 0} className="gap-2">
          <ArrowDownToLine className="h-4 w-4" /> Solicitar Saque
        </Button>
      </div>

      {/* Adicionais */}
      {addons.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-6">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" /> Produtos Adicionais Vendidos
          </h3>
          <div className="space-y-2">
            {addons.map((a) => (
              <div key={(a.product_id || a.product_name) as string} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/50">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{a.product_name}</p>
                  <p className="text-xs text-muted-foreground">{a.quantity} un. vendidas</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-semibold text-sm">{centsToBRL(a.revenue_cents)}</p>
                </div>
              </div>
            ))}
          </div>
          {addonTotals.top !== "—" && (
            <p className="text-xs text-muted-foreground mt-3">🏆 Mais vendido: <strong className="text-foreground">{addonTotals.top}</strong></p>
          )}
        </div>
      )}


      {/* Histórico */}
      <div className="bg-card rounded-xl border border-border p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><Receipt className="h-4 w-4 text-primary" />Histórico de Saques</h3>
        {withdrawals.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum saque solicitado ainda.</p>
        ) : (
          <div className="space-y-2">
            {withdrawals.map(w => {
              const m = statusMeta(w.status);
              const Icon = m.icon;
              return (
                <div key={w.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{centsToBRL(w.amount_cents)}</span>
                      <Badge variant="outline" className={m.cls}><Icon className="h-3 w-3 mr-1" />{m.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(w.created_at).toLocaleString("pt-BR")} • PIX: {w.pix_key}
                    </p>
                    {w.rejection_reason && <p className="text-xs text-destructive mt-1">Motivo: {w.rejection_reason}</p>}
                    {w.paid_at && <p className="text-xs text-green-600 mt-1">Pago em {new Date(w.paid_at).toLocaleString("pt-BR")}</p>}
                  </div>
                  {w.receipt_path && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadReceipt(w.receipt_path)}>
                      <FileDown className="h-3.5 w-3.5" /> Comprovante
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <WithdrawalRequestDialog
        open={openWithdraw}
        onClose={() => setOpenWithdraw(false)}
        organizerId={organizerId}
        availableCents={s.available_cents}
        ticketsSold={s.tickets_sold}
        platformFeesCents={s.platform_fees_cents}
        onCreated={load}
      />
    </div>
  );
};

const Card = ({ icon: Icon, label, value, highlight }: any) => (
  <div className={`rounded-xl border p-4 ${highlight ? "bg-primary/10 border-primary/30" : "bg-card border-border"}`}>
    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
      <Icon className="h-3.5 w-3.5" />{label}
    </div>
    <div className={`text-2xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</div>
  </div>
);

export default OrganizerFinancePanel;
