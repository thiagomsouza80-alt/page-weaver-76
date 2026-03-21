import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Instagram, Eye, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

type Artist = Tables<"artists">;

const segmentLabels: Record<string, string> = {
  cosplayer: "Cosplayer",
  cosmaker: "Cosmaker",
  kpop: "K-Pop",
  ilustrador: "Ilustrador",
  empreendedor: "Empreendedor",
};

const ArtistPreview = ({ artist, onClose }: { artist: Artist; onClose: () => void }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 relative animate-fade-up"
        onClick={e => e.stopPropagation()}
      >
        <Button variant="ghost" size="icon" className="absolute top-3 right-3" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>

        <div className="flex flex-col sm:flex-row gap-6 mb-6">
          {artist.profile_image_url ? (
            <img src={artist.profile_image_url} alt={artist.name} className="w-32 h-32 rounded-xl object-cover shrink-0" />
          ) : (
            <div className="w-32 h-32 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <span className="text-3xl font-bold text-muted-foreground">{artist.name[0]}</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <span className="text-xs font-semibold px-3 py-1 rounded-md bg-primary/10 text-primary mb-2 inline-block">
              {segmentLabels[artist.segment] || artist.segment}
            </span>
            <h2 className="text-2xl font-bold mb-1">{artist.name}</h2>
            <p className="text-sm text-muted-foreground mb-1">{artist.city || "Sem cidade"}</p>
            <p className="text-sm text-muted-foreground">{artist.email}</p>
            {artist.instagram && (
              <p className="flex items-center gap-1.5 text-sm text-primary mt-2">
                <Instagram className="h-4 w-4" /> {artist.instagram}
              </p>
            )}
          </div>
        </div>

        {artist.bio && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-2 text-muted-foreground uppercase tracking-wider">Bio</h3>
            <p className="text-foreground/85 leading-relaxed whitespace-pre-wrap">{artist.bio}</p>
          </div>
        )}

        {artist.portfolio_images && artist.portfolio_images.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Portfólio</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {artist.portfolio_images.map((img, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden">
                  <img src={img} alt={`Portfólio ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminArtistsPanel = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewArtist, setPreviewArtist] = useState<Artist | null>(null);

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
                <Button variant="ghost" size="icon" onClick={() => setPreviewArtist(item)} title="Visualizar perfil">
                  <Eye className="h-4 w-4 text-primary" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => toggleApproval(item)} title={item.approved ? "Desaprovar" : "Aprovar"}>
                  {item.approved ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewArtist && (
        <ArtistPreview artist={previewArtist} onClose={() => setPreviewArtist(null)} />
      )}
    </div>
  );
};

export default AdminArtistsPanel;
