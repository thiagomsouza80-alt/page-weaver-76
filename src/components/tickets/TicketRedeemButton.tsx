import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Ticket, Loader2, CheckCircle, LogIn, UserPlus, Accessibility, UserRound, HeartHandshake, Gift, ArrowLeft, Package, Plus, Minus,
} from "lucide-react";
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

type Category = {
  id: string; event_id: string; batch_id: string | null;
  kind: "full" | "half" | "solidarity" | "pcd" | "elderly" | "courtesy";
  name: string; description: string | null;
  price_cents: number; is_free: boolean; quantity: number | null;
  per_user_limit: number; sale_starts_at: string | null; sale_ends_at: string | null;
  is_active: boolean; requires_document: boolean; requires_donation: boolean;
  donation_description: string | null; sort_order: number;
};

type Batch = {
  id: string; name: string; price_cents: number;
  starts_at: string | null; ends_at: string | null; is_active: boolean;
  quantity: number | null;
};

const KIND_ICON: Record<Category["kind"], any> = {
  full: Ticket, half: Ticket, solidarity: HeartHandshake,
  pcd: Accessibility, elderly: UserRound, courtesy: Gift,
};
const KIND_LABEL: Record<Category["kind"], string> = {
  full: "Inteira", half: "Meia-Entrada", solidarity: "Solidário",
  pcd: "PCD", elderly: "Idoso", courtesy: "Cortesia",
};

const isBatchActive = (b?: Batch | null) => {
  if (!b || !b.is_active) return false;
  const now = Date.now();
  if (b.starts_at && new Date(b.starts_at).getTime() > now) return false;
  if (b.ends_at && new Date(b.ends_at).getTime() < now) return false;
  return true;
};

const isCategorySellable = (c: Category, batches: Batch[]) => {
  if (!c.is_active) return false;
  const now = Date.now();
  if (c.sale_starts_at && new Date(c.sale_starts_at).getTime() > now) return false;
  if (c.sale_ends_at && new Date(c.sale_ends_at).getTime() < now) return false;
  if (c.batch_id) {
    const b = batches.find((x) => x.id === c.batch_id);
    if (!isBatchActive(b)) return false;
  }
  return true;
};

