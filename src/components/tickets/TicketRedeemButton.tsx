import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Ticket, Loader2, CheckCircle, LogIn, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TicketCard from "./TicketCard";
import { downloadTicketPdf } from "@/lib/ticketPdf";


interface Props {
  eventId: string;
  eventTitle?: string;
  label?: string;
}

const TicketRedeemButton = ({ eventId, eventTitle, label = "Adquirir Ingresso" }: Props) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [issued, setIssued] = useState<{ code: string } | null>(null);
  const [alreadyHas, setAlreadyHas] = useState(false);

  const openDialog = async () => {
    setOpen(true);
    setAuthChecked(false);
    setIssued(null);
    setAlreadyHas(false);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setUserId(null);
      setAuthChecked(true);
      return;
    }
    setUserId(session.user.id);

    // Já possui ingresso ativo?
    const { data: existing } = await supabase
      .from("tickets" as any)
      .select("code")
      .eq("event_id", eventId)
      .eq("user_id", session.user.id)
      .eq("status", "active")
      .maybeSingle();
    if (existing) {
      setAlreadyHas(true);
      setIssued({ code: (existing as any).code });
      setAuthChecked(true);
      return;
    }

    // Pré-preencher
    let name = "";
    let phone = "";
    const { data: artist } = await supabase
      .from("artists")
      .select("name, phone")
      .eq("user_id", session.user.id)
      .maybeSingle();
    if (artist) {
      name = (artist as any).name || "";
      phone = (artist as any).phone || "";
    } else {
      const { data: ent } = await supabase
        .from("entrepreneurs")
        .select("name, phone")
        .eq("user_id", session.user.id)
        .maybeSingle();
      if (ent) {
        name = (ent as any).name || "";
        phone = (ent as any).phone || "";
      }
    }
    setForm({
      name: name || (session.user.user_metadata?.name as string) || "",
      email: session.user.email || "",
      phone,
    });
    setAuthChecked(true);
  };

  const submit = async () => {
    if (!userId) return;
    const name = form.name.trim();
    const email = form.email.trim();
    const phone = form.phone.trim();
    if (!name || !email || !phone) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from("tickets" as any)
        .insert({
          event_id: eventId,
          user_id: userId,
          holder_name: name,
          holder_email: email,
          holder_phone: phone,
        } as any)
        .select("code")
        .single();
      if (error) throw error;
      setIssued({ code: (data as any).code });
      toast({ title: "Ingresso gerado!", description: `Código ${(data as any).code}` });
    } catch (e: any) {
      toast({ title: "Erro ao gerar ingresso", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    setOpen(false);
    setIssued(null);
    setAlreadyHas(false);
  };

  return (
    <>
      <Button onClick={openDialog} size="lg" className="gap-2">
        <Ticket className="h-5 w-5" />
        {label}
      </Button>

      <Dialog open={open} onOpenChange={(v) => !v && close()}>
        <DialogContent>
          {!authChecked ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : !userId ? (
            <>
              <DialogHeader>
                <DialogTitle>Faça login para resgatar seu ingresso</DialogTitle>
                <DialogDescription>
                  É necessário possuir uma conta para garantir seu ingresso gratuito. Entre ou crie uma conta agora.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <Link to="/login" className="flex-1">
                  <Button variant="hero" className="w-full gap-2">
                    <LogIn className="h-4 w-4" /> Entrar
                  </Button>
                </Link>
                <Link to="/cadastro" className="flex-1">
                  <Button variant="outline" className="w-full gap-2">
                    <UserPlus className="h-4 w-4" /> Cadastre-se
                  </Button>
                </Link>
              </div>
            </>
          ) : issued ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  {alreadyHas ? "Você já possui um ingresso" : "Ingresso gerado!"}
                </DialogTitle>
                <DialogDescription>
                  {alreadyHas
                    ? "Você já resgatou um ingresso para este evento. Veja em 'Meus Ingressos'."
                    : 'Guarde o código abaixo. O ingresso completo está em "Meus Ingressos".'}
                </DialogDescription>
              </DialogHeader>
              <div className="my-4 p-6 rounded-xl bg-secondary text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Código do Ingresso</p>
                <p className="text-3xl font-bold tracking-widest mt-2">{issued.code}</p>
              </div>
              <DialogFooter className="gap-2 sm:gap-2">
                <Link to="/meu-perfil">
                  <Button variant="hero">Ver Meus Ingressos</Button>
                </Link>
                <Button variant="outline" onClick={close}>Fechar</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Resgatar Ingresso</DialogTitle>
                <DialogDescription>
                  {eventTitle ? <>Para <strong>{eventTitle}</strong>. </> : null}
                  Confirme seus dados para gerar o ingresso gratuito.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label>Nome completo *</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required maxLength={120} />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail *</Label>
                  <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required maxLength={255} />
                </div>
                <div className="space-y-1.5">
                  <Label>Telefone / WhatsApp *</Label>
                  <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} placeholder="(91) 99999-9999" required maxLength={30} />
                </div>
              </div>
              <DialogFooter className="mt-4 gap-2 sm:gap-2">
                <Button variant="outline" onClick={close}>Cancelar</Button>
                <Button
                  onClick={submit}
                  disabled={submitting || !form.name.trim() || !form.email.trim() || !form.phone.trim()}
                  className="gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmar Ingresso
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TicketRedeemButton;
