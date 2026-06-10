import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ticket, Loader2, CheckCircle, LogIn, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TicketCard from "./TicketCard";
import PixPaymentDialog from "./PixPaymentDialog";
import { downloadTicketPdf } from "@/lib/ticketPdf";
import { centsToBRL } from "@/lib/money";
import { usePlatformFee } from "@/lib/platformFee";

interface Props {
  eventId: string;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  label?: string;
}

const TicketRedeemButton = ({ eventId, eventTitle, eventDate, eventLocation, label = "Adquirir Ingresso" }: Props) => {
  const { toast } = useToast();
  const platformFee = usePlatformFee();

  const [open, setOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", document: "" });
  const [submitting, setSubmitting] = useState(false);
  const [issued, setIssued] = useState<any | null>(null);
  const [alreadyHas, setAlreadyHas] = useState(false);
  const [soldOut, setSoldOut] = useState(false);

  const [eventMeta, setEventMeta] = useState<{ ticket_type: string; ticket_price_cents: number } | null>(null);

  const [pixCharge, setPixCharge] = useState<any | null>(null);
  const [pixOpen, setPixOpen] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data: ev } = await supabase.from("events").select("tickets_total, ticket_type, ticket_price_cents").eq("id", eventId).maybeSingle();
      const e = ev as any;
      setEventMeta({ ticket_type: e?.ticket_type || "free", ticket_price_cents: e?.ticket_price_cents || 0 });
      const total = e?.tickets_total as number | null;
      if (!total) { setSoldOut(false); return; }
      const { count } = await supabase
        .from("tickets" as any)
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .neq("status", "cancelled");
      setSoldOut((count || 0) >= total);
    };
    check();
    const ch = supabase
      .channel(`evt-${eventId}-sold`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "tickets", filter: `event_id=eq.${eventId}` }, () => check())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [eventId]);

  const isPaid = eventMeta?.ticket_type === "paid" && (eventMeta?.ticket_price_cents || 0) > 0;
  const totalCents = (eventMeta?.ticket_price_cents || 0) + platformFee;

  const openDialog = async () => {
    setOpen(true);
    setAuthChecked(false);
    setIssued(null);
    setAlreadyHas(false);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUserId(null); setAuthChecked(true); return; }
    setUserId(session.user.id);

    if (!isPaid) {
      const { data: existing } = await supabase
        .from("tickets" as any)
        .select("id, code, qr_token, status, holder_name, issued_at")
        .eq("event_id", eventId).eq("user_id", session.user.id).eq("status", "active").maybeSingle();
      if (existing) { setAlreadyHas(true); setIssued(existing); setAuthChecked(true); return; }
    }

    let name = "", phone = "";
    const { data: artist } = await supabase.from("artists").select("name, phone").eq("user_id", session.user.id).maybeSingle();
    if (artist) { name = (artist as any).name || ""; phone = (artist as any).phone || ""; }
    else {
      const { data: ent } = await supabase.from("entrepreneurs").select("name, phone").eq("user_id", session.user.id).maybeSingle();
      if (ent) { name = (ent as any).name || ""; phone = (ent as any).phone || ""; }
    }
    setForm({ name: name || (session.user.user_metadata?.name as string) || "", email: session.user.email || "", phone, document: "" });
    setAuthChecked(true);
  };

  const submitFree = async () => {
    if (!userId) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("tickets" as any)
        .insert({
          event_id: eventId, user_id: userId,
          holder_name: form.name.trim(), holder_email: form.email.trim(), holder_phone: form.phone.trim(),
        } as any)
        .select("id, code, qr_token, status, holder_name, issued_at").single();
      if (error) throw error;
      setIssued(data);
      toast({ title: "Ingresso gerado!", description: `Código ${(data as any).code}` });
      try {
        await downloadTicketPdf({
          code: (data as any).code, qrToken: (data as any).qr_token, holderName: form.name,
          eventTitle, eventDate, eventLocation, issuedAt: (data as any).issued_at,
        });
      } catch {}
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const submitPaid = async () => {
    if (!userId) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("misticpay-create-charge", {
        body: { event_id: eventId, buyer_name: form.name.trim(), buyer_email: form.email.trim(), buyer_phone: form.phone.trim(), buyer_document: form.document.replace(/\D+/g, "") },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setPixCharge(data);
      setPixOpen(true);
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Erro ao gerar PIX", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const submit = () => isPaid ? submitPaid() : submitFree();

  const close = () => { setOpen(false); setIssued(null); setAlreadyHas(false); };

  return (
    <>
      {soldOut ? (
        <Button size="lg" disabled variant="outline" className="gap-2"><Ticket className="h-5 w-5" />Esgotado</Button>
      ) : (
        <Button onClick={openDialog} size="lg" className="gap-2">
          <Ticket className="h-5 w-5" />
          {isPaid ? `Comprar Ingresso — ${centsToBRL(totalCents)}` : label}
        </Button>
      )}

      <Dialog open={open} onOpenChange={(v) => !v && close()}>
        <DialogContent>
          {!authChecked ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !userId ? (
            <>
              <DialogHeader>
                <DialogTitle>Faça login para continuar</DialogTitle>
                <DialogDescription>Você precisa de uma conta para {isPaid ? "comprar" : "resgatar"} ingresso.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <Link to="/login" className="flex-1"><Button variant="hero" className="w-full gap-2"><LogIn className="h-4 w-4" /> Entrar</Button></Link>
                <Link to="/cadastro" className="flex-1"><Button variant="outline" className="w-full gap-2"><UserPlus className="h-4 w-4" /> Cadastre-se</Button></Link>
              </div>
            </>
          ) : issued ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" />
                  {alreadyHas ? "Você já possui um ingresso" : "Ingresso gerado com sucesso!"}
                </DialogTitle>
                <DialogDescription>
                  {alreadyHas ? "Veja seu ingresso completo abaixo." : "Seu ingresso está pronto. O PDF foi baixado automaticamente."}
                </DialogDescription>
              </DialogHeader>
              <div className="my-4">
                <TicketCard code={issued.code} qrToken={issued.qr_token} status={issued.status}
                  holderName={issued.holder_name} eventTitle={eventTitle} eventDate={eventDate}
                  eventLocation={eventLocation} issuedAt={issued.issued_at} />
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Link to="/meu-perfil"><Button variant="hero">Ver Meus Ingressos</Button></Link>
                <Button variant="outline" onClick={close}>Fechar</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{isPaid ? "Comprar Ingresso" : "Resgatar Ingresso"}</DialogTitle>
                <DialogDescription>
                  {eventTitle ? <>Para <strong>{eventTitle}</strong>. </> : null}
                  {isPaid ? "Confirme seus dados para gerar o PIX." : "Confirme seus dados para gerar o ingresso gratuito."}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5"><Label>Nome completo *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required maxLength={120} /></div>
                <div className="space-y-1.5"><Label>E-mail *</Label><Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required maxLength={255} /></div>
                <div className="space-y-1.5"><Label>Telefone / WhatsApp *</Label><Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(91) 99999-9999" required maxLength={30} /></div>
                {isPaid && (
                  <div className="space-y-1.5"><Label>CPF *</Label><Input value={form.document} onChange={(e) => setForm(f => ({ ...f, document: e.target.value }))} placeholder="000.000.000-00" required maxLength={14} inputMode="numeric" /></div>
                )}

                {isPaid && (
                  <div className="bg-secondary/40 rounded-lg p-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Valor do Ingresso:</span><span className="font-medium">{centsToBRL(eventMeta!.ticket_price_cents)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Taxa de Serviço Amazônia Pop:</span><span className="font-medium">{centsToBRL(platformFee)}</span></div>
                    <div className="border-t border-border/60 pt-1.5 mt-1.5 flex justify-between"><span className="font-semibold">Total a Pagar:</span><span className="font-bold text-base">{centsToBRL(totalCents)}</span></div>
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4 gap-2 sm:gap-2">
                <Button variant="outline" onClick={close}>Cancelar</Button>
                <Button onClick={submit} disabled={submitting || !form.name.trim() || !form.email.trim() || !form.phone.trim() || (isPaid && form.document.replace(/\D+/g, "").length !== 11)} className="gap-2">
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isPaid ? "Gerar PIX" : "Confirmar Ingresso"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <PixPaymentDialog
        open={pixOpen}
        onClose={() => { setPixOpen(false); setPixCharge(null); }}
        charge={pixCharge}
        eventTitle={eventTitle}
      />
    </>
  );
};

export default TicketRedeemButton;
