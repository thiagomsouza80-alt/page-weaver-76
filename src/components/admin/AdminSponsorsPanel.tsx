import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, ExternalLink, Loader2, ImageIcon } from "lucide-react";

interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
  display_order: number;
  active: boolean;
  created_at: string;
}

const AdminSponsorsPanel = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: sponsors = [], isLoading } = useQuery<Sponsor[]>({
    queryKey: ["admin-sponsors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sponsors")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const uploadLogo = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("sponsors")
      .upload(fileName, file, { contentType: file.type });
    if (error) throw error;
    const { data } = supabase.storage.from("sponsors").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!logoFile) throw new Error("Selecione uma logo");
      setUploading(true);
      const logoUrl = await uploadLogo(logoFile);
      const maxOrder = sponsors.length > 0 ? Math.max(...sponsors.map(s => s.display_order)) + 1 : 0;
      const { error } = await supabase.from("sponsors").insert({
        name,
        logo_url: logoUrl,
        website_url: websiteUrl || null,
        display_order: maxOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sponsors"] });
      toast.success("Apoiador adicionado!");
      resetForm();
    },
    onError: (err: any) => toast.error(err.message || "Erro ao adicionar"),
    onSettled: () => setUploading(false),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("sponsors").update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-sponsors"] }),
    onError: () => toast.error("Erro ao atualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const sponsor = sponsors.find(s => s.id === id);
      if (sponsor) {
        const fileName = sponsor.logo_url.split("/").pop();
        if (fileName) await supabase.storage.from("sponsors").remove([fileName]);
      }
      const { error } = await supabase.from("sponsors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sponsors"] });
      toast.success("Apoiador removido");
    },
    onError: () => toast.error("Erro ao remover"),
  });

  const resetForm = () => {
    setName("");
    setWebsiteUrl("");
    setLogoFile(null);
    setLogoPreview(null);
    setShowForm(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Apoiadores</h2>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Apoiador
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome do Apoiador *</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Empresa XYZ" />
            </div>
            <div className="space-y-2">
              <Label>Website (opcional)</Label>
              <Input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} placeholder="https://..." />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Logo *</Label>
            <p className="text-xs text-muted-foreground">
              Recomendado: imagem PNG com fundo transparente, proporção quadrada ou horizontal (ex: 400×200px).
            </p>
            <Input type="file" accept="image/*" onChange={handleFileChange} />
            {logoPreview && (
              <div className="mt-2 w-36 h-20 rounded-lg border border-border bg-background flex items-center justify-center p-2">
                <img src={logoPreview} alt="Preview" className="max-w-full max-h-full object-contain" />
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button onClick={() => createMutation.mutate()} disabled={!name || !logoFile || uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
            <Button variant="ghost" onClick={resetForm}>Cancelar</Button>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : sponsors.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <ImageIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p>Nenhum apoiador cadastrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sponsors.map((sponsor) => (
            <Card key={sponsor.id} className="p-4 flex items-center gap-4">
              <GripVertical className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
              
              <div className="w-24 h-14 rounded-md border border-border bg-background flex items-center justify-center p-1.5 flex-shrink-0">
                <img
                  src={sponsor.logo_url}
                  alt={sponsor.name}
                  className="max-w-full max-h-full object-contain"
                />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{sponsor.name}</p>
                {sponsor.website_url && (
                  <a
                    href={sponsor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    {sponsor.website_url}
                  </a>
                )}
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted-foreground">Ativo</Label>
                  <Switch
                    checked={sponsor.active}
                    onCheckedChange={(active) => toggleMutation.mutate({ id: sponsor.id, active })}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm("Remover este apoiador?")) deleteMutation.mutate(sponsor.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSponsorsPanel;
