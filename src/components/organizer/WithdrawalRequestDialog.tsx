import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { centsToBRL, brlToCents, formatBRLInput } from "@/lib/money";

interface Props {
  open: boolean;
  onClose: () => void;
  organizerId: string;
  availableCents: number;
  ticketsSold: number;
  platformFeesCents: number;
  onCreated: () => void;
}

const WithdrawalRequestDialog = ({ open, onClose, organizerId, availableCents, ticketsSold, platformFeesCents, onCreated }: Props) => {
  const { toast } = useToast();
  const [form, setForm] = useState({ full_name: "", cpf: "", whatsapp: "", pix_key: "", amount: "" });
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<"form" | "review">("form");

  useEffect(() => {
    if (open) {
      setStep("form");
      setForm({ full_name: "", cpf: "", whatsapp: "", pix_key: "", amount: formatBRLInput(availableCents) });
    }
  }, [open, availableCents]);

  const amountCents = brlToCents(form.amount);
  const valid = form.full_name.trim() && form.cpf.trim() && form.whatsapp.trim() && form.pix_key.trim() && amountCents > 0 && amountCents <= availableCents;

  const submit = async () => {
    if (!valid) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase.from("withdrawal_requests" as any).insert({
        organizer_id: organizerId,
        user_id: user.id,
        full_name: form.full_name.trim(),
        cpf: form.cpf.trim(),
        whatsapp: form.whatsapp.trim(),
        pix_key: form.pix_key.trim(),
        amount_cents: amountCents,
      }).select("id").single();
      if (error) throw error;
      await (supabase as any).rpc("log_financial_event", {
        _action: "withdrawal_requested",
        _entity_type: "withdrawal_request",
        _entity_id: (data as any).id,
        _metadata: { amount_cents: amountCents },
      });
      toast({ title: "Solicitação enviada!", description: "Em análise pelo administrador." });
      onCreated();
      onClose();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Solicitar Saque</DialogTitle>
          <DialogDescription>
            Saldo disponível: <strong>{centsToBRL(availableCents)}</strong>
          </DialogDescription>
        </DialogHeader>

        {step === "form" ? (
          <div className="space-y-3">
            <Field label="Nome Completo *" value={form.full_name} onChange={(v) => setForm(f => ({ ...f, full_name: v }))} />
            <Field label="CPF *" value={form.cpf} onChange={(v) => setForm(f => ({ ...f, cpf: v }))} placeholder="000.000.000-00" />
            <Field label="WhatsApp *" value={form.whatsapp} onChange={(v) => setForm(f => ({ ...f, whatsapp: v }))} placeholder="(91) 99999-9999" />
            <Field label="Chave PIX *" value={form.pix_key} onChange={(v) => setForm(f => ({ ...f, pix_key: v }))} />
            <Field label="Valor do Saque (R$) *" value={form.amount} onChange={(v) => setForm(f => ({ ...f, amount: v }))} placeholder="0,00" />
            {amountCents > availableCents && <p className="text-xs text-destructive">Valor maior que o saldo disponível.</p>}
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={onClose}>Cancelar</Button>
              <Button disabled={!valid} onClick={() => setStep("review")}>Revisar</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-secondary/40 rounded-xl p-4 space-y-1.5 text-sm">
              <Row label="Valor Disponível" value={centsToBRL(availableCents)} />
              <Row label="Valor Solicitado" value={centsToBRL(amountCents)} />
              <Row label="Ingressos Vendidos" value={String(ticketsSold)} />
              <Row label="Total Retido em Taxas" value={centsToBRL(platformFeesCents)} />
              <Row label="Chave PIX" value={form.pix_key} />
              <Row label="CPF" value={form.cpf} />
              <Row label="Titular" value={form.full_name} />
            </div>
            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setStep("form")}>Voltar</Button>
              <Button onClick={submit} disabled={submitting} className="gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirmar Solicitação
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const Field = ({ label, value, onChange, placeholder }: any) => (
  <div className="space-y-1.5">
    <Label>{label}</Label>
    <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  </div>
);
const Row = ({ label, value }: any) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-muted-foreground">{label}:</span>
    <span className="font-medium truncate max-w-[60%] text-right">{value}</span>
  </div>
);

export default WithdrawalRequestDialog;
