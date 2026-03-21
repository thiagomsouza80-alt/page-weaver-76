import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Eye, EyeOff, X } from "lucide-react";

type Entrepreneur = {
  id: string;
  name: string;
  slug: string;
  badge: string;
  description: string;
  image_url: string | null;
  published: boolean;
  created_at: string;
};

const emptyForm = { name: "", slug: "", badge: "", description: "", image_url: "" };

const AdminEntrepreneursPanel = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Entrepreneur[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    const { data } = await supabase.from("entrepreneurs").select("*").order("created_at", { ascending: false });
    setItems((data as Entrepreneur[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const generateSlug = (name: string) =>
    name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const handleNameChange = (name: string) => {
    setForm(f => ({ ...f, name, slug: generateSlug(name) }));
  };

  const handleSave = async () => {
    if (!form.name || !form.badge || !form.description) {
      toast({ title: "Preencha nome, categoria e descrição", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("entrepreneurs").insert({
      name: form.name,
      slug: form.slug,
      badge: form.badge,
      description: form.description,
      image_url: form.image_url || null,
      published: true,
    } as any);
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Empreendedor cadastrado!" });
    setForm(emptyForm);
    setShowForm(false);
    fetchItems();
  };

  const togglePublished = async (item: Entrepreneur) => {
    await supabase.from("entrepreneurs").update({ published: !item.published } as any).eq("id", item.id);
    fetchItems();
    toast({ title: item.published ? "Despublicado" : "Publicado!" });
  };

  const deleteItem = async (item: Entrepreneur) => {
    await supabase.from("entrepreneurs").delete().eq("id", item.id);
    fetchItems();
    toast({ title: "Empreendedor excluído" });
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold">Empreendedores</h2>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "secondary" : "default"}>
          {showForm ? <><X className="h-4 w-4 mr-2" />Cancelar</> : <><Plus className="h-4 w-4 mr-2" />Novo Empreendedor</>}
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6 mb-8 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Nome</label>
              <Input value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="Nome do negócio" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Categoria (badge)</label>
              <Input value={form.badge} onChange={e => setForm(f => ({ ...f, badge: e.target.value }))} placeholder="Ex: Loja Geek, Gastronomia, Ateliê" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Slug</label>
            <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="slug-do-negocio" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Descrição</label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Breve descrição" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">URL da Imagem (opcional)</label>
            <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Cadastrar
          </Button>
        </div>
      )}

      {items.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Nenhum empreendedor cadastrado.</p>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">{item.name}</h4>
                <p className="text-xs text-muted-foreground">{item.badge} • /{item.slug}</p>
              </div>
              <span className={`text-xs font-medium px-2 py-1 rounded-md ${item.published ? "bg-green-500/10 text-green-500" : "bg-yellow-500/10 text-yellow-500"}`}>
                {item.published ? "Publicado" : "Rascunho"}
              </span>
              <Button variant="ghost" size="icon" onClick={() => togglePublished(item)} title={item.published ? "Despublicar" : "Publicar"}>
                {item.published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-green-500" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteItem(item)} title="Excluir">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminEntrepreneursPanel;
