import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Instagram } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Artist = Tables<"artists">;

const segmentLabels: Record<string, string> = {
  cosplayer: "Cosplayer",
  cosmaker: "Cosmaker",
  kpop: "K-Pop",
  ilustrador: "Ilustrador",
  empreendedor: "Empreendedor",
};

const AdminArtistsPanel = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    const { data } = await supabase.from("artists").select("*").order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const toggleApproval = async (item: Artist) => {
    await supabase.from("artists").update({ approved: !item.approved }).eq("id", item.id);
    fetchItems();
    toast({ title: item.approved ? "Artista desaprovado" : "Artista aprovado!" });
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-8">Artistas Cadastrados</h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum artista cadastrado.</p>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
              {item.profile_image_url ? (
                <img src={item.profile_image_url} alt={item.name} className="w-14 h-14 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center shrink-0">
                  <span className="text-lg font-bold text-muted-foreground">{item.name[0]}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">{item.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {segmentLabels[item.segment]} • {item.city || "Sem cidade"} • {item.email}
                </p>
                {item.instagram && (
                  <span className="text-xs text-primary flex items-center gap-1 mt-0.5">
                    <Instagram className="h-3 w-3" /> {item.instagram}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs font-medium px-2 py-1 rounded-md ${item.approved ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}>
                  {item.approved ? "Aprovado" : "Pendente"}
                </span>
                <Button variant="ghost" size="icon" onClick={() => toggleApproval(item)} title={item.approved ? "Desaprovar" : "Aprovar"}>
                  {item.approved ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminArtistsPanel;
