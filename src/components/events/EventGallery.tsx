import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Camera, Heart, Loader2, ImagePlus, Trash2, Play } from "lucide-react";
import { compressImage } from "@/lib/imageCompression";

interface Props {
  eventId: string;
}

interface GalleryItem {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  likes_count: number;
  created_at: string;
  liked?: boolean;
}

const BUCKET = "event-gallery";

export default function EventGallery({ eventId }: Props) {
  const { toast } = useToast();
  const [uid, setUid] = useState<string | null>(null);
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewer, setViewer] = useState<GalleryItem | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("event_gallery_items" as any)
      .select("*")
      .eq("event_id", eventId)
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(60);
    if (error) {
      console.error(error);
      setItems([]);
    } else {
      let rows = (data as any[]) as GalleryItem[];
      if (uid && rows.length) {
        const ids = rows.map((r) => r.id);
        const { data: likes } = await supabase
          .from("event_gallery_likes" as any)
          .select("gallery_item_id")
          .eq("user_id", uid)
          .in("gallery_item_id", ids);
        const set = new Set((likes as any[] | null)?.map((l) => l.gallery_item_id) ?? []);
        rows = rows.map((r) => ({ ...r, liked: set.has(r.id) }));
      }
      setItems(rows);
    }
    setLoading(false);
  }, [eventId, uid]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`event-gallery:${eventId}:${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_gallery_items", filter: `event_id=eq.${eventId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [eventId, load]);

  const onPick = () => fileRef.current?.click();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uid) {
      if (!uid) toast({ title: "Faça login para enviar fotos", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const isVideo = file.type.startsWith("video/");
      const final = isVideo ? file : await compressImage(file, 1600, 1600, 0.85);
      const ext = (final.name.split(".").pop() || (isVideo ? "mp4" : "jpg")).toLowerCase();
      const path = `${uid}/${eventId}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, final, { contentType: final.type, upsert: false });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const { error: insErr } = await supabase.from("event_gallery_items" as any).insert({
        event_id: eventId,
        user_id: uid,
        media_url: pub.publicUrl,
        media_type: isVideo ? "video" : "image",
      });
      if (insErr) throw insErr;

      toast({ title: "Foto enviada! +15 XP" });
      load();
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const toggleLike = async (it: GalleryItem) => {
    if (!uid) {
      toast({ title: "Faça login para curtir", variant: "destructive" });
      return;
    }
    // optimistic
    setItems((prev) =>
      prev.map((p) =>
        p.id === it.id
          ? { ...p, liked: !p.liked, likes_count: p.likes_count + (p.liked ? -1 : 1) }
          : p,
      ),
    );
    if (it.liked) {
      await supabase
        .from("event_gallery_likes" as any)
        .delete()
        .eq("gallery_item_id", it.id)
        .eq("user_id", uid);
    } else {
      await supabase
        .from("event_gallery_likes" as any)
        .insert({ gallery_item_id: it.id, user_id: uid });
    }
  };

  const remove = async (it: GalleryItem) => {
    if (!confirm("Remover esta mídia?")) return;
    await supabase.from("event_gallery_items" as any).delete().eq("id", it.id);
    setItems((p) => p.filter((x) => x.id !== it.id));
  };

  return (
    <section className="rounded-2xl border border-border/60 bg-card/50 backdrop-blur p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 font-semibold">
          <Camera className="h-4 w-4 text-primary" />
          Galeria colaborativa
          <span className="text-xs text-muted-foreground font-normal">{items.length}</span>
        </h2>
        <Button size="sm" onClick={onPick} disabled={uploading}>
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <ImagePlus className="h-4 w-4 mr-1.5" /> Adicionar
            </>
          )}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/mp4,video/webm,video/quicktime"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Compartilhe os melhores momentos! Suas fotos rendem 15 XP cada.
        </p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {items.map((it) => (
            <div
              key={it.id}
              className="relative group aspect-square rounded-lg overflow-hidden bg-secondary cursor-pointer"
              onClick={() => setViewer(it)}
            >
              {it.media_type === "video" ? (
                <>
                  <video src={it.media_url} className="w-full h-full object-cover" muted preload="metadata" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="h-6 w-6 text-white drop-shadow" />
                  </div>
                </>
              ) : (
                <img src={it.media_url} className="w-full h-full object-cover" loading="lazy" alt="" />
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLike(it);
                }}
                className={`absolute bottom-1 right-1 inline-flex items-center gap-0.5 text-[11px] px-1.5 py-0.5 rounded-full backdrop-blur transition ${
                  it.liked
                    ? "bg-rose-500/90 text-white"
                    : "bg-black/50 text-white opacity-0 group-hover:opacity-100"
                }`}
              >
                <Heart className={`h-3 w-3 ${it.liked ? "fill-current" : ""}`} />
                {it.likes_count}
              </button>
              {it.user_id === uid && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(it);
                  }}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100"
                  title="Remover"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!viewer} onOpenChange={(o) => !o && setViewer(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-black">
          {viewer &&
            (viewer.media_type === "video" ? (
              <video src={viewer.media_url} controls autoPlay className="w-full max-h-[80vh]" />
            ) : (
              <img src={viewer.media_url} className="w-full max-h-[80vh] object-contain" alt="" />
            ))}
          {viewer?.caption && (
            <div className="p-4 text-white text-sm">{viewer.caption}</div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
