import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Loader2, X } from "lucide-react";

interface Props {
  highlightId: string;
  onClose: () => void;
}

export default function HighlightViewer({ highlightId, onClose }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number | null>(null);

  const current = items[idx];
  const duration = current?.media_type === "video" ? 15000 : 5000;

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("social_story_highlight_items" as any)
        .select("*")
        .eq("highlight_id", highlightId)
        .order("sort_order");
      setItems((data as any) ?? []);
      setLoading(false);
    })();
  }, [highlightId]);

  useEffect(() => {
    if (!current) return;
    setProgress(0);
    const start = Date.now();
    timerRef.current = window.setInterval(() => {
      const p = Math.min(100, ((Date.now() - start) / duration) * 100);
      setProgress(p);
      if (p >= 100) {
        if (timerRef.current) clearInterval(timerRef.current);
        if (idx < items.length - 1) setIdx(idx + 1);
        else onClose();
      }
    }, 50);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [idx, items.length]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-black border-0 [&>button]:hidden">
        <div className="relative aspect-[9/16] max-h-[85vh] w-full">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </div>
          ) : current ? (
            <>
              <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
                {items.map((_, i) => (
                  <div key={i} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white"
                      style={{ width: i < idx ? "100%" : i === idx ? `${progress}%` : "0%" }}
                    />
                  </div>
                ))}
              </div>
              <button onClick={onClose} className="absolute top-4 right-3 z-20 text-white bg-black/40 rounded-full p-1.5">
                <X className="h-4 w-4" />
              </button>
              {current.media_type === "video" ? (
                <video key={current.id} src={current.media_url} autoPlay playsInline className="w-full h-full object-contain bg-black" />
              ) : (
                <img src={current.media_url} alt="" className="w-full h-full object-contain bg-black" />
              )}
              {current.caption && (
                <div className="absolute bottom-4 left-0 right-0 px-4 text-white">
                  <p className="text-sm bg-black/40 inline-block px-2 py-1 rounded">{current.caption}</p>
                </div>
              )}
              <button onClick={() => setIdx(Math.max(0, idx - 1))} className="absolute top-0 left-0 h-full w-1/3 z-10" />
              <button
                onClick={() => (idx < items.length - 1 ? setIdx(idx + 1) : onClose())}
                className="absolute top-0 right-0 h-full w-1/3 z-10"
              />
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
