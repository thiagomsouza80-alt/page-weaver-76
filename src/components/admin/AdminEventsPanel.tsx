import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import ImagePositionSelector from "@/components/admin/ImagePositionSelector";
import type { Tables } from "@/integrations/supabase/types";

type Event = Tables<"events">;

const AdminEventsPanel = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Event | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [imagePosition, setImagePosition] = useState("center");

  const fetchItems = async () => {
    const { data } = await supabase.from("events").select("*").order("event_date", { ascending: true });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const resetForm = () => {
    setTitle(""); setDescription(""); setContent(""); setLocation(""); setEventDate(""); setImagePosition("center");
    setImageFile(null); setEditing(null); setShowForm(false);
  };

  const openEdit = (item: Event) => {
    setEditing(item);
    setTitle(item.title);
    setDescription(item.description);
    setContent(item.content);
    setLocation(item.location);
    setEventDate(item.event_date.slice(0, 16));
    setShowForm(true);
  };

  const generateSlug = (text: string) =>
    text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let imageUrl = editing?.image_url || null;
      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from("events").upload(path, imageFile);
        if (uploadErr) throw uploadErr;
        imageUrl = supabase.storage.from("events").getPublicUrl(path).data.publicUrl;
      }

      const slug = generateSlug(title);
      const payload = { title, slug, description, content, location, event_date: new Date(eventDate).toISOString(), image_url: imageUrl };

      if (editing) {
        const { error } = await supabase.from("events").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Evento atualizado!" });
      } else {
        const { error } = await supabase.from("events").insert({ ...payload, published: true });
        if (error) throw error;
        toast({ title: "Evento criado!" });
      }
      resetForm();
      fetchItems();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const togglePublish = async (item: Event) => {
    await supabase.from("events").update({ published: !item.published }).eq("id", item.id);
    fetchItems();
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    await supabase.from("events").delete().eq("id", id);
    fetchItems();
    toast({ title: "Evento excluído" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Eventos</h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Evento
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 mb-8 space-y-5">
          <h3 className="font-semibold text-lg">{editing ? "Editar Evento" : "Novo Evento"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Data e Hora *</Label>
              <Input type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Local *</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} required placeholder="Ex: Hangar Centro de Convenções, Belém" />
          </div>
          <div className="space-y-2">
            <Label>Descrição Curta *</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} required />
          </div>
          <div className="space-y-2">
            <Label>Conteúdo Completo *</Label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} rows={8} required />
          </div>
          <div className="space-y-2">
            <Label>Imagem de Capa</Label>
            <Input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} />
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
        <p className="text-muted-foreground text-center py-12">Nenhum evento cadastrado.</p>
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
                  {new Date(item.event_date).toLocaleDateString("pt-BR")} • {item.location}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => togglePublish(item)}>
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

export default AdminEventsPanel;
