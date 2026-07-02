import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, X, ChevronLeft, ChevronRight, Eye, Trash2, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video";
  caption: string | null;
  link_url: string | null;
  created_at: string;
  views_count: number;
}

interface Props {
  authorUserId: string;
  onClose: () => void;
}

export default function StoryViewer({ authorUserId, onClose }: Props) {
  const { toast } = useToast();
  const [stories, setStories] = useState<Story[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [me, setMe] = useState<string | null>(null);
  const [highlights, setHighlights] = useState<any[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const timerRef = useRef<number | null>(null);

  const current = stories[idx];
  const isOwner = me && current && me === current.user_id;
  const duration = current?.media_type === "video" ? 15000 : 5000;

  // Extract storage path from either a full public URL (legacy) or a raw path.
  const toStoragePath = (val: string): string => {
    if (!val) return val;
    const m = val.match(/\/stories\/(.+)$/);
    return m ? m[1] : val;
  };

  const resolveUrl = async (rawUrl: string): Promise<string> => {
    if (signedUrls[rawUrl]) return signedUrls[rawUrl];
    const path = toStoragePath(rawUrl);
    const { data } = await supabase.storage.from("stories").createSignedUrl(path, 60 * 60 * 24);
    const url = data?.signedUrl || rawUrl;
    setSignedUrls((prev) => ({ ...prev, [rawUrl]: url }));
    return url;
  };

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      setMe(u.user?.id ?? null);
      const { data } = await supabase
        .from("social_stories" as any)
        .select("*")
        .eq("user_id", authorUserId)
        .eq("deleted", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });
      const rows = ((data as any) ?? []) as Story[];
      setStories(rows);
      // Pre-sign all URLs
      const map: Record<string, string> = {};
      await Promise.all(
        rows.map(async (s) => {
          const path = toStoragePath(s.media_url);
          const { data: sig } = await supabase.storage.from("stories").createSignedUrl(path, 60 * 60 * 24);
          if (sig?.signedUrl) map[s.media_url] = sig.signedUrl;
        })
      );
      setSignedUrls(map);
      setLoading(false);
    })();
  }, [authorUserId]);

  useEffect(() => {
    if (!current) return;
    supabase.rpc("story_register_view" as any, { _story_id: current.id });
  }, [current?.id]);

  // Auto-advance
  useEffect(() => {
    if (!current) return;
    setProgress(0);
    const start = Date.now();
    timerRef.current = window.setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / duration) * 100);
      setProgress(p);
      if (p >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);
        next();
      }
    }, 50);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [idx, stories.length]);

  const next = () => {
    if (idx < stories.length - 1) setIdx(idx + 1);
    else onClose();
  };
  const prev = () => setIdx(Math.max(0, idx - 1));

  const remove = async () => {
    if (!current || !confirm("Excluir este story?")) return;
    await supabase.from("social_stories" as any).update({ deleted: true }).eq("id", current.id);
    toast({ title: "Story excluído" });
    onClose();
  };

  const loadHighlights = async () => {
    if (!me) return;
    const { data } = await supabase
      .from("social_story_highlights" as any)
      .select("*")
      .eq("user_id", me)
      .order("sort_order");
    setHighlights((data as any) ?? []);
  };

  const addToHighlight = async (highlightId: string | null) => {
    if (!current || !me) return;
    let hid = highlightId;
    if (!hid) {
      const title = prompt("Nome do novo destaque:");
      if (!title) return;
      const { data, error } = await supabase
        .from("social_story_highlights" as any)
        .insert({ user_id: me, title, cover_url: current.media_url })
        .select()
        .single();
      if (error) {
        toast({ title: "Erro", description: error.message, variant: "destructive" });
        return;
      }
      hid = (data as any).id;
    }
    const { error } = await supabase.from("social_story_highlight_items" as any).insert({
      highlight_id: hid,
      story_id: current.id,
      user_id: me,
      media_url: current.media_url,
      media_type: current.media_type,
      caption: current.caption,
      link_url: current.link_url,
    });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Adicionado aos Destaques" });
    setHighlights([]);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-black border-0 [&>button]:hidden">
        <div className="relative aspect-[9/16] max-h-[85vh] w-full">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          ) : stories.length === 0 ? (
            <div className="flex items-center justify-center h-full text-white text-sm">
              Nenhum story ativo.
            </div>
          ) : current ? (
            <>
              {/* Progress bars */}
              <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
                {stories.map((_, i) => (
                  <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all"
                      style={{
                        width: i < idx ? "100%" : i === idx ? `${progress}%` : "0%",
                      }}
                    />
                  </div>
                ))}
              </div>

              <button
                onClick={onClose}
                className="absolute top-4 right-3 z-20 text-white bg-black/40 rounded-full p-1.5"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Media */}
              {current.media_type === "video" ? (
                <video
                  key={current.id}
                  src={current.media_url}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <img src={current.media_url} alt="" className="w-full h-full object-contain bg-black" />
              )}

              {/* Caption + link */}
              {(current.caption || current.link_url) && (
                <div className="absolute bottom-12 left-0 right-0 px-4 text-white">
                  {current.caption && <p className="text-sm bg-black/40 inline-block px-2 py-1 rounded">{current.caption}</p>}
                  {current.link_url && (
                    <a
                      href={current.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 block text-xs underline"
                    >
                      Abrir link →
                    </a>
                  )}
                </div>
              )}

              {/* Tap zones */}
              <button onClick={prev} className="absolute top-0 left-0 h-full w-1/3 z-10" aria-label="Anterior" />
              <button onClick={next} className="absolute top-0 right-0 h-full w-1/3 z-10" aria-label="Próximo" />

              {/* Owner controls */}
              {isOwner && (
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white z-20">
                  <span className="text-xs bg-black/50 px-2 py-1 rounded flex items-center gap-1">
                    <Eye className="h-3 w-3" /> {current.views_count}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={loadHighlights}
                      className="text-xs bg-black/50 px-2 py-1 rounded flex items-center gap-1"
                    >
                      <Star className="h-3 w-3" /> Destacar
                    </button>
                    <button
                      onClick={remove}
                      className="text-xs bg-red-600/80 px-2 py-1 rounded flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Excluir
                    </button>
                  </div>
                </div>
              )}

              {/* Highlights picker */}
              {highlights !== null && highlights.length >= 0 && isOwner && highlights !== undefined && (
                <></>
              )}
              {isOwner && highlights.length > 0 && (
                <div className="absolute inset-x-2 bottom-12 bg-card text-foreground rounded-lg p-3 z-30 max-h-48 overflow-y-auto">
                  <p className="text-xs font-semibold mb-2">Adicionar ao destaque:</p>
                  <div className="space-y-1">
                    {highlights.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => addToHighlight(h.id)}
                        className="w-full text-left px-2 py-1 hover:bg-secondary rounded text-sm"
                      >
                        {h.title}
                      </button>
                    ))}
                    <button
                      onClick={() => addToHighlight(null)}
                      className="w-full text-left px-2 py-1 hover:bg-secondary rounded text-sm text-primary"
                    >
                      + Novo destaque
                    </button>
                    <button
                      onClick={() => setHighlights([])}
                      className="w-full text-left px-2 py-1 hover:bg-secondary rounded text-xs text-muted-foreground"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
