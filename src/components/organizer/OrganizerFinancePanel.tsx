import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet, ArrowDownToLine, Receipt, CheckCircle2, Clock, XCircle, FileDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { centsToBRL } from "@/lib/money";
import WithdrawalRequestDialog from "./WithdrawalRequestDialog";

interface Props { organizerId: string }

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
  const [loading, setLoading] = useState(true);
  const [openWithdraw, setOpenWithdraw] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: sum }, { data: wd }] = await Promise.all([
      supabase.rpc("organizer_financial_summary" as any, { _organizer_id: organizerId }),
      supabase.from("withdrawal_requests" as any).select("*").eq("organizer_id", organizerId).order("created_at", { ascending: false }),
    ]);
    const row = Array.isArray(sum) ? sum[0] : sum;
    setSummary(row || null);
    setWithdrawals((wd as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [organizerId]);

  const downloadReceipt = async (path: string) => {
    const { data, error } = await supabase.storage.from("withdrawal-receipts").createSignedUrl(path, 60);
    if (error || !data?.signedUrl) return;
    window.open(data.signedUrl, "_blank");
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const s = summary ?? { tickets_sold: 0, gross_revenue_cents: 0, platform_fees_cents: 0, net_revenue_cents: 0, withdrawn_cents: 0, pending_withdrawal_cents: 0, available_cents: 0 };

  return (
    <div className="space-y-6">
      {/* Cards principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card icon={Wallet} label="Receita Bruta" value={centsToBRL(s.gross_revenue_cents)} />
        <Card icon={Wallet} label="Total Retido em Taxas" value={centsToBRL(s.platform_fees_cents)} />
        <Card icon={Receipt} label="Ingressos Vendidos" value={String(s.tickets_sold)} />
        <Card icon={ArrowDownToLine} label="Saldo Disponível" value={centsToBRL(s.available_cents)} highlight />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card icon={Clock} label="Saldo Pendente (em saques)" value={centsToBRL(s.pending_withdrawal_cents)} />
        <Card icon={CheckCircle2} label="Total Já Sacado" value={centsToBRL(s.withdrawn_cents)} />
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setOpenWithdraw(true)} disabled={s.available_cents <= 0} className="gap-2">
          <ArrowDownToLine className="h-4 w-4" /> Solicitar Saque
        </Button>
      </div>

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
