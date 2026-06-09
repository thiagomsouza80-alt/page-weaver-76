import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Copy, CheckCircle2, Clock, QrCode } from "lucide-react";
import { centsToBRL } from "@/lib/money";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  charge: {
    transaction_id: string;
    qrcode: string;
    copy_paste: string;
    expires_at: string;
    amount_cents: number;
    fee_cents: number;
    total_cents: number;
  } | null;
  eventTitle?: string;
  onPaid?: (ticketId: string) => void;
}

const PixPaymentDialog = ({ open, onClose, charge, eventTitle, onPaid }: Props) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<"pending" | "paid" | "expired" | "cancelled">("pending");
  const [ticketId, setTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !charge) return;
    setStatus("pending");
    setTicketId(null);

    const ch = supabase
      .channel(`tx-${charge.transaction_id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "payment_transactions", filter: `id=eq.${charge.transaction_id}` },
        (payload: any) => {
          const next = payload.new;
          if (next.status === "paid") {
            setStatus("paid");
            setTicketId(next.ticket_id);
            onPaid?.(next.ticket_id);
            toast({ title: "Pagamento confirmado!", description: "Seu ingresso foi liberado." });
          } else if (next.status === "expired") setStatus("expired");
          else if (next.status === "cancelled") setStatus("cancelled");
        }
      )
      .subscribe();

    // Polling fallback (caso webhook ainda não esteja integrado)
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from("payment_transactions" as any)
        .select("status, ticket_id")
        .eq("id", charge.transaction_id)
        .maybeSingle();
      if ((data as any)?.status === "paid") {
        setStatus("paid");
        setTicketId((data as any).ticket_id);
        onPaid?.((data as any).ticket_id);
        clearInterval(poll);
      }
    }, 5000);

    return () => {
      supabase.removeChannel(ch);
      clearInterval(poll);
    };
  }, [open, charge, onPaid, toast]);

  if (!charge) return null;

  const copy = async () => {
    await navigator.clipboard.writeText(charge.copy_paste);
    toast({ title: "Código PIX copiado!" });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {status === "paid" ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <QrCode className="h-5 w-5 text-primary" />}
            {status === "paid" ? "Pagamento confirmado" : "Pagamento via PIX"}
          </DialogTitle>
          <DialogDescription>
            {eventTitle && <span className="block font-medium text-foreground">{eventTitle}</span>}
            {status === "pending" && "Escaneie o QR Code ou copie o código PIX para pagar."}
            {status === "paid" && "Seu ingresso foi liberado em Meus Ingressos."}
            {status === "expired" && "Este PIX expirou. Tente novamente."}
            {status === "cancelled" && "Cobrança cancelada."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-secondary/40 rounded-xl p-4 space-y-1.5">
            <Row label="Valor do Ingresso" value={centsToBRL(charge.amount_cents)} />
            <Row label="Taxa Amazônia Pop" value={centsToBRL(charge.fee_cents)} />
            <div className="border-t border-border/60 pt-2 mt-2">
              <Row label="Total a Pagar" value={centsToBRL(charge.total_cents)} bold />
            </div>
          </div>

          {status === "pending" && (
            <>
              <div className="flex justify-center bg-white p-3 rounded-xl">
                <img src={charge.qrcode} alt="QR Code PIX" className="w-64 h-64" />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">PIX Copia e Cola:</p>
                <div className="flex gap-2">
                  <input readOnly value={charge.copy_paste} className="flex-1 text-xs px-3 py-2 rounded-lg bg-secondary border border-border font-mono" />
                  <Button size="icon" variant="outline" onClick={copy}><Copy className="h-4 w-4" /></Button>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Aguardando pagamento…
              </div>
              <p className="text-xs text-center text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-3 w-3" /> Expira em {new Date(charge.expires_at).toLocaleString("pt-BR")}
              </p>
            </>
          )}

          {status === "paid" && ticketId && (
            <div className="text-center py-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <p className="font-semibold">Ingresso liberado!</p>
              <p className="text-sm text-muted-foreground">Acesse em Meus Ingressos.</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className="flex items-center justify-between text-sm">
    <span className={bold ? "font-semibold" : "text-muted-foreground"}>{label}:</span>
    <span className={bold ? "font-bold text-base" : "font-medium"}>{value}</span>
  </div>
);

export default PixPaymentDialog;
