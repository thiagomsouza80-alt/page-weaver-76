import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Eye, MousePointerClick, Pencil, ImageIcon } from "lucide-react";

interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  image_url: string | null;
  video_url: string | null;
  link_url: string | null;
  active: boolean;
  start_date: string | null;
  end_date: string | null;
  display_order: number;
  clicks: number;
  views: number;
}

const empty = {
  title: "",
  subtitle: "",
  image_url: "",
  video_url: "",
  link_url: "",
  active: true,
  start_date: "",
  end_date: "",
  display_order: 0,
};

const AdminBannersPanel = () => {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Banner | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: banners = [], isLoading } = useQuery<Banner[]>({
    queryKey: ["admin-banners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_banners")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data as Banner[]) || [];
    },
  });

  const uploadFile = async (file: File, prefix: string) => {
    const ext = file.name.split(".").pop();
    const path = `banners/${prefix}-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("sponsors").upload(path, file, { contentType: file.type });
    if (error) throw error;
    return supabase.storage.from("sponsors").getPublicUrl(path).data.publicUrl;
  };

  const openCreate = () => {
    setEditing(null);
    setForm({ ...empty, display_order: banners.length });
    setImageFile(null);
    setVideoFile(null);
    setOpen(true);
  };

  const openEdit = (b: Banner) => {
    setEditing(b);
    setForm({
      title: b.title || "",
      subtitle: b.subtitle || "",
      image_url: b.image_url || "",
      video_url: b.video_url || "",
      link_url: b.link_url || "",
      button_text: b.button_text || "",
      active: b.active,
      start_date: b.start_date ? b.start_date.slice(0, 16) : "",
      end_date: b.end_date ? b.end_date.slice(0, 16) : "",
      display_order: b.display_order,
    });
    setImageFile(null);
    setVideoFile(null);
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let image_url = form.image_url || null;
      let video_url = form.video_url || null;
      if (imageFile) image_url = await uploadFile(imageFile, "img");
      if (videoFile) video_url = await uploadFile(videoFile, "vid");

      const payload = {
        title: form.title || null,
        subtitle: form.subtitle || null,
        image_url,
        video_url,
        link_url: form.link_url || null,
        button_text: form.button_text || null,
        active: form.active,
        start_date: form.start_date ? new Date(form.start_date).toISOString() : null,
        end_date: form.end_date ? new Date(form.end_date).toISOString() : null,
        display_order: Number(form.display_order) || 0,
      };

      if (editing) {
        const { error } = await supabase.from("homepage_banners").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("homepage_banners").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      toast.success(editing ? "Banner atualizado" : "Banner criado");
      setOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
    onSettled: () => setUploading(false),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("homepage_banners").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-banners"] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("homepage_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-banners"] });
      toast.success("Banner removido");
    },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Gerenciador de Banners</h2>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Banner
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Nenhum banner cadastrado.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {banners.map((b) => (
            <Card key={b.id} className="p-4 flex items-center gap-4">
              <div className="w-32 h-16 rounded-md border border-border bg-secondary overflow-hidden flex-shrink-0">
                {b.video_url ? (
                  <video src={b.video_url} className="w-full h-full object-cover" muted />
                ) : b.image_url ? (
                  <img src={b.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon className="h-5 w-5" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{b.title || <span className="text-muted-foreground italic">Sem título</span>}</p>
                {b.subtitle && <p className="text-xs text-muted-foreground truncate">{b.subtitle}</p>}
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{b.views}</span>
                  <span className="flex items-center gap-1"><MousePointerClick className="h-3 w-3" />{b.clicks}</span>
                  <span>Ordem: {b.display_order}</span>
                  {b.start_date && <span>Início: {new Date(b.start_date).toLocaleDateString("pt-BR")}</span>}
                  {b.end_date && <span>Fim: {new Date(b.end_date).toLocaleDateString("pt-BR")}</span>}
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <Switch checked={b.active} onCheckedChange={(active) => toggle.mutate({ id: b.id, active })} />
                <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => confirm("Remover este banner?") && remove.mutate(b.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Banner" : "Novo Banner"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Texto do botão (CTA)</Label>
                <Input
                  value={form.button_text}
                  onChange={(e) => setForm({ ...form, button_text: e.target.value })}
                  placeholder="Ex: Saiba Mais, Comprar Agora..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subtítulo</Label>
              <Textarea value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} rows={2} />
            </div>

            <div className="space-y-2">
              <Label>Link de destino</Label>
              <Input
                value={form.link_url}
                onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                placeholder="https://... ou /eventos"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Imagem</Label>
                <Input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} />
                {form.image_url && !imageFile && (
                  <img src={form.image_url} alt="" className="h-20 rounded border border-border object-cover" />
                )}
              </div>
              <div className="space-y-2">
                <Label>Vídeo (opcional, sobrepõe imagem)</Label>
                <Input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
                {form.video_url && !videoFile && (
                  <p className="text-xs text-muted-foreground truncate">Vídeo atual carregado</p>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input
                  type="datetime-local"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Encerramento</Label>
                <Input
                  type="datetime-local"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(active) => setForm({ ...form, active })} />
              <Label>Banner ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={() => save.mutate()} disabled={uploading}>
              {uploading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBannersPanel;
