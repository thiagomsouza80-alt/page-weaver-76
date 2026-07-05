import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { uploadWithRetry } from "@/lib/uploadWithRetry";
import { toast } from "sonner";

export type Product = {
  id?: string;
  name: string;
  description: string | null;
  price: number | null;
  images: string[];
  whatsapp: string | null;
  external_url: string | null;
  active: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  entrepreneurId: string | null;
  product?: Product | null;
  onSaved: () => void;
};

const empty: Product = { name: "", description: "", price: null, images: [], whatsapp: "", external_url: "", active: true };

const ProductFormDialog = ({ open, onOpenChange, userId, entrepreneurId, product, onSaved }: Props) => {
  const [form, setForm] = useState<Product>(product || empty);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [newPreviews, setNewPreviews] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files).slice(0, 6 - form.images.length - newFiles.length);
    setNewFiles(prev => [...prev, ...arr]);
    setNewPreviews(prev => [...prev, ...arr.map(f => URL.createObjectURL(f))]);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error("Informe o nome do produto"); return; }
    setSaving(true);
    try {
      const uploaded: string[] = [];
      for (const file of newFiles) {
        const url = await uploadWithRetry(file, "social-media", `${userId}/products`);
        uploaded.push(url);
      }
      const payload: any = {
        user_id: userId,
        entrepreneur_id: entrepreneurId,
        name: form.name.trim(),
        description: form.description || null,
        price: form.price,
        whatsapp: form.whatsapp || null,
        external_url: form.external_url || null,
        active: form.active,
        images: [...form.images, ...uploaded],
      };
      if (product?.id) {
        await supabase.from("social_products" as any).update(payload).eq("id", product.id);
      } else {
        await supabase.from("social_products" as any).insert(payload);
      }
      toast.success("Produto salvo");
      setForm(empty); setNewFiles([]); setNewPreviews([]);
      onOpenChange(false);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao salvar produto");
    } finally {
      setSaving(false);
    }
  };

  const removeExisting = (url: string) => setForm(f => ({ ...f, images: f.images.filter(i => i !== url) }));
  const removeNew = (idx: number) => {
    setNewFiles(f => f.filter((_, i) => i !== idx));
    setNewPreviews(f => f.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{product?.id ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nome*</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea rows={3} value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Preço (R$)</Label>
              <Input type="number" step="0.01" value={form.price ?? ""} onChange={e => setForm(f => ({ ...f, price: e.target.value ? Number(e.target.value) : null }))} />
            </div>
            <div>
              <Label>WhatsApp</Label>
              <Input placeholder="91999999999" value={form.whatsapp || ""} onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Link de compra</Label>
            <Input placeholder="https://..." value={form.external_url || ""} onChange={e => setForm(f => ({ ...f, external_url: e.target.value }))} />
          </div>
          <div>
            <Label>Fotos (até 6)</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {form.images.map(url => (
                <div key={url} className="relative aspect-square rounded-lg overflow-hidden bg-secondary group">
                  <img src={url} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeExisting(url)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
                </div>
              ))}
              {newPreviews.map((src, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-secondary group">
                  <img src={src} className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeNew(i)} className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100"><X className="h-3 w-3" /></button>
                </div>
              ))}
              {form.images.length + newFiles.length < 6 && (
                <label className="aspect-square rounded-lg border-2 border-dashed border-border hover:border-primary/50 cursor-pointer flex flex-col items-center justify-center gap-1">
                  <Upload className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Adicionar</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
                </label>
              )}
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.active} onChange={e => setForm(f => ({ ...f, active: e.target.checked }))} />
            Produto ativo na vitrine
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={save} variant="hero" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProductFormDialog;