const TicketRedeemButton = ({ eventId, eventTitle, eventDate, eventLocation, label = "Adquirir Ingresso" }: Props) => {
  const { toast } = useToast();
  const platformFee = usePlatformFee();

  const [open, setOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", document: "" });
  const [submitting, setSubmitting] = useState(false);
  const [issued, setIssued] = useState<any | null>(null);
  const [soldOut, setSoldOut] = useState(false);

  const [eventMeta, setEventMeta] = useState<{ ticket_type: string; ticket_price_cents: number } | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [available, setAvailable] = useState<Record<string, number | null>>({});
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);
  const [acceptDoc, setAcceptDoc] = useState(false);
  const [acceptDonation, setAcceptDonation] = useState(false);
  const [courtesyCode, setCourtesyCode] = useState("");

  const [pixCharge, setPixCharge] = useState<any | null>(null);
  const [pixOpen, setPixOpen] = useState(false);

  const hasCategories = categories.length > 0;

  const loadAvailability = async (cats: Category[]) => {
    const entries = await Promise.all(
      cats.map(async (c) => {
        const { data } = await supabase.rpc("event_category_available" as any, { _category_id: c.id });
        return [c.id, (data as number | null) ?? null] as const;
      }),
    );
    setAvailable(Object.fromEntries(entries));
  };

  const load = async () => {
    const [{ data: ev }, { data: cs }, { data: bs }] = await Promise.all([
      supabase.from("events").select("tickets_total, ticket_type, ticket_price_cents").eq("id", eventId).maybeSingle(),
      supabase.from("event_ticket_categories" as any).select("*").eq("event_id", eventId).eq("is_active", true).order("sort_order"),
      supabase.from("event_ticket_batches" as any).select("*").eq("event_id", eventId).order("sort_order"),
    ]);
    const e = ev as any;
    setEventMeta({ ticket_type: e?.ticket_type || "free", ticket_price_cents: e?.ticket_price_cents || 0 });
    const cats = ((cs as any[]) || []) as Category[];
    setCategories(cats);
    setBatches(((bs as any[]) || []) as Batch[]);

    const total = e?.tickets_total as number | null;
    if (total) {
      const { count } = await supabase
        .from("tickets" as any)
        .select("id", { count: "exact", head: true })
        .eq("event_id", eventId)
        .neq("status", "cancelled");
      setSoldOut((count || 0) >= total);
    } else {
      setSoldOut(false);
    }

    if (cats.length > 0) await loadAvailability(cats);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`evt-${eventId}-sold`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets", filter: `event_id=eq.${eventId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "event_ticket_categories", filter: `event_id=eq.${eventId}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "event_ticket_batches", filter: `event_id=eq.${eventId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const isLegacyPaid = !hasCategories && eventMeta?.ticket_type === "paid" && (eventMeta?.ticket_price_cents || 0) > 0;
  const legacyTotalCents = (eventMeta?.ticket_price_cents || 0) + platformFee;

  const catUnitCents = (c: Category) => (c.is_free ? 0 : c.price_cents);
  const catFeeCents = (c: Category) => (c.is_free || c.kind === "courtesy" ? 0 : platformFee);
  const catTotalCents = (c: Category) => catUnitCents(c) + catFeeCents(c);

  const fetchProfileFields = async (uid: string, email: string) => {
    let name = "", phone = "";
    const { data: artist } = await supabase.from("artists").select("name, phone").eq("user_id", uid).maybeSingle();
    if (artist) { name = (artist as any).name || ""; phone = (artist as any).phone || ""; }
    else {
      const { data: ent } = await supabase.from("entrepreneurs").select("name, phone").eq("user_id", uid).maybeSingle();
      if (ent) { name = (ent as any).name || ""; phone = (ent as any).phone || ""; }
    }
    return { name, email, phone };
  };

  const openDialog = async () => {
    setOpen(true);
    setAuthChecked(false);
    setIssued(null);
    setSelectedCat(null);
    setAcceptDoc(false);
    setAcceptDonation(false);
    setCourtesyCode("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setUserId(null); setAuthChecked(true); return; }
    setUserId(session.user.id);
    const f = await fetchProfileFields(session.user.id, session.user.email || "");
    setForm({ name: f.name || (session.user.user_metadata?.name as string) || "", email: f.email, phone: f.phone, document: "" });
    setAuthChecked(true);
  };

  const selectCategory = (c: Category) => {
    setSelectedCat(c);
    setAcceptDoc(false);
    setAcceptDonation(false);
    setCourtesyCode("");
  };

  const goBack = () => {
    setSelectedCat(null);
    setAcceptDoc(false);
    setAcceptDonation(false);
    setCourtesyCode("");
  };

  const submitFreeOrCourtesy = async (c: Category) => {
    if (!userId) return;
    setSubmitting(true);
    try {
      let ticketId: string;
      if (c.kind === "courtesy" && courtesyCode.trim()) {
        const { data, error } = await supabase.rpc("redeem_courtesy_code" as any, {
          _code: courtesyCode.trim(),
          _holder_name: form.name.trim(),
          _holder_email: form.email.trim(),
          _holder_phone: form.phone.trim(),
        });
        if (error) throw error;
        ticketId = data as string;
      } else {
        const { data, error } = await supabase
          .from("tickets" as any)
          .insert({
            event_id: eventId, user_id: userId,
            holder_name: form.name.trim(), holder_email: form.email.trim(), holder_phone: form.phone.trim(),
            category_id: c.id,
          } as any)
          .select("id").single();
        if (error) throw error;
        ticketId = (data as any).id;
      }
      const { data: tk } = await supabase
        .from("tickets" as any)
        .select("id, code, qr_token, status, holder_name, issued_at")
        .eq("id", ticketId).single();
      setIssued(tk);
      toast({ title: "Ingresso gerado!", description: `Código ${(tk as any).code}` });
      try {
        await downloadTicketPdf({
          code: (tk as any).code, qrToken: (tk as any).qr_token, holderName: form.name,
          eventTitle, eventDate, eventLocation, issuedAt: (tk as any).issued_at,
        });
      } catch {}
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const submitPaid = async (c: Category | null) => {
    if (!userId) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("misticpay-create-charge", {
        body: {
          event_id: eventId,
          category_id: c?.id ?? null,
          buyer_name: form.name.trim(),
          buyer_email: form.email.trim(),
          buyer_phone: form.phone.trim(),
          buyer_document: form.document.replace(/\D+/g, ""),
        },
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

  const submitLegacy = async () => {
    if (!userId) return;
    if (isLegacyPaid) return submitPaid(null);
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

  const submitSelected = () => {
    if (!selectedCat) return;
    const c = selectedCat;
    if (c.is_free || c.kind === "courtesy") return submitFreeOrCourtesy(c);
    return submitPaid(c);
  };

  const close = () => { setOpen(false); setIssued(null); setSelectedCat(null); };

  const canSubmitSelected = useMemo(() => {
    if (!selectedCat) return false;
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) return false;
    if (selectedCat.requires_document && !acceptDoc) return false;
    if (selectedCat.requires_donation && !acceptDonation) return false;
    const needsCpf = !selectedCat.is_free && selectedCat.kind !== "courtesy";
    if (needsCpf && form.document.replace(/\D+/g, "").length !== 11) return false;
    // Cortesia: público SEMPRE precisa de código válido (atribuição direta só é feita pelo organizador no painel)
    if (selectedCat.kind === "courtesy" && !courtesyCode.trim()) return false;
    return true;
  }, [selectedCat, form, acceptDoc, acceptDonation, courtesyCode]);

  const sellable = useMemo(
    () => categories.map((c) => ({ c, ok: isCategorySellable(c, batches), left: available[c.id] })),
    [categories, batches, available],
  );

  const buttonLabel = hasCategories
    ? "Ver ingressos"
    : isLegacyPaid ? `Comprar Ingresso — ${centsToBRL(legacyTotalCents)}` : label;

  return (
    <>
      {soldOut ? (
        <Button size="lg" disabled variant="outline" className="gap-2"><Ticket className="h-5 w-5" />Esgotado</Button>
      ) : (
        <Button onClick={openDialog} size="lg" className="gap-2">
          <Ticket className="h-5 w-5" />
          {buttonLabel}
        </Button>
      )}

      <Dialog open={open} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {!authChecked ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : !userId ? (
            <>
              <DialogHeader>
                <DialogTitle>Faça login para continuar</DialogTitle>
                <DialogDescription>Você precisa de uma conta para adquirir ingresso.</DialogDescription>
              </DialogHeader>
              <div className="flex flex-col sm:flex-row gap-3 mt-4">
                <Link to="/login" className="flex-1"><Button variant="hero" className="w-full gap-2"><LogIn className="h-4 w-4" /> Entrar</Button></Link>
                <Link to="/cadastro" className="flex-1"><Button variant="outline" className="w-full gap-2"><UserPlus className="h-4 w-4" /> Cadastre-se</Button></Link>
              </div>
            </>
          ) : issued ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-500" />Ingresso gerado!</DialogTitle>
                <DialogDescription>Seu ingresso está pronto. O PDF foi baixado automaticamente.</DialogDescription>
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
          ) : hasCategories && !selectedCat ? (
            <>
              <DialogHeader>
                <DialogTitle>Escolha a modalidade</DialogTitle>
                <DialogDescription>{eventTitle ? <>Para <strong>{eventTitle}</strong>.</> : null}</DialogDescription>
              </DialogHeader>
              <div className="space-y-3 mt-2">
                {sellable.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhuma modalidade disponível no momento.</p>
                )}
                {sellable.map(({ c, ok, left }) => {
                  const Icon = KIND_ICON[c.kind];
                  const linkedBatch = c.batch_id ? batches.find((b) => b.id === c.batch_id) : null;
                  const soldOutCat = left !== null && left !== undefined && left <= 0;
                  const disabled = !ok || soldOutCat;
                  return (
                    <Card key={c.id} className={disabled ? "opacity-60" : "hover:border-primary/50 transition"}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="h-4 w-4 text-primary shrink-0" />
                              <span className="font-semibold truncate">{c.name}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                              <Badge variant="outline" className="text-[10px]">{KIND_LABEL[c.kind]}</Badge>
                              {linkedBatch && <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]" variant="outline">{linkedBatch.name}</Badge>}
                              {c.requires_document && <Badge className="bg-yellow-500/15 text-yellow-700 border-yellow-500/30 text-[10px]" variant="outline">📄 Doc</Badge>}
                              {c.requires_donation && <Badge className="bg-orange-500/15 text-orange-700 border-orange-500/30 text-[10px]" variant="outline">🎁 Doação</Badge>}
                              {left !== null && left !== undefined && !soldOutCat && (
                                <Badge variant="outline" className="text-[10px]">{left} restantes</Badge>
                              )}
                            </div>
                            {c.description && <p className="text-xs text-muted-foreground mb-1">{c.description}</p>}
                            {c.requires_donation && c.donation_description && (
                              <p className="text-xs text-orange-700">Doação: {c.donation_description}</p>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-bold text-base">
                              {c.is_free || c.kind === "courtesy" ? "Grátis" : centsToBRL(c.price_cents)}
                            </div>
                            {!c.is_free && c.kind !== "courtesy" && (
                              <div className="text-[10px] text-muted-foreground">+ {centsToBRL(platformFee)} taxa</div>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm" className="w-full mt-3" disabled={disabled}
                          onClick={() => selectCategory(c)}
                        >
                          {soldOutCat ? "Esgotado" : !ok ? "Indisponível" : "Selecionar"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              <DialogFooter><Button variant="outline" onClick={close}>Cancelar</Button></DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  {hasCategories && selectedCat && (
                    <Button size="icon" variant="ghost" onClick={goBack} className="h-7 w-7 -ml-1"><ArrowLeft className="h-4 w-4" /></Button>
                  )}
                  <DialogTitle>
                    {selectedCat
                      ? (selectedCat.is_free || selectedCat.kind === "courtesy" ? `Resgatar — ${selectedCat.name}` : `Comprar — ${selectedCat.name}`)
                      : (isLegacyPaid ? "Comprar Ingresso" : "Resgatar Ingresso")}
                  </DialogTitle>
                </div>
                <DialogDescription>
                  {eventTitle ? <>Para <strong>{eventTitle}</strong>. </> : null}
                  Confirme seus dados.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-1.5"><Label>Nome completo *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} required maxLength={120} /></div>
                <div className="space-y-1.5"><Label>E-mail *</Label><Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required maxLength={255} /></div>
                <div className="space-y-1.5"><Label>Telefone / WhatsApp *</Label><Input value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(91) 99999-9999" required maxLength={30} /></div>

                {((selectedCat && !selectedCat.is_free && selectedCat.kind !== "courtesy") || (!selectedCat && isLegacyPaid)) && (
                  <div className="space-y-1.5"><Label>CPF *</Label><Input value={form.document} onChange={(e) => setForm(f => ({ ...f, document: e.target.value }))} placeholder="000.000.000-00" required maxLength={14} inputMode="numeric" /></div>
                )}

                {selectedCat?.kind === "courtesy" && (
                  <div className="space-y-1.5">
                    <Label>Código de cortesia *</Label>
                    <Input value={courtesyCode} onChange={(e) => setCourtesyCode(e.target.value.toUpperCase())} placeholder="CRT-XXXXXXXX" maxLength={40} required />
                    <p className="text-[11px] text-muted-foreground">Informe o código recebido do organizador. Cortesias sem código são atribuídas diretamente pelo organizador no painel e aparecem em "Meus Ingressos".</p>
                  </div>
                )}

                {selectedCat?.requires_document && (
                  <label className="flex items-start gap-2 text-sm bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 cursor-pointer">
                    <Checkbox checked={acceptDoc} onCheckedChange={(v) => setAcceptDoc(!!v)} className="mt-0.5" />
                    <span>Estou ciente de que devo apresentar <strong>documento comprobatório</strong> na entrada do evento. A entrada poderá ser negada caso eu não comprove.</span>
                  </label>
                )}
                {selectedCat?.requires_donation && (
                  <label className="flex items-start gap-2 text-sm bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 cursor-pointer">
                    <Checkbox checked={acceptDonation} onCheckedChange={(v) => setAcceptDonation(!!v)} className="mt-0.5" />
                    <span>Vou levar a doação <strong>({selectedCat.donation_description || "conforme orientação"})</strong> na entrada do evento.</span>
                  </label>
                )}

                {selectedCat && !selectedCat.is_free && selectedCat.kind !== "courtesy" && (
                  <div className="bg-secondary/40 rounded-lg p-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Ingresso:</span><span className="font-medium">{centsToBRL(selectedCat.price_cents)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Taxa de Serviço:</span><span className="font-medium">{centsToBRL(platformFee)}</span></div>
                    <div className="border-t border-border/60 pt-1.5 mt-1.5 flex justify-between"><span className="font-semibold">Total a Pagar:</span><span className="font-bold text-base">{centsToBRL(catTotalCents(selectedCat))}</span></div>
                  </div>
                )}

                {!selectedCat && isLegacyPaid && (
                  <div className="bg-secondary/40 rounded-lg p-3 space-y-1 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Valor do Ingresso:</span><span className="font-medium">{centsToBRL(eventMeta!.ticket_price_cents)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Taxa de Serviço:</span><span className="font-medium">{centsToBRL(platformFee)}</span></div>
                    <div className="border-t border-border/60 pt-1.5 mt-1.5 flex justify-between"><span className="font-semibold">Total a Pagar:</span><span className="font-bold text-base">{centsToBRL(legacyTotalCents)}</span></div>
                  </div>
                )}
              </div>
              <DialogFooter className="mt-4 gap-2 sm:gap-2">
                <Button variant="outline" onClick={close}>Cancelar</Button>
                <Button
                  onClick={selectedCat ? submitSelected : submitLegacy}
                  disabled={
                    submitting ||
                    (selectedCat
                      ? !canSubmitSelected
                      : !form.name.trim() || !form.email.trim() || !form.phone.trim() ||
                        (isLegacyPaid && form.document.replace(/\D+/g, "").length !== 11))
                  }
                  className="gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {(selectedCat && !selectedCat.is_free && selectedCat.kind !== "courtesy") || (!selectedCat && isLegacyPaid)
                    ? "Gerar PIX"
                    : "Confirmar Ingresso"}
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
