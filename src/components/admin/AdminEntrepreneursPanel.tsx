import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2, Eye, EyeOff, X, Pencil, Upload, Image } from "lucide-react";

type Entrepreneur = {
  id: string;
  name: string;
  slug: string;
  badge: string;
  description: string;
  image_url: string | null;
  hero_image_url: string | null;
  full_description: string | null;
  address: string | null;
  phone: string | null;
  instagram: string | null;
  portfolio_images: string[] | null;
  published: boolean;
  created_at: string;
  user_id: string | null;
};

const emptyForm = {
  name: "", slug: "", badge: "", description: "", image_url: "",
  hero_image_url: "", full_description: "", address: "", phone: "", instagram: "",
  portfolio_images: [] as string[],
};

const AdminEntrepreneursPanel = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Entrepreneur[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const heroInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

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

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("entrepreneurs").upload(fileName, file);
    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
      return null;
    }
    const { data: urlData } = supabase.storage.from("entrepreneurs").getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleHeroUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingHero(true);
    const url = await uploadFile(file, "hero");
    if (url) {
      setForm(f => ({ ...f, hero_image_url: url, image_url: f.image_url || url }));
    }
    setUploadingHero(false);
    if (heroInputRef.current) heroInputRef.current.value = "";
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingPortfolio(true);
    const newUrls: string[] = [];
    for (const file of Array.from(files)) {
      const url = await uploadFile(file, "portfolio");
      if (url) newUrls.push(url);
    }
    setForm(f => ({ ...f, portfolio_images: [...f.portfolio_images, ...newUrls] }));
    setUploadingPortfolio(false);
    if (portfolioInputRef.current) portfolioInputRef.current.value = "";
  };

  const removePortfolioImage = (index: number) => {
    setForm(f => ({ ...f, portfolio_images: f.portfolio_images.filter((_, i) => i !== index) }));
  };

  const startEdit = (item: Entrepreneur) => {
    setForm({
      name: item.name,
      slug: item.slug,
      badge: item.badge,
      description: item.description,
      image_url: item.image_url || "",
      hero_image_url: item.hero_image_url || "",
      full_description: item.full_description || "",
      address: item.address || "",
      phone: item.phone || "",
      instagram: item.instagram || "",
      portfolio_images: item.portfolio_images || [],
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const cancelForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const handleSave = async () => {
    if (!form.name || !form.badge || !form.description) {
      toast({ title: "Preencha nome, categoria e descrição", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      name: form.name,
      slug: form.slug,
      badge: form.badge,
      description: form.description,
      image_url: form.image_url || null,
      hero_image_url: form.hero_image_url || null,
      full_description: form.full_description || null,
      address: form.address || null,
      phone: form.phone || null,
      instagram: form.instagram || null,
      portfolio_images: form.portfolio_images.length > 0 ? form.portfolio_images : null,
    };

    if (editingId) {
      const { error } = await supabase.from("entrepreneurs").update(payload as any).eq("id", editingId);
      setSaving(false);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Empreendedor atualizado!" });
    } else {
      const { error } = await supabase.from("entrepreneurs").insert({ ...payload, published: true } as any);
      setSaving(false);
      if (error) {
        toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
        return;
      }
      toast({ title: "Empreendedor cadastrado!" });
    }

    cancelForm();
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
        <Button onClick={() => showForm ? cancelForm() : setShowForm(true)} variant={showForm ? "secondary" : "default"}>
          {showForm ? <><X className="h-4 w-4 mr-2" />Cancelar</> : <><Plus className="h-4 w-4 mr-2" />Novo Empreendedor</>}
        </Button>
      </div>

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6 mb-8 space-y-4">
          <h3 className="font-semibold text-lg">{editingId ? "Editar Empreendedor" : "Novo Empreendedor"}</h3>

          {/* Hero Image Upload */}
          <div>
            <label className="text-sm font-medium mb-2 block">Imagem principal (topo do perfil)</label>
            {form.hero_image_url ? (
              <div className="relative group w-full max-w-md">
                <img src={form.hero_image_url} alt="Hero" className="w-full h-40 object-cover rounded-lg border border-border" />
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, hero_image_url: "" }))}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => heroInputRef.current?.click()}
                className="w-full max-w-md h-40 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary/50 transition-colors"
              >
                {uploadingHero ? (
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                ) : (
                  <>
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Clique para enviar a imagem principal</span>
                  </>
                )}
              </div>
            )}
            <input ref={heroInputRef} type="file" accept="image/*" className="hidden" onChange={handleHeroUpload} />
            <div className="mt-2">
              <Input
                value={form.hero_image_url}
                onChange={e => setForm(f => ({ ...f, hero_image_url: e.target.value }))}
                placeholder="Ou cole uma URL de imagem..."
                className="text-xs"
              />
            </div>
          </div>

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
            <label className="text-sm font-medium mb-1 block">Descrição curta (card)</label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Breve descrição para o card" />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Descrição completa (página do perfil)</label>
            <Textarea
              value={form.full_description}
              onChange={e => setForm(f => ({ ...f, full_description: e.target.value }))}
              placeholder="Texto detalhado sobre o negócio, história, diferenciais..."
              rows={5}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Imagem do card (URL)</label>
            <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://... (se vazio, usa a imagem principal)" />
            {form.image_url && (
              <img src={form.image_url} alt="Card preview" className="w-24 h-16 object-cover rounded-md border border-border mt-2" />
            )}
          </div>

          <h4 className="font-semibold text-sm pt-2 border-t border-border">Informações de contato</h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Endereço</label>
              <Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Rua, número, bairro..." />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Telefone</label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(91) 99999-9999" />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Instagram</label>
              <Input value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@usuario" />
            </div>
          </div>

          {/* Portfolio Images */}
          <div className="pt-2 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Portfólio / Galeria de imagens</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => portfolioInputRef.current?.click()}
                disabled={uploadingPortfolio}
              >
                {uploadingPortfolio ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Image className="h-4 w-4 mr-1" />}
                Adicionar fotos
              </Button>
              <input ref={portfolioInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePortfolioUpload} />
            </div>

            {form.portfolio_images.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {form.portfolio_images.map((url, i) => (
                  <div key={i} className="relative group aspect-square">
                    <img src={url} alt={`Portfolio ${i + 1}`} className="w-full h-full object-cover rounded-lg border border-border" />
                    <button
                      type="button"
                      onClick={() => removePortfolioImage(i)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Nenhuma imagem no portfólio. Adicione fotos que aparecerão na página do empreendedor.</p>
            )}
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {editingId ? "Salvar Alterações" : "Cadastrar"}
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
              <Button variant="ghost" size="icon" onClick={() => startEdit(item)} title="Editar">
                <Pencil className="h-4 w-4" />
              </Button>
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
