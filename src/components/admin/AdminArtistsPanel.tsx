import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Instagram, Eye, X, Pencil, Trash2 } from "lucide-react";
import { membershipTypes, getMembershipBadge } from "@/lib/membership";
import type { Tables } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

type Artist = Tables<"artists">;
type ArtistSegment = Database["public"]["Enums"]["artist_segment"];

const segmentLabels: Record<string, string> = {
  cosplayer: "Cosplayer",
  cosmaker: "Cosmaker",
  kpop: "K-Pop",
  ilustrador: "Ilustrador",
  quadrinista: "Quadrinista",
  colecionador: "Colecionador",
  desenvolvedor_jogos: "Desenvolvedor de Jogos",
  fan_cultura_pop: "Fã de Cultura Pop",
  youtuber: "YouTuber",
  influenciador_digital: "Influenciador Digital",
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
            {artist.phone && (
              <p className="text-sm text-muted-foreground">📱 {artist.phone}</p>
            )}
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

interface EditFormData {
  name: string;
  email: string;
  segment: ArtistSegment;
  city: string;
  instagram: string;
  bio: string;
  profile_image_url: string;
  portfolio_images: string[];
  membership_type: string;
}

const ArtistEditModal = ({ artist, onClose, onSave }: { artist: Artist; onClose: () => void; onSave: () => void }) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditFormData>({
    name: artist.name,
    email: artist.email,
    segment: artist.segment,
    city: artist.city || "",
    instagram: artist.instagram || "",
    bio: artist.bio || "",
    profile_image_url: artist.profile_image_url || "",
    portfolio_images: artist.portfolio_images || [],
    membership_type: (artist as any).membership_type || "free",
  });

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast({ title: "Nome e email são obrigatórios", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("artists").update({
      name: form.name.trim(),
      email: form.email.trim(),
      segment: form.segment,
      city: form.city.trim() || null,
      instagram: form.instagram.trim() || null,
      bio: form.bio.trim() || null,
      profile_image_url: form.profile_image_url.trim() || null,
      portfolio_images: form.portfolio_images.length > 0 ? form.portfolio_images : null,
      membership_type: form.membership_type,
    }).eq("id", artist.id);
    setSaving(false);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Artista atualizado!" });
      onSave();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 relative animate-fade-up"
        onClick={e => e.stopPropagation()}
      >
        <Button variant="ghost" size="icon" className="absolute top-3 right-3" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>

        <h2 className="text-xl font-bold mb-6">Editar Artista</h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Nome *</label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Email *</label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Segmento</label>
            <Select value={form.segment} onValueChange={(v) => setForm(f => ({ ...f, segment: v as ArtistSegment }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(segmentLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Cidade</label>
            <Input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Instagram</label>
            <Input value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@usuario" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">URL da foto de perfil</label>
            <Input value={form.profile_image_url} onChange={e => setForm(f => ({ ...f, profile_image_url: e.target.value }))} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Bio</label>
            <Textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={4} />
          </div>

          {/* Foto de perfil miniatura */}
          {form.profile_image_url && (
            <div>
              <label className="text-sm font-medium mb-2 block">Prévia da foto de perfil</label>
              <div className="relative inline-block">
                <img src={form.profile_image_url} alt="Perfil" className="w-20 h-20 rounded-lg object-cover border border-border" />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, profile_image_url: "" }))}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs hover:scale-110 transition-transform"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* Portfólio miniaturas */}
          {form.portfolio_images.length > 0 && (
            <div>
              <label className="text-sm font-medium mb-2 block">Portfólio ({form.portfolio_images.length} fotos)</label>
              <div className="grid grid-cols-4 gap-2">
                {form.portfolio_images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img} alt={`Portfólio ${i + 1}`} className="w-full aspect-square rounded-lg object-cover border border-border" />
                    <button
                      type="button"
                      onClick={() => setForm(f => ({
                        ...f,
                        portfolio_images: f.portfolio_images.filter((_, idx) => idx !== i),
                      }))}
                      className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button className="flex-1" onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
};

const AdminArtistsPanel = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewArtist, setPreviewArtist] = useState<Artist | null>(null);
  const [editArtist, setEditArtist] = useState<Artist | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

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

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("artists").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Artista excluído!" });
      fetchItems();
    }
    setDeleteConfirm(null);
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
297:                   {segmentLabels[item.segment]} • {item.city || "Sem cidade"} • {item.email}
298:                   {item.phone && ` • 📱 ${item.phone}`}
                </p>
                {item.instagram && (
                  <span className="text-xs text-primary flex items-center gap-1 mt-0.5">
                    <Instagram className="h-3 w-3" /> {item.instagram}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className={`text-xs font-medium px-2 py-1 rounded-md mr-1 ${item.approved ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}>
                  {item.approved ? "Aprovado" : "Pendente"}
                </span>
                <Button variant="ghost" size="icon" onClick={() => setPreviewArtist(item)} title="Visualizar">
                  <Eye className="h-4 w-4 text-primary" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => setEditArtist(item)} title="Editar">
                  <Pencil className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => toggleApproval(item)} title={item.approved ? "Desaprovar" : "Aprovar"}>
                  {item.approved ? <XCircle className="h-4 w-4 text-destructive" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
                </Button>
                {deleteConfirm === item.id ? (
                  <div className="flex items-center gap-1 ml-1">
                    <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => handleDelete(item.id)}>Confirmar</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setDeleteConfirm(null)}>Não</Button>
                  </div>
                ) : (
                  <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(item.id)} title="Excluir">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {previewArtist && (
        <ArtistPreview artist={previewArtist} onClose={() => setPreviewArtist(null)} />
      )}

      {editArtist && (
        <ArtistEditModal artist={editArtist} onClose={() => setEditArtist(null)} onSave={fetchItems} />
      )}
    </div>
  );
};

export default AdminArtistsPanel;
