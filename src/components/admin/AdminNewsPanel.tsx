import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, cropToAspect } from "@/lib/imageCompression";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff, X, Image, Ticket } from "lucide-react";

import type { Tables } from "@/integrations/supabase/types";

type News = Tables<"news">;

const AdminNewsPanel = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<News[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<News | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [existingGallery, setExistingGallery] = useState<string[]>([]);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("geral");
  const [imagePosition, setImagePosition] = useState("center");
  const [ticketsEnabled, setTicketsEnabled] = useState(false);
  const [relatedEventId, setRelatedEventId] = useState<string>("");
  const [eventOptions, setEventOptions] = useState<{ id: string; title: string }[]>([]);

  const fetchItems = async () => {
    const { data } = await supabase.from("news").select("*").order("created_at", { ascending: false });
    setItems(data || []);
    setLoading(false);
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("id, title").order("event_date", { ascending: false });
    setEventOptions((data as any) || []);
  };

  useEffect(() => { fetchItems(); fetchEvents(); }, []);

  const resetForm = () => {
    setTitle(""); setSummary(""); setContent(""); setCategory("geral"); setImagePosition("center");
    setImageFile(null); setEditing(null); setShowForm(false);
    setGalleryFiles([]); setGalleryPreviews([]); setExistingGallery([]);
    setTicketsEnabled(false); setRelatedEventId("");
  };

  const openEdit = (item: News) => {
    setEditing(item);
    setTitle(item.title);
    setSummary(item.summary);
    setContent(item.content);
    setCategory(item.category);
    setImagePosition((item as any).image_position || "center");
    setTicketsEnabled(Boolean((item as any).tickets_enabled));
    setRelatedEventId((item as any).related_event_id || "");
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setExistingGallery(((item as any).gallery_images as string[]) || []);
    setShowForm(true);
  };

  const generateSlug = (text: string) =>
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleGalleryImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const totalCount = existingGallery.length + galleryFiles.length + files.length;
    if (totalCount > 9) {
      toast({ title: "Máximo 9 imagens de galeria", description: "Remova algumas para adicionar novas", variant: "destructive" });
      return;
    }
    const valid = files.filter(f => {
      if (f.size > 5 * 1024 * 1024) {
        toast({ title: `${f.name} muito grande`, description: "Máximo 5MB", variant: "destructive" });
        return false;
      }
      return true;
    });
    setGalleryFiles(prev => [...prev, ...valid]);
    setGalleryPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
  };

  const removeGalleryNew = (index: number) => {
    setGalleryFiles(prev => prev.filter((_, i) => i !== index));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeGalleryExisting = (index: number) => {
    setExistingGallery(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let imageUrl = editing?.image_url || null;
      if (imageFile) {
        const compressed = await compressImage(await cropToAspect(imageFile, 1080, 1440, 0.85), 1080, 1440, 0.85);
        const ext = compressed.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("news").upload(path, compressed);
        if (uploadErr) throw uploadErr;
        imageUrl = supabase.storage.from("news").getPublicUrl(path).data.publicUrl;
      }

      // Upload new gallery images
      const newGalleryUrls: string[] = [];
      for (const file of galleryFiles) {
        const compressed = await compressImage(file);
        const ext = compressed.name.split(".").pop();
        const path = `gallery/${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("news").upload(path, compressed);
        if (uploadErr) throw uploadErr;
        newGalleryUrls.push(supabase.storage.from("news").getPublicUrl(path).data.publicUrl);
      }

      const allGallery = [...existingGallery, ...newGalleryUrls];

      const slug = generateSlug(title);
      const payload = {
        title, slug, summary, content, category,
        image_url: imageUrl, gallery_images: allGallery, image_position: imagePosition,
        tickets_enabled: ticketsEnabled,
        related_event_id: ticketsEnabled && relatedEventId ? relatedEventId : null,
      } as any;

      if (editing) {
        const { error } = await supabase.from("news").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Notícia atualizada!" });
      } else {
        const { error } = await supabase.from("news").insert({ ...payload, published: true });
        if (error) throw error;
        toast({ title: "Notícia criada!" });
      }
      resetForm();
      fetchItems();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const togglePublish = async (item: News) => {
    await supabase.from("news").update({ published: !item.published }).eq("id", item.id);
    fetchItems();
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    await supabase.from("news").delete().eq("id", id);
    fetchItems();
    toast({ title: "Notícia excluída" });
  };

  const totalGalleryCount = existingGallery.length + galleryFiles.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Notícias</h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Nova Notícia
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 mb-8 space-y-5">
          <h3 className="font-semibold text-lg">{editing ? "Editar Notícia" : "Nova Notícia"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Input value={category} onChange={e => setCategory(e.target.value)} placeholder="Ex: Eventos, Cosplay" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Resumo *</Label>
            <Textarea value={summary} onChange={e => setSummary(e.target.value)} rows={2} required />
          </div>
          <div className="space-y-2">
            <Label>Conteúdo Completo *</Label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} rows={8} required />
          </div>
          <div className="space-y-2">
            <Label>Imagem Principal (topo da notícia)</Label>
            <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
          </div>
          <ImagePositionSelector
            value={imagePosition}
            onChange={setImagePosition}
            imageUrl={imageFile ? URL.createObjectURL(imageFile) : editing?.image_url}
          />

          {/* Gallery Images */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Galeria de Imagens (até 9 fotos adicionais)</Label>
              {totalGalleryCount < 9 && (
                <Button type="button" variant="outline" size="sm" onClick={() => galleryInputRef.current?.click()}>
                  <Image className="h-4 w-4 mr-1" />
                  Adicionar fotos
                </Button>
              )}
              <input ref={galleryInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGalleryImages} />
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {existingGallery.map((src, i) => (
                <div key={`existing-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-secondary group">
                  <img src={src} alt={`Galeria ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeGalleryExisting(i)}
                    className="absolute top-1 right-1 bg-background/80 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {galleryPreviews.map((src, i) => (
                <div key={`new-${i}`} className="relative aspect-square rounded-lg overflow-hidden bg-secondary group">
                  <img src={src} alt={`Nova ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeGalleryNew(i)}
                    className="absolute top-1 right-1 bg-background/80 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            {totalGalleryCount === 0 && (
              <p className="text-xs text-muted-foreground">Adicione fotos que aparecerão como miniaturas no final da notícia.</p>
            )}
          </div>

          {/* Tickets toggle */}
          <div className="flex items-start gap-3 p-4 rounded-lg border border-border bg-secondary/30">
            <Ticket className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="news_tickets_enabled" className="cursor-pointer font-semibold">🎟️ Adquirir Ingresso</Label>
                <Switch id="news_tickets_enabled" checked={ticketsEnabled} onCheckedChange={setTicketsEnabled} />
              </div>
              <p className="text-xs text-muted-foreground">
                Ative quando a notícia for relacionada a um evento e quiser exibir o botão de resgate de ingresso.
              </p>
              {ticketsEnabled && (
                <div className="space-y-2">
                  <Label className="text-xs">Evento relacionado *</Label>
                  <Select value={relatedEventId} onValueChange={setRelatedEventId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o evento vinculado" />
                    </SelectTrigger>
                    <SelectContent>
                      {eventOptions.map((ev) => (
                        <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Salvar" : "Publicar"}
            </Button>
            <Button type="button" variant="ghost" onClick={resetForm}>Cancelar</Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhuma notícia cadastrada.</p>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
              {item.image_url && (
                <img src={item.image_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate">{item.title}</h4>
                <p className="text-xs text-muted-foreground">
                  {item.category} • {new Date(item.created_at).toLocaleDateString("pt-BR")}
                  {((item as any).gallery_images?.length > 0) && ` • 📷 ${(item as any).gallery_images.length} fotos`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => togglePublish(item)} title={item.published ? "Despublicar" : "Publicar"}>
                  {item.published ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => openEdit(item)}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => deleteItem(item.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminNewsPanel;
