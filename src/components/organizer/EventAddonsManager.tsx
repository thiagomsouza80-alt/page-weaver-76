import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { compressImage } from "@/lib/imageCompression";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { centsToBRL, brlToCents, formatBRLInput } from "@/lib/money";
import { Plus, Pencil, Trash2, Loader2, Package, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";

interface Props {
  eventId: string;
}

interface AddonProduct {
  id: string;
  event_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  category: string | null;
  price_cents: number;
  stock_total: number | null;
  stock_sold: number;
  max_per_order: number | null;
  is_required: boolean;
  is_visible: boolean;
  sort_order: number;
}

const emptyForm = {
  name: "",
  description: "",
  category: "",
  price: "0,00",
  stock_total: "",
  max_per_order: "",
  is_required: false,
  is_visible: true,
};

const EventAddonsManager = ({ eventId }: Props) => {
  const { toast } = useToast();
  const [items, setItems] = useState<AddonProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AddonProduct | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("event_addon_products" as any)
      .select("*")
      .eq("event_id", eventId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setItems(((data as any[]) || []) as AddonProduct[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const reset = () => {
    setForm(emptyForm);
    setImageFile(null);
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (item: AddonProduct) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description || "",
      category: item.category || "",
      price: formatBRLInput(item.price_cents),
      stock_total: item.stock_total != null ? String(item.stock_total) : "",
      max_per_order: item.max_per_order != null ? String(item.max_per_order) : "",
      is_required: item.is_required,
      is_visible: item.is_visible,
    });
    setImageFile(null);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let imageUrl = editing?.image_url || null;
      if (imageFile) {
        const compressed = await compressImage(imageFile);
        const ext = compressed.name.split(".").pop() || "jpg";
        const path = `addons/${eventId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("events").upload(path, compressed);
        if (upErr) throw upErr;
        imageUrl = supabase.storage.from("events").getPublicUrl(path).data.publicUrl;
      }
      const payload: any = {
        event_id: eventId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category.trim() || null,
        price_cents: brlToCents(form.price),
        stock_total: form.stock_total ? parseInt(form.stock_total, 10) : null,
        max_per_order: form.max_per_order ? parseInt(form.max_per_order, 10) : null,
        is_required: form.is_required,
        is_visible: form.is_visible,
        image_url: imageUrl,
      };
      if (editing) {
        const { error } = await supabase
          .from("event_addon_products" as any)
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
        toast({ title: "Produto atualizado!" });
      } else {
        payload.sort_order = items.length;
        const { error } = await supabase.from("event_addon_products" as any).insert(payload);
        if (error) throw error;
        toast({ title: "Produto adicionado!" });
      }
      reset();
      load();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (item: AddonProduct) => {
    if (!confirm(`Excluir "${item.name}"?`)) return;
    const { error } = await supabase.from("event_addon_products" as any).delete().eq("id", item.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Produto excluído" });
    load();
  };

  const toggleVisible = async (item: AddonProduct) => {
    await supabase
      .from("event_addon_products" as any)
      .update({ is_visible: !item.is_visible } as any)
      .eq("id", item.id);
    load();
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const a = items[index];
    const b = items[target];
    await Promise.all([
      supabase.from("event_addon_products" as any).update({ sort_order: b.sort_order } as any).eq("id", a.id),
      supabase.from("event_addon_products" as any).update({ sort_order: a.sort_order } as any).eq("id", b.id),
    ]);
    load();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" /> 🎁 Produtos Adicionais
          </CardTitle>
          <Button size="sm" className="gap-2" onClick={() => { reset(); setShowForm(true); }}>
            <Plus className="h-4 w-4" /> Novo Produto
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Venda itens extras junto com o ingresso: camisetas, poster, hi-touch, combo VIP, estacionamento, etc.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-secondary/20 p-4 space-y-4">
            <h3 className="font-semibold">{editing ? "Editar Produto" : "Novo Produto Adicional"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={100} />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Ex: Meet & Greet, Merchandise, Alimentação"
                  maxLength={60}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={400} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="0,00" required />
              </div>
              <div className="space-y-1.5">
                <Label>Estoque disponível</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.stock_total}
                  onChange={(e) => setForm({ ...form, stock_total: e.target.value })}
                  placeholder="Deixe vazio p/ ilimitado"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Máximo por pedido</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.max_per_order}
                  onChange={(e) => setForm({ ...form, max_per_order: e.target.value })}
                  placeholder="Sem limite"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Imagem do Produto</Label>
              <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
              {(imageFile || editing?.image_url) && (
                <img
                  src={imageFile ? URL.createObjectURL(imageFile) : editing?.image_url || ""}
                  alt=""
                  className="mt-2 w-32 h-32 object-cover rounded-lg border border-border"
                />
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center justify-between rounded-lg border border-border bg-card p-3 cursor-pointer">
                <div>
                  <p className="text-sm font-medium">Item obrigatório</p>
                  <p className="text-xs text-muted-foreground">Adicionado automaticamente ao carrinho</p>
                </div>
                <Switch checked={form.is_required} onCheckedChange={(v) => setForm({ ...form, is_required: v })} />
              </label>
              <label className="flex items-center justify-between rounded-lg border border-border bg-card p-3 cursor-pointer">
                <div>
                  <p className="text-sm font-medium">Visível na loja</p>
                  <p className="text-xs text-muted-foreground">Exibido para os compradores</p>
                </div>
                <Switch checked={form.is_visible} onCheckedChange={(v) => setForm({ ...form, is_visible: v })} />
              </label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Salvar" : "Adicionar"}
              </Button>
              <Button type="button" variant="ghost" onClick={reset}>Cancelar</Button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Nenhum produto adicional cadastrado ainda.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => {
              const soldOut = item.stock_total != null && item.stock_sold >= item.stock_total;
              return (
                <div key={item.id} className="flex items-center gap-3 rounded-lg border border-border p-3 bg-card">
                  <div className="flex flex-col gap-1">
                    <Button size="icon" variant="ghost" className="h-6 w-6" disabled={index === 0} onClick={() => move(index, -1)}>
                      <ArrowUp className="h-3 w-3" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-6 w-6" disabled={index === items.length - 1} onClick={() => move(index, 1)}>
                      <ArrowDown className="h-3 w-3" />
                    </Button>
                  </div>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-14 h-14 object-cover rounded-lg shrink-0" />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm truncate">{item.name}</h4>
                      {item.category && <Badge variant="outline" className="text-xs">{item.category}</Badge>}
                      {item.is_required && <Badge className="text-xs bg-primary/15 text-primary border-primary/30" variant="outline">Obrigatório</Badge>}
                      {!item.is_visible && <Badge variant="secondary" className="text-xs">Oculto</Badge>}
                      {soldOut && <Badge variant="destructive" className="text-xs">Esgotado</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {centsToBRL(item.price_cents)}
                      {" • Vendidos: "}{item.stock_sold}
                      {item.stock_total != null && ` / ${item.stock_total}`}
                      {item.max_per_order != null && ` • Máx ${item.max_per_order}/pedido`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" title={item.is_visible ? "Ocultar" : "Exibir"} onClick={() => toggleVisible(item)}>
                      {item.is_visible ? <Eye className="h-4 w-4 text-green-500" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(item)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EventAddonsManager;
