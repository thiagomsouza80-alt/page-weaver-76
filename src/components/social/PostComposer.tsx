import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Image as ImageIcon, Video, X, Loader2, Send, Ban } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { uploadWithRetry } from "@/lib/uploadWithRetry";
import type { SocialAuthor } from "@/hooks/useSocialAuthor";

interface Props {
  author: SocialAuthor;
  onPosted: () => void;
}

const MAX_VIDEO_MB = 25;

const PostComposer = ({ author, onPosted }: Props) => {
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [video, setVideo] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const imgInput = useRef<HTMLInputElement>(null);
  const vidInput = useRef<HTMLInputElement>(null);

  const initials = author.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  const handleImages = (files: FileList | null) => {
    if (!files) return;
    setVideo(null);
    const arr = Array.from(files).slice(0, 4);
    setImages(arr);
  };

  const handleVideo = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast({ title: "Vídeo muito grande", description: `Máximo ${MAX_VIDEO_MB}MB.`, variant: "destructive" });
      return;
    }
    setImages([]);
    setVideo(f);
  };

  const submit = async () => {
    if (!content.trim() && images.length === 0 && !video) {
      toast({ title: "Adicione conteúdo", description: "Escreva algo ou anexe mídia." });
      return;
    }
    setSubmitting(true);
    try {
      let mediaUrls: string[] = [];
      let mediaType: "text" | "image" | "gallery" | "video" = "text";

      if (video) {
        const path = `${author.userId}/${crypto.randomUUID()}-${video.name}`;
        const { error } = await supabase.storage.from("social-media").upload(path, video);
        if (error) throw error;
        const { data } = supabase.storage.from("social-media").getPublicUrl(path);
        mediaUrls = [data.publicUrl];
        mediaType = "video";
      } else if (images.length > 0) {
        for (const img of images) {
          const url = await uploadWithRetry(img, "social-media", author.userId);
          mediaUrls.push(url);
        }
        mediaType = images.length > 1 ? "gallery" : "image";
      }

      const { error } = await supabase.from("social_posts").insert({
        user_id: author.userId,
        author_type: author.type,
        author_name: author.name,
        author_avatar_url: author.avatarUrl,
        content: content.trim() || null,
        media_urls: mediaUrls,
        media_type: mediaType,
      });
      if (error) throw error;

      setContent(""); setImages([]); setVideo(null);
      toast({ title: "Publicado!" });
      onPosted();
    } catch (e: any) {
      toast({ title: "Erro ao publicar", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          {author.avatarUrl && <AvatarImage src={author.avatarUrl} />}
          <AvatarFallback className="bg-primary/20 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="O que está rolando, Amazônia?"
          className="min-h-[80px] resize-none border-0 bg-transparent focus-visible:ring-0 px-0"
          maxLength={2000}
        />
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {images.map((f, i) => (
            <div key={i} className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="" />
              <button onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 bg-background/80 rounded-full p-1">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {video && (
        <div className="relative bg-muted rounded-lg overflow-hidden">
          <video src={URL.createObjectURL(video)} controls className="w-full max-h-80" />
          <button onClick={() => setVideo(null)}
            className="absolute top-2 right-2 bg-background/80 rounded-full p-1">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-3">
        <div className="flex gap-1">
          <input ref={imgInput} type="file" accept="image/*" multiple hidden onChange={e => handleImages(e.target.files)} />
          <input ref={vidInput} type="file" accept="video/*" hidden onChange={e => handleVideo(e.target.files)} />
          <Button type="button" variant="ghost" size="sm" onClick={() => imgInput.current?.click()}>
            <ImageIcon className="h-4 w-4 mr-1" /> Foto
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => vidInput.current?.click()}>
            <Video className="h-4 w-4 mr-1" /> Vídeo
          </Button>
        </div>
        <Button onClick={submit} disabled={submitting} size="sm">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-1" /> Publicar</>}
        </Button>
      </div>
    </div>
  );
};

export default PostComposer;
