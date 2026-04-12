import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, Clock, Eye } from "lucide-react";

interface PendingUpdate {
  id: string;
  entity_id: string;
  entity_type: "artist" | "entrepreneur";
  changes: Record<string, any>;
  status: string;
  admin_notes: string | null;
  created_at: string;
  entity_name?: string;
}

const fieldLabels: Record<string, string> = {
  bio: "Bio",
  city: "Cidade",
  instagram: "Instagram",
  youtube_url: "YouTube",
  profile_image_url: "Foto de Perfil",
  portfolio_images: "Portfólio",
  description: "Descrição Curta",
  full_description: "Descrição Completa",
  address: "Endereço",
  phone: "Telefone",
  hero_image_url: "Imagem Principal",
};

const AdminPendingUpdatesPanel = () => {
  const { toast } = useToast();
  const [updates, setUpdates] = useState<PendingUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadUpdates = async () => {
    setLoading(true);
    const allUpdates: PendingUpdate[] = [];

    // Load artist pending updates
    const { data: artistUpdates } = await supabase
      .from("artist_pending_updates")
      .select("*")
      .in("status", ["pending", "auto_approved", "approved"])
      .order("created_at", { ascending: true });

    if (artistUpdates && artistUpdates.length > 0) {
      const artistIds = [...new Set(artistUpdates.map((u: any) => u.artist_id))];
      const { data: artists } = await supabase
        .from("artists")
        .select("id, name")
        .in("id", artistIds);
      const nameMap = new Map(artists?.map(a => [a.id, a.name]) || []);

      for (const u of artistUpdates) {
        allUpdates.push({
          id: u.id,
          entity_id: u.artist_id,
          entity_type: "artist",
          changes: u.changes as Record<string, any>,
          status: u.status,
          admin_notes: u.admin_notes,
          created_at: u.created_at,
          entity_name: nameMap.get(u.artist_id) || "Desconhecido",
        });
      }
    }

    // Load entrepreneur pending updates
    const { data: entUpdates } = await supabase
      .from("entrepreneur_pending_updates")
      .select("*")
      .in("status", ["pending", "auto_approved", "approved"])
      .order("created_at", { ascending: true });

    if (entUpdates && entUpdates.length > 0) {
      const entIds = [...new Set(entUpdates.map((u) => u.entrepreneur_id))];
      const { data: entrepreneurs } = await supabase
        .from("entrepreneurs")
        .select("id, name")
        .in("id", entIds);
      const nameMap = new Map(entrepreneurs?.map(e => [e.id, e.name]) || []);

      for (const u of entUpdates) {
        allUpdates.push({
          id: u.id,
          entity_id: u.entrepreneur_id,
          entity_type: "entrepreneur",
          changes: u.changes as Record<string, any>,
          status: u.status,
          admin_notes: u.admin_notes,
          created_at: u.created_at,
          entity_name: nameMap.get(u.entrepreneur_id) || "Desconhecido",
        });
      }
    }

    allUpdates.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    setUpdates(allUpdates);
    setLoading(false);
  };

  useEffect(() => { loadUpdates(); }, []);

  const handleAction = async (update: PendingUpdate, action: "approved" | "rejected") => {
    setProcessingId(update.id);

    try {
      const updateData = {
        status: action,
        admin_notes: notes[update.id] || null,
        reviewed_at: new Date().toISOString(),
      };

      let error;
      if (update.entity_type === "artist") {
        const result = await supabase
          .from("artist_pending_updates")
          .update(updateData)
          .eq("id", update.id);
        error = result.error;
      } else {
        const result = await supabase
          .from("entrepreneur_pending_updates")
          .update(updateData)
          .eq("id", update.id);
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: action === "approved" ? "Atualização marcada como revisada" : "Atualização rejeitada",
      });

      loadUpdates();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (updates.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="h-10 w-10 mx-auto mb-3 opacity-40" />
        <p>Nenhuma atualização pendente</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Atualizações Pendentes ({updates.length})</h2>
      </div>

      {updates.map((update) => (
        <div key={update.id} className="bg-card rounded-xl border border-border overflow-hidden">
          <div
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors"
            onClick={() => setExpandedId(expandedId === update.id ? null : update.id)}
          >
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-500 shrink-0" />
              <div>
                <p className="font-semibold">
                  {update.entity_name}
                  <span className="ml-2 text-xs font-normal px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                    {update.entity_type === "artist" ? "Artista" : "Empreendedor"}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(update.created_at).toLocaleDateString("pt-BR", {
                    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                  })}
                  {" · "}
                  {Object.keys(update.changes).length} campo(s) alterado(s)
                </p>
              </div>
            </div>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </div>

          {expandedId === update.id && (
            <div className="border-t border-border p-4 space-y-4">
              <div className="space-y-3">
                <p className="text-sm font-medium">Alterações solicitadas:</p>
                {Object.entries(update.changes).map(([key, value]) => (
                  <div key={key} className="bg-secondary/50 rounded-lg p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      {fieldLabels[key] || key}
                    </p>
                    {(key === "profile_image_url" || key === "hero_image_url") && typeof value === "string" ? (
                      <img src={value} alt="Nova foto" className="w-20 h-20 rounded-lg object-cover" />
                    ) : key === "portfolio_images" && Array.isArray(value) ? (
                      <div className="flex gap-2 flex-wrap">
                        {value.map((img: string, i: number) => (
                          <img key={i} src={img} alt={`Portfolio ${i + 1}`} className="w-16 h-16 rounded-lg object-cover" />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm">{String(value) || <span className="text-muted-foreground italic">vazio</span>}</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Nota (opcional):</p>
                <Textarea
                  placeholder="Ex: A descrição precisa de revisão..."
                  value={notes[update.id] || ""}
                  onChange={e => setNotes(prev => ({ ...prev, [update.id]: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => handleAction(update, "approved")}
                  disabled={processingId === update.id}
                  className="bg-green-600 hover:bg-green-700 text-primary-foreground"
                >
                  {processingId === update.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Marcar como Revisado
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default AdminPendingUpdatesPanel;
