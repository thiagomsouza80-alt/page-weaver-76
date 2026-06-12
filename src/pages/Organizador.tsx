import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompression";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import AdminTicketValidationPanel from "@/components/admin/AdminTicketValidationPanel";
import OrganizerDashboard from "@/components/organizer/OrganizerDashboard";
import OrganizerFinancePanel from "@/components/organizer/OrganizerFinancePanel";
import OrganizerValidatorsPanel from "@/components/organizer/OrganizerValidatorsPanel";
import { Plus, Pencil, Trash2, Loader2, Ticket, Clock, CheckCircle2, XCircle, QrCode, LayoutDashboard, Wallet, Users } from "lucide-react";
import { centsToBRL, brlToCents, formatBRLInput } from "@/lib/money";
import { usePlatformFee } from "@/lib/platformFee";


const slugify = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "approved") return <Badge className="bg-green-500/15 text-green-600 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Aprovado</Badge>;
  if (status === "rejected") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
  return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
};

const OrganizadorPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organizer, setOrganizer] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [ticketsEnabled, setTicketsEnabled] = useState(false);
  const [ticketsTotal, setTicketsTotal] = useState<string>("");
  const [ticketType, setTicketType] = useState<"free" | "paid">("free");
  const [ticketPrice, setTicketPrice] = useState<string>("0,00");
  const platformFee = usePlatformFee();

  const load = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/login"); return; }
    const { data: org } = await supabase.from("organizers").select("*").eq("user_id", user.id).maybeSingle();
    setOrganizer(org);
    if (org) {
      const { data: evs } = await supabase.from("events").select("*").eq("organizer_id", org.id).order("event_date", { ascending: false });
      setEvents(evs || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resetForm = () => {
    setTitle(""); setDescription(""); setContent(""); setLocation(""); setEventDate("");
    setTicketsEnabled(false); setTicketsTotal(""); setImageFile(null); setEditing(null); setShowForm(false);
    setTicketType("free"); setTicketPrice("0,00");
  };

  const openEdit = (e: any) => {
    setEditing(e);
    setTitle(e.title); setDescription(e.description); setContent(e.content);
    setLocation(e.location); setEventDate(e.event_date.slice(0, 16));
    setTicketsEnabled(!!e.tickets_enabled);
    setTicketsTotal(e.tickets_total ? String(e.tickets_total) : "");
    setTicketType((e.ticket_type as "free" | "paid") || "free");
    setTicketPrice(formatBRLInput(e.ticket_price_cents || 0));
    setShowForm(true);
  };


  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!organizer) return;
    setSubmitting(true);
    try {
      let imageUrl = editing?.image_url || null;
      if (imageFile) {
        const compressed = await compressImage(imageFile);
        const ext = compressed.name.split(".").pop();
        const path = `org-${organizer.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("events").upload(path, compressed);
        if (upErr) throw upErr;
        imageUrl = supabase.storage.from("events").getPublicUrl(path).data.publicUrl;
      }

      const priceCents = ticketType === "paid" ? brlToCents(ticketPrice) : 0;
      if (ticketsEnabled && ticketType === "paid" && priceCents <= 0) {
        throw new Error("Defina um valor válido para o ingresso pago.");
      }

      const payload: any = {
        title,
        slug: slugify(title) + "-" + Date.now().toString(36),
        description,
        content,
        location,
        event_date: new Date(eventDate).toISOString(),
        image_url: imageUrl,
        tickets_enabled: ticketsEnabled,
        tickets_total: ticketsEnabled && ticketsTotal ? parseInt(ticketsTotal, 10) : null,
        ticket_type: ticketsEnabled ? ticketType : "free",
        ticket_price_cents: ticketsEnabled && ticketType === "paid" ? priceCents : 0,
        organizer_id: organizer.id,
      };

      if (editing) {
        // Edição volta para pendente
        const { error } = await supabase.from("events").update({
          ...payload, slug: editing.slug, approval_status: "pending", published: false,
        }).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Evento atualizado — aguardando nova aprovação." });
      } else {
        const { error } = await supabase.from("events").insert({
          ...payload, published: false, approval_status: "pending",
        });
        if (error) throw error;
        toast({ title: "Evento enviado para aprovação!" });
      }
      resetForm();
      load();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm("Excluir este evento?")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Evento excluído" });
    load();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!organizer) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 px-6 max-w-2xl mx-auto text-center">
          <h1 className="text-2xl font-bold mb-3">Você ainda não é um Organizador</h1>
          <p className="text-muted-foreground mb-6">Cadastre-se como organizador para publicar e gerenciar eventos.</p>
          <Button onClick={() => navigate("/cadastro")}>Fazer cadastro</Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold mb-1">Painel do Organizador</h1>
            <p className="text-muted-foreground">{organizer.organization_name}</p>
            <div className="mt-2"><StatusBadge status={organizer.approval_status} /></div>
            {organizer.approval_status === "rejected" && organizer.rejection_reason && (
              <p className="text-sm text-destructive mt-2">Motivo: {organizer.rejection_reason}</p>
            )}
          </div>
          {organizer.approval_status === "approved" && (
            <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
              <Plus className="h-4 w-4" /> Novo Evento
            </Button>
          )}
        </div>

        {organizer.approval_status === "pending" && (
          <div className="bg-secondary/40 border border-border rounded-xl p-6 text-center">
            <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-semibold">Seu cadastro está em análise</p>
            <p className="text-sm text-muted-foreground">Você poderá criar eventos assim que for aprovado pelo administrador.</p>
          </div>
        )}

        {organizer.approval_status === "approved" && (
          <Tabs defaultValue="dashboard" className="mt-6">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="dashboard" className="gap-2"><LayoutDashboard className="h-4 w-4" />Dashboard</TabsTrigger>
              <TabsTrigger value="eventos" className="gap-2"><Ticket className="h-4 w-4" />Meus Eventos</TabsTrigger>
              <TabsTrigger value="financeiro" className="gap-2"><Wallet className="h-4 w-4" />Financeiro</TabsTrigger>
              <TabsTrigger value="validadores" className="gap-2"><Users className="h-4 w-4" />Equipe de Validação</TabsTrigger>
              <TabsTrigger value="validar" className="gap-2"><QrCode className="h-4 w-4" />Validar Ingressos</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <OrganizerDashboard organizerId={organizer.id} />
            </TabsContent>

            <TabsContent value="financeiro" className="mt-6">
              <OrganizerFinancePanel organizerId={organizer.id} />
            </TabsContent>

            <TabsContent value="eventos" className="mt-6">
              {showForm && (
                <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 mb-8 space-y-5">
                  <h3 className="font-semibold text-lg">{editing ? "Editar Evento" : "Novo Evento"}</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2"><Label>Título *</Label><Input value={title} onChange={e => setTitle(e.target.value)} required /></div>
                    <div className="space-y-2"><Label>Data e Hora *</Label><Input type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} required /></div>
                  </div>
                  <div className="space-y-2"><Label>Local *</Label><Input value={location} onChange={e => setLocation(e.target.value)} required /></div>
                  <div className="space-y-2"><Label>Descrição curta *</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} required /></div>
                  <div className="space-y-2"><Label>Conteúdo completo *</Label><Textarea value={content} onChange={e => setContent(e.target.value)} rows={8} required /></div>
                  <div className="space-y-2"><Label>Imagem de capa</Label><Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} /></div>
                  <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-secondary/30">
                    <Ticket className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="te" className="cursor-pointer font-semibold">🎟️ Adquirir Ingresso</Label>
                        <Switch id="te" checked={ticketsEnabled} onCheckedChange={setTicketsEnabled} />
                      </div>
                      <p className="text-xs text-muted-foreground">Ative para habilitar ingressos (gratuitos ou pagos).</p>
                      {ticketsEnabled && (
                        <>
                          <div className="space-y-1.5 pt-2">
                            <Label className="text-sm">Tipo de Evento *</Label>
                            <div className="flex gap-2">
                              <Button type="button" size="sm" variant={ticketType === "free" ? "default" : "outline"} onClick={() => setTicketType("free")}>Gratuito</Button>
                              <Button type="button" size="sm" variant={ticketType === "paid" ? "default" : "outline"} onClick={() => setTicketType("paid")}>Pago</Button>
                            </div>
                          </div>
                          {ticketType === "paid" && (
                            <div className="space-y-1.5 pt-2">
                              <Label htmlFor="tp" className="text-sm">Valor do Ingresso (R$) *</Label>
                              <Input id="tp" value={ticketPrice} onChange={e => setTicketPrice(e.target.value)} placeholder="30,00" required />
                              <div className="bg-card border border-border rounded-lg p-3 text-xs space-y-1 mt-2">
                                <div className="flex justify-between"><span className="text-muted-foreground">Valor do Ingresso:</span><span className="font-medium">{centsToBRL(brlToCents(ticketPrice))}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">Taxa Amazônia Pop:</span><span className="font-medium">{centsToBRL(platformFee)}</span></div>
                                <div className="border-t border-border/60 pt-1 mt-1 flex justify-between"><span className="font-semibold">Valor Final ao Comprador:</span><span className="font-bold">{centsToBRL(brlToCents(ticketPrice) + platformFee)}</span></div>
                              </div>
                            </div>
                          )}
                          <div className="space-y-1.5 pt-2">
                            <Label htmlFor="tt" className="text-sm">Quantidade Total de Ingressos *</Label>
                            <Input id="tt" type="number" min={1} step={1} value={ticketsTotal} onChange={e => setTicketsTotal(e.target.value)} placeholder="Ex: 500" required />
                            <p className="text-xs text-muted-foreground">Ao atingir o limite, o evento é marcado como esgotado.</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">⚠️ Após salvar, o evento será enviado para aprovação do administrador antes de aparecer publicamente.</p>
                  <div className="flex gap-3">
                    <Button type="submit" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (editing ? "Salvar" : "Enviar para aprovação")}</Button>
                    <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
                  </div>
                </form>
              )}

              <h2 className="text-xl font-semibold mb-4">Meus Eventos</h2>
              {events.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">Você ainda não criou nenhum evento.</p>
              ) : (
                <div className="space-y-3">
                  {events.map(item => (
                    <div key={item.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
                      {item.image_url && <img src={item.image_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm truncate">{item.title}</h4>
                        <p className="text-xs text-muted-foreground">{new Date(item.event_date).toLocaleDateString("pt-BR")} • {item.location}</p>
                        <div className="flex gap-2 mt-2 items-center">
                          <StatusBadge status={item.approval_status} />
                          {item.published && item.approval_status === "approved" && (
                            <Badge variant="outline" className="text-xs">Publicado</Badge>
                          )}
                          {item.tickets_enabled && (
                            <Badge variant="outline" className="text-xs gap-1"><Ticket className="h-3 w-3" />Ingressos</Badge>
                          )}
                        </div>
                        {item.approval_status === "rejected" && item.rejection_reason && (
                          <p className="text-xs text-destructive mt-1">Motivo: {item.rejection_reason}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteEvent(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="validadores" className="mt-6">
              <OrganizerValidatorsPanel organizerId={organizer.id} organizerUserId={organizer.user_id} />
            </TabsContent>

            <TabsContent value="validar" className="mt-6">
              <AdminTicketValidationPanel />
            </TabsContent>
          </Tabs>
        )}

      </div>
      <Footer />
    </div>
  );
};

export default OrganizadorPage;
