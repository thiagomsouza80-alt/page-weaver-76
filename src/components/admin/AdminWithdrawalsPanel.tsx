import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, CheckCircle2, XCircle, Clock, Upload, FileDown, Wallet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { centsToBRL } from "@/lib/money";

const statusMeta = (s: string) => {
  switch (s) {
    case "approved": return { label: "Aprovado", cls: "bg-blue-500/15 text-blue-600 border-blue-500/30", icon: CheckCircle2 };
    case "paid": return { label: "Pago", cls: "bg-green-500/15 text-green-600 border-green-500/30", icon: CheckCircle2 };
    case "rejected": return { label: "Recusado", cls: "bg-destructive/15 text-destructive border-destructive/30", icon: XCircle };
    default: return { label: "Em Análise", cls: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30", icon: Clock };
  }
};

const AdminWithdrawalsPanel = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [payDialog, setPayDialog] = useState<any | null>(null);
  const [rejectDialog, setRejectDialog] = useState<any | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("withdrawal_requests" as any)
      .select("*, organizer:organizer_id(organization_name, email)")
      .order("created_at", { ascending: false });
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (w: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("withdrawal_requests" as any).update({
      status: "approved", approved_by: user?.id,
    }).eq("id", w.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await supabase.from("financial_audit_logs" as any).insert({
      actor_user_id: user?.id, action: "withdrawal_approved", entity_type: "withdrawal_request", entity_id: w.id,
    });
    toast({ title: "Saque aprovado" });
    load();
  };

  const filtered = items.filter(i => filter === "all" || i.status === filter);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h2 className="text-2xl font-bold flex items-center gap-2"><Wallet className="h-5 w-5 text-primary" />Solicitações de Saque</h2>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-1.5 rounded-lg bg-card border border-border text-sm">
          <option value="all">Todos os status</option>
          <option value="pending">Em Análise</option>
          <option value="approved">Aprovado</option>
          <option value="paid">Pago</option>
          <option value="rejected">Recusado</option>
        </select>
      </div>

      {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        : filtered.length === 0 ? <p className="text-muted-foreground text-center py-12">Nenhuma solicitação.</p>
        : (
          <div className="space-y-3">
            {filtered.map(w => {
              const m = statusMeta(w.status);
              const Icon = m.icon;
              return (
                <div key={w.id} className="bg-card rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-lg">{centsToBRL(w.amount_cents)}</span>
                        <Badge variant="outline" className={m.cls}><Icon className="h-3 w-3 mr-1" />{m.label}</Badge>
                      </div>
                      <p className="text-sm font-medium mt-1">{w.organizer?.organization_name}</p>
                      <p className="text-xs text-muted-foreground">{w.organizer?.email}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                        <div><strong className="text-foreground">Titular:</strong> {w.full_name}</div>
                        <div><strong className="text-foreground">CPF:</strong> {w.cpf}</div>
                        <div><strong className="text-foreground">WhatsApp:</strong> {w.whatsapp}</div>
                        <div><strong className="text-foreground">PIX:</strong> {w.pix_key}</div>
                        <div><strong className="text-foreground">Solicitado:</strong> {new Date(w.created_at).toLocaleString("pt-BR")}</div>
                        {w.paid_at && <div><strong className="text-foreground">Pago em:</strong> {new Date(w.paid_at).toLocaleString("pt-BR")}</div>}
                      </div>
                      {w.rejection_reason && <p className="text-xs text-destructive mt-2">Motivo: {w.rejection_reason}</p>}
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      {w.status === "pending" && (
                        <>
                          <Button size="sm" onClick={() => approve(w)} className="gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" />Aprovar</Button>
                          <Button size="sm" variant="outline" onClick={() => setRejectDialog(w)} className="gap-1.5"><XCircle className="h-3.5 w-3.5" />Recusar</Button>
                        </>
                      )}
                      {w.status === "approved" && (
                        <Button size="sm" onClick={() => setPayDialog(w)} className="gap-1.5"><Upload className="h-3.5 w-3.5" />Marcar como Pago</Button>
                      )}
                      {w.receipt_path && (
                        <ReceiptButton path={w.receipt_path} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      <PayDialog withdrawal={payDialog} onClose={() => setPayDialog(null)} onDone={load} />
      <RejectDialog withdrawal={rejectDialog} onClose={() => setRejectDialog(null)} onDone={load} />
    </div>
  );
};

const ReceiptButton = ({ path }: { path: string }) => (
  <Button size="sm" variant="outline" className="gap-1.5" onClick={async () => {
    const { data } = await supabase.storage.from("withdrawal-receipts").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }}><FileDown className="h-3.5 w-3.5" />Comprovante</Button>
);

const PayDialog = ({ withdrawal, onClose, onDone }: any) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!file || !withdrawal) return;
    if (file.size > 10 * 1024 * 1024) { toast({ title: "Arquivo > 10MB", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${withdrawal.organizer_id}/${withdrawal.id}.${ext}`;
      const { error: upErr } = await supabase.storage.from("withdrawal-receipts").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("withdrawal_requests" as any).update({
        status: "paid", receipt_path: path, receipt_url: path, paid_by: user?.id,
      }).eq("id", withdrawal.id);
      if (error) throw error;
      await supabase.from("financial_audit_logs" as any).insert({
        actor_user_id: user?.id, action: "withdrawal_paid", entity_type: "withdrawal_request", entity_id: withdrawal.id,
        metadata: { receipt_path: path },
      });
      toast({ title: "Saque marcado como pago" });
      onDone();
      onClose();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  return (
    <Dialog open={!!withdrawal} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Marcar como Pago</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Anexe o comprovante de pagamento (PDF, JPG, PNG, até 10MB).</p>
          <Input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*" onChange={e => setFile(e.target.files?.[0] || null)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={!file || submitting} className="gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}Confirmar Pagamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RejectDialog = ({ withdrawal, onClose, onDone }: any) => {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const submit = async () => {
    if (!withdrawal) return;
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("withdrawal_requests" as any).update({
      status: "rejected", rejection_reason: reason,
    }).eq("id", withdrawal.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    await supabase.from("financial_audit_logs" as any).insert({
      actor_user_id: user?.id, action: "withdrawal_rejected", entity_type: "withdrawal_request", entity_id: withdrawal.id, metadata: { reason },
    });
    toast({ title: "Saque recusado" });
    onDone(); onClose();
  };
  return (
    <Dialog open={!!withdrawal} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Recusar Saque</DialogTitle></DialogHeader>
        <Textarea placeholder="Motivo da recusa" value={reason} onChange={e => setReason(e.target.value)} rows={3} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button variant="destructive" onClick={submit} disabled={!reason.trim()}>Recusar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminWithdrawalsPanel;
