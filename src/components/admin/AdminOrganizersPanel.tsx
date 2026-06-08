import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, Clock, CheckCircle2, XCircle, Mail, Phone, Globe, Instagram, CalendarDays } from "lucide-react";

const AdminOrganizersPanel = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [eventsPending, setEventsPending] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: orgs }, { data: evs }] = await Promise.all([
      supabase.from("organizers").select("*").order("created_at", { ascending: false }),
      supabase.from("events").select("*, organizers(name, organization_name)").eq("approval_status", "pending").order("created_at", { ascending: false }),
    ]);
    setItems(orgs || []);
    setEventsPending(evs || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateOrganizer = async (id: string, status: "approved" | "rejected") => {
    let reason: string | null = null;
    if (status === "rejected") {
      reason = prompt("Motivo da rejeição (opcional):") || null;
    }
    const { error } = await supabase.from("organizers").update({
      approval_status: status,
      approved_at: status === "approved" ? new Date().toISOString() : null,
      rejection_reason: reason,
    }).eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }

    // Grant/revoke organizer role
    const org = items.find(o => o.id === id);
    if (org) {
      if (status === "approved") {
        await supabase.from("user_roles").upsert({ user_id: org.user_id, role: "organizer" as any }, { onConflict: "user_id,role" });
      } else {
        await supabase.from("user_roles").delete().eq("user_id", org.user_id).eq("role", "organizer" as any);
      }
    }
    toast({ title: status === "approved" ? "Organizador aprovado" : "Organizador rejeitado" });
    load();
  };

  const updateEvent = async (id: string, status: "approved" | "rejected") => {
    let reason: string | null = null;
    if (status === "rejected") reason = prompt("Motivo da rejeição (opcional):") || null;
    const { error } = await supabase.from("events").update({
      approval_status: status,
      published: status === "approved",
      rejection_reason: reason,
    }).eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: status === "approved" ? "Evento aprovado e publicado" : "Evento rejeitado" });
    load();
  };

  const StatusBadge = ({ status }: { status: string }) => {
    if (status === "approved") return <Badge className="bg-green-500/15 text-green-600 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" />Aprovado</Badge>;
    if (status === "rejected") return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejeitado</Badge>;
    return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-2xl font-bold mb-4">Eventos pendentes de aprovação</h2>
        {eventsPending.length === 0 ? (
          <p className="text-muted-foreground">Nenhum evento aguardando aprovação.</p>
        ) : (
          <div className="space-y-3">
            {eventsPending.map(e => (
              <div key={e.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-4">
                {e.image_url && <img src={e.image_url} className="w-16 h-16 rounded-lg object-cover" alt="" />}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold">{e.title}</h4>
                  <p className="text-xs text-muted-foreground">
                    {new Date(e.event_date).toLocaleString("pt-BR")} • {e.location}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Organizador: <strong>{e.organizers?.organization_name || "—"}</strong> ({e.organizers?.name})
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateEvent(e.id, "approved")} className="gap-1"><Check className="h-4 w-4" />Aprovar</Button>
                  <Button size="sm" variant="destructive" onClick={() => updateEvent(e.id, "rejected")} className="gap-1"><X className="h-4 w-4" />Rejeitar</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-4">Organizadores cadastrados</h2>
        {items.length === 0 ? (
          <p className="text-muted-foreground">Nenhum organizador cadastrado.</p>
        ) : (
          <div className="space-y-3">
            {items.map(o => (
              <div key={o.id} className="bg-card border border-border rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-lg">{o.organization_name}</h4>
                      <StatusBadge status={o.approval_status} />
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">Responsável: {o.name}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-muted-foreground">
                      <p className="flex items-center gap-1"><Mail className="h-3 w-3" />{o.email}</p>
                      <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{o.phone}</p>
                      {o.instagram && <p className="flex items-center gap-1"><Instagram className="h-3 w-3" />{o.instagram}</p>}
                      {o.website && <p className="flex items-center gap-1"><Globe className="h-3 w-3" />{o.website}</p>}
                      {o.document && <p className="flex items-center gap-1"><CalendarDays className="h-3 w-3" />Doc: {o.document}</p>}
                    </div>
                    {o.bio && <p className="text-sm mt-2 text-muted-foreground italic">"{o.bio}"</p>}
                    {o.rejection_reason && <p className="text-sm text-destructive mt-2">Motivo da rejeição: {o.rejection_reason}</p>}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {o.approval_status !== "approved" && (
                      <Button size="sm" onClick={() => updateOrganizer(o.id, "approved")} className="gap-1"><Check className="h-4 w-4" />Aprovar</Button>
                    )}
                    {o.approval_status !== "rejected" && (
                      <Button size="sm" variant="destructive" onClick={() => updateOrganizer(o.id, "rejected")} className="gap-1"><X className="h-4 w-4" />Rejeitar</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrganizersPanel;
