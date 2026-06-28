import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X } from "lucide-react";
import { compressImage } from "@/lib/imageCompression";

interface Props {
  userId: string;
  onClose: () => void;
  onPosted: () => void;
}

export default function StoryComposer({ userId, onClose, onPosted }: Props) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleSelect = async (f: File) => {
    if (f.size > 25 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 25 MB.", variant: "destructive" });
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const submit = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const isVideo = file.type.startsWith("video/");
      let toUpload: File = file;
      if (!isVideo) {
        toUpload = await compressImage(file, 1080, 1920, 0.85);
      }
      const ext = toUpload.name.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "jpg");
      const path = `${userId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("stories").upload(path, toUpload, {
        contentType: toUpload.type,
        upsert: false,
      });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("stories").getPublicUrl(path);

      const { error: insErr } = await supabase.from("social_stories" as any).insert({
        user_id: userId,
        media_url: pub.publicUrl,
        media_type: isVideo ? "video" : "image",
        caption: caption.trim() || null,
        link_url: linkUrl.trim() || null,
      });
      if (insErr) throw insErr;

      toast({ title: "Story publicado!", description: "Fica visível por 24 horas." });
      onPosted();
    } catch (e: any) {
      toast({ title: "Erro ao publicar", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo story</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {!preview ? (
            <label className="block border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors">
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm">Selecionar imagem ou vídeo</p>
              <p className="text-xs text-muted-foreground">Até 25 MB • expira em 24h</p>
              <input
                type="file"
                accept="image/*,video/mp4,video/webm"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleSelect(e.target.files[0])}
              />
            </label>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black aspect-[9/16] max-h-[60vh]">
              {file?.type.startsWith("video/") ? (
                <video src={preview} controls className="w-full h-full object-contain" />
              ) : (
                <img src={preview} alt="" className="w-full h-full object-contain" />
              )}
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                }}
                className="absolute top-2 right-2 bg-black/60 rounded-full p-1 text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <Textarea
            placeholder="Legenda (opcional)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={200}
            rows={2}
          />
          <Input
            placeholder="Link (opcional) — https://..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
          />

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1" disabled={uploading}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={!file || uploading} className="flex-1">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publicar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
