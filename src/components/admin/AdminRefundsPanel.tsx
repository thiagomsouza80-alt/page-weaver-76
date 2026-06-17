import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Upload,
  FileDown,
  RotateCcw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { centsToBRL } from "@/lib/money";

const statusMeta = (s: string) => {
  switch (s) {
    case "approved":
      return { label: "Aprovado", cls: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: CheckCircle2 };
    case "paid":
      return { label: "Pago", cls: "bg-green-500/15 text-green-600 border-green-500/30", icon: CheckCircle2 };
    case "rejected":
      return { label: "Recusado", cls: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle };
    case "cancelled":
      return { label: "Cancelado", cls: "bg-muted text-muted-foreground border-border", icon: XCircle };
    default:
      return { label: "Em análise", cls: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30", icon: Clock };
  }
};

const AdminRefundsPanel = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [payDialog, setPayDialog] = useState<any | null>(null);
  const [rejectDialog, setRejectDialog] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("refund_requests" as any)
      .select(
        "*, events:event_id(title, event_date), tickets:ticket_id(code, holder_name), organizers:organizer_id(organization_name, name, email)"
      )
      .order("created_at", { ascending: false });
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const approve = async (r: any) => {
    const { error } = await supabase
      .from("refund_requests" as any)
      .update({ status: "approved" })
      .eq("id", r.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    await (supabase as any).rpc("log_financial_event", {
      _action: "refund_approved",
      _entity_type: "refund_request",
      _entity_id: r.id,
      _metadata: {},
    });
    toast({ title: "Reembolso aprovado" });
    load();
  };

  const filtered = items.filter((i) => filter === "all" || i.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <RotateCcw className="h-5 w-5 text-primary" /> Reembolsos
        </h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg bg-card border border-border text-sm"
        >
          <option value="all">Todos os status</option>
          <option value="pending">Em análise</option>
          <option value="approved">Aprovado</option>
          <option value="paid">Pago</option>
          <option value="rejected">Recusado</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum pedido de reembolso.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const m = statusMeta(r.status);
            const Icon = m.icon;
            const orgName = r.organizers?.organization_name || r.organizers?.name;
            return (
              <div key={r.id} className="bg-card rounded-xl border border-border p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-lg">{centsToBRL(r.amount_refundable_cents)}</span>
                      <Badge variant="outline" className={m.cls}>
                        <Icon className="h-3 w-3 mr-1" />
                        {m.label}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium mt-1">{r.events?.title || "Evento"}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                      <div>
                        <strong className="text-foreground">Ingresso:</strong> {r.tickets?.code}
                      </div>
                      {r.tickets?.holder_name && (
                        <div>
                          <strong className="text-foreground">Participante:</strong> {r.tickets.holder_name}
                        </div>
                      )}
                      {orgName && (
                        <div>
                          <strong className="text-foreground">Organizador:</strong> {orgName}
                        </div>
                      )}
                      <div>
                        <strong className="text-foreground">Pago original:</strong>{" "}
                        {centsToBRL(r.amount_paid_cents)}
                      </div>
                      <div>
                        <strong className="text-foreground">Taxa retida:</strong>{" "}
                        {centsToBRL(r.platform_fee_cents)}
                      </div>
                      <div>
                        <strong className="text-foreground">Solicitado:</strong>{" "}
                        {new Date(r.requested_at).toLocaleString("pt-BR")}
                      </div>
                      {r.paid_at && (
                        <div>
                          <strong className="text-foreground">Pago em:</strong>{" "}
                          {new Date(r.paid_at).toLocaleString("pt-BR")}
                        </div>
                      )}
                    </div>
                    <p className="text-xs mt-2">
                      <strong className="text-foreground">Motivo:</strong> {r.reason}
                    </p>
                    {r.decision_reason && (
                      <p className="text-xs text-destructive mt-1">
                        Resposta: {r.decision_reason}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {r.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => approve(r)} className="gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRejectDialog(r)}
                          className="gap-1.5"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          Recusar
                        </Button>
                      </>
                    )}
                    {r.status === "approved" && (
                      <Button size="sm" onClick={() => setPayDialog(r)} className="gap-1.5">
                        <Upload className="h-3.5 w-3.5" />
                        Marcar como pago
                      </Button>
                    )}
                    {r.receipt_url && <ReceiptButton path={r.receipt_url} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <PayDialog refund={payDialog} onClose={() => setPayDialog(null)} onDone={load} />
      <RejectDialog refund={rejectDialog} onClose={() => setRejectDialog(null)} onDone={load} />
    </div>
  );
};

const ReceiptButton = ({ path }: { path: string }) => (
  <Button
    size="sm"
    variant="outline"
    className="gap-1.5"
    onClick={async () => {
      const { data } = await supabase.storage.from("refund-receipts").createSignedUrl(path, 60);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    }}
  >
    <FileDown className="h-3.5 w-3.5" />
    Comprovante
  </Button>
);

const PayDialog = ({ refund, onClose, onDone }: any) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!file || !refund) return;
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo > 10MB", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${refund.user_id}/${refund.id}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("refund-receipts")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { error } = await supabase
        .from("refund_requests" as any)
        .update({ status: "paid", receipt_url: path })
        .eq("id", refund.id);
      if (error) throw error;
      await (supabase as any).rpc("log_financial_event", {
        _action: "refund_paid",
        _entity_type: "refund_request",
        _entity_id: refund.id,
        _metadata: { receipt_path: path },
      });
      toast({ title: "Reembolso marcado como pago" });
      onDone();
      onClose();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!refund} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar reembolso como pago</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Anexe o comprovante do PIX enviado ao comprador (PDF, JPG, PNG, até 10MB). O ingresso
            será cancelado automaticamente.
          </p>
          <Input
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!file || submitting} className="gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Confirmar pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RejectDialog = ({ refund, onClose, onDone }: any) => {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const submit = async () => {
    if (!refund) return;
    const { error } = await supabase
      .from("refund_requests" as any)
      .update({ status: "rejected", decision_reason: reason })
      .eq("id", refund.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    await (supabase as any).rpc("log_financial_event", {
      _action: "refund_rejected",
      _entity_type: "refund_request",
      _entity_id: refund.id,
      _metadata: { reason },
    });
    toast({ title: "Reembolso recusado" });
    onDone();
    onClose();
  };
  return (
    <Dialog open={!!refund} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Recusar reembolso</DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder="Motivo da recusa (será mostrado ao comprador)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={submit} disabled={!reason.trim()}>
            Recusar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminRefundsPanel;
