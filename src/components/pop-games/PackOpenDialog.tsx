import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, Package } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const rarityColor: Record<string, string> = {
  common: "border-slate-400",
  uncommon: "border-emerald-500",
  rare: "border-blue-500",
  epic: "border-purple-500",
  legendary: "border-amber-500",
  mythic: "border-rose-500",
};

interface CardResult { card_id: string; name: string; image_url: string | null; rarity: string; code: string; }

export default function PackOpenDialog({
  packId, packName, open, onOpenChange, onOpened,
}: {
  packId: string | null; packName?: string;
  open: boolean; onOpenChange: (o: boolean) => void; onOpened?: () => void;
}) {
  const [opening, setOpening] = useState(false);
  const [cards, setCards] = useState<CardResult[]>([]);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const openPack = async () => {
    if (!packId) return;
    setOpening(true); setCards([]); setRevealed(new Set());
    const { data, error } = await (supabase as any).rpc("game_open_pack", { _pack_id: packId });
    setOpening(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setCards((data as CardResult[]) || []);
    onOpened?.();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) { setCards([]); setRevealed(new Set()); } }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" />{packName || "Pacote"}</DialogTitle></DialogHeader>
        {cards.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="h-14 w-14 mx-auto text-primary mb-3 animate-pulse" />
            <p className="text-sm text-muted-foreground mb-4">Pronto para descobrir suas cartas?</p>
            <Button onClick={openPack} disabled={opening} className="gap-2">
              {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Abrir pacote
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2">
            {cards.map((c, i) => {
              const rev = revealed.has(c.card_id + i);
              return (
                <button key={i} onClick={() => setRevealed(new Set([...revealed, c.card_id + i]))}
                  className={`aspect-[3/4] rounded-xl border-2 ${rarityColor[c.rarity] || "border-border"} bg-card overflow-hidden relative transition-transform hover:scale-105 ${rev ? "" : "bg-gradient-to-br from-primary/40 to-secondary"}`}>
                  {rev ? (
                    <>
                      {c.image_url
                        ? <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-4xl">🎴</div>}
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 text-left">
                        <p className="text-white text-xs font-bold truncate">{c.name}</p>
                        <p className="text-white/70 text-[10px] uppercase">{c.rarity}</p>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Sparkles className="h-10 w-10 text-white/80 animate-pulse" />
                    </div>
                  )}
                </button>
              );
            })}
            <Button variant="outline" onClick={() => setRevealed(new Set(cards.map((c, i) => c.card_id + i)))}
              className="col-span-full">Revelar todas</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
