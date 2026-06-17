import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2, RotateCcw, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { centsToBRL } from "@/lib/money";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ticketId: string;
  eventTitle?: string;
  onCreated?: () => void;
}

interface Estimate {
  amountPaid: number;
  fee: number;
  refundable: number;
}

const RefundRequestDialog = ({ open, onOpenChange, ticketId, eventTitle, onCreated }: Props) => {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loadingEst, setLoadingEst] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setEstimate(null);
    setLoadingEst(true);
    (async () => {
      const { data } = await supabase
        .from("payment_transactions" as any)
        .select("amount_cents, fee_cents")
        .eq("ticket_id", ticketId)
        .eq("status", "paid")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        const amount = (data as any).amount_cents || 0;
        const fee = (data as any).fee_cents || 0;
        setEstimate({ amountPaid: amount, fee, refundable: Math.max(amount - fee, 0) });
      } else {
        setEstimate({ amountPaid: 0, fee: 0, refundable: 0 });
      }
      setLoadingEst(false);
    })();
  }, [open, ticketId]);

  const submit = async () => {
    if (reason.trim().length < 10) {
      toast({ title: "Descreva o motivo (mínimo 10 caracteres)", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Faça login novamente", variant: "destructive" });
      setSubmitting(false);
      return;
    }
    const { error } = await supabase.from("refund_requests" as any).insert({
      ticket_id: ticketId,
      user_id: user.id,
      event_id: "00000000-0000-0000-0000-000000000000", // pre-fill, replaced by trigger
      reason: reason.trim(),
    } as any);
    setSubmitting(false);
    if (error) {
      toast({ title: "Não foi possível solicitar", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Pedido enviado",
      description: "Você receberá uma resposta da equipe Amazônia Pop em breve.",
    });
    onCreated?.();
    onOpenChange(false);
  };

  const noRefundable = estimate && estimate.refundable <= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-primary" /> Solicitar reembolso
          </DialogTitle>
          <DialogDescription>
            {eventTitle ? `Ingresso para "${eventTitle}".` : "Para este ingresso."} A solicitação
            será analisada pela equipe Amazônia Pop.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {loadingEst ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Calculando valor reembolsável…
            </div>
          ) : estimate ? (
            <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-1">
              <div className="flex justify-between"><span>Valor pago</span><strong>{centsToBRL(estimate.amountPaid)}</strong></div>
              <div className="flex justify-between text-muted-foreground"><span>Taxa da plataforma (não reembolsável)</span><span>− {centsToBRL(estimate.fee)}</span></div>
              <div className="flex justify-between text-base pt-1 border-t border-border/60 mt-1">
                <span>Valor a receber</span><strong className="text-primary">{centsToBRL(estimate.refundable)}</strong>
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-3 text-xs flex gap-2 text-yellow-800 dark:text-yellow-300">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              Reembolsos só podem ser solicitados até <strong>7 dias antes do evento</strong>. A
              taxa da plataforma não é devolvida. O pagamento é feito via PIX após aprovação.
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Motivo do reembolso</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Conte brevemente por que precisa do reembolso…"
              rows={4}
              maxLength={500}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">{reason.length}/500</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={submit}
            disabled={submitting || loadingEst || !!noRefundable}
            className="gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Enviar solicitação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RefundRequestDialog;
