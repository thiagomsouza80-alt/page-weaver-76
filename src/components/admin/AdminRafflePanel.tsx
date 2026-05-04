import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, Gift, Sparkles, RefreshCw } from "lucide-react";
import { membershipTypes } from "@/lib/membership";

interface Participant {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  profile_image_url: string | null;
  type: "artist" | "entrepreneur";
  membership_type?: string;
  city?: string | null;
}

const membershipLabel = (type?: string) =>
  membershipTypes.find(m => m.value === type)?.label || type || "";

const AdminRafflePanel = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawing, setDrawing] = useState(false);
  const [winner, setWinner] = useState<Participant | null>(null);
  const [tickerName, setTickerName] = useState<string>("");

  const fetchParticipants = async () => {
    setLoading(true);
    const [{ data: artists }, { data: entrepreneurs }] = await Promise.all([
      supabase.from("artists").select("id, name, email, phone, profile_image_url, membership_type, city").eq("approved", true),
      supabase.from("entrepreneurs").select("id, name, email, phone, image_url").eq("published", true),
    ]);

    const all: Participant[] = [
      ...((artists || []) as any[]).map(a => ({
        id: a.id, name: a.name, email: a.email, phone: a.phone,
        profile_image_url: a.profile_image_url, type: "artist" as const,
        membership_type: a.membership_type, city: a.city,
      })),
      ...((entrepreneurs || []) as any[]).map(e => ({
        id: e.id, name: e.name, email: e.email || "", phone: e.phone,
        profile_image_url: e.image_url, type: "entrepreneur" as const,
      })),
    ];
    setParticipants(all);
    setLoading(false);
  };

  useEffect(() => { fetchParticipants(); }, []);

  const handleDraw = () => {
    if (participants.length === 0) return;
    setWinner(null);
    setDrawing(true);

    const duration = 3000;
    const interval = 80;
    const start = Date.now();

    const tick = () => {
      const elapsed = Date.now() - start;
      const random = participants[Math.floor(Math.random() * participants.length)];
      setTickerName(random.name);
      if (elapsed < duration) {
        setTimeout(tick, interval);
      } else {
        const finalWinner = participants[Math.floor(Math.random() * participants.length)];
        setWinner(finalWinner);
        setTickerName("");
        setDrawing(false);
      }
    };
    tick();
  };

  const reset = () => {
    setWinner(null);
    setTickerName("");
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Gift className="h-6 w-6 text-primary" />
        <h2 className="text-2xl font-bold">Sorteio</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        {participants.length} participante{participants.length !== 1 ? "s" : ""} elegível{participants.length !== 1 ? "is" : ""} (artistas aprovados + empreendedores publicados)
      </p>

      <div className="bg-card border border-border rounded-2xl p-8 mb-6">
        <div className="min-h-[280px] flex flex-col items-center justify-center text-center">
          {!winner && !drawing && (
            <div className="space-y-4">
              <Sparkles className="h-16 w-16 text-primary/40 mx-auto" />
              <p className="text-muted-foreground">Clique em "Sortear" para escolher um ganhador aleatório.</p>
            </div>
          )}

          {drawing && (
            <div className="space-y-4">
              <Sparkles className="h-12 w-12 text-primary mx-auto animate-pulse" />
              <p className="text-3xl font-bold text-primary animate-pulse">{tickerName || "Sorteando..."}</p>
              <p className="text-sm text-muted-foreground">Sorteando entre {participants.length} participantes...</p>
            </div>
          )}

          {winner && !drawing && (
            <div className="space-y-4 animate-in fade-in zoom-in duration-500">
              <div className="flex justify-center">
                {winner.profile_image_url ? (
                  <img src={winner.profile_image_url} alt={winner.name} className="w-28 h-28 rounded-full object-cover ring-4 ring-primary" />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-secondary flex items-center justify-center ring-4 ring-primary">
                    <span className="text-4xl font-bold text-muted-foreground">{winner.name[0]}</span>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-primary font-semibold mb-1">🎉 Ganhador(a) 🎉</p>
                <h3 className="text-3xl font-bold">{winner.name}</h3>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <p>{winner.type === "artist" ? "Artista" : "Empreendedor(a)"}{winner.city ? ` • ${winner.city}` : ""}</p>
                {winner.email && <p>✉️ {winner.email}</p>}
                {winner.phone && <p>📱 {winner.phone}</p>}
                {winner.membership_type && winner.membership_type !== "free" && (
                  <p className="font-semibold text-primary">{membershipLabel(winner.membership_type)}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 justify-center">
        <Button onClick={handleDraw} disabled={drawing || participants.length === 0} size="lg" className="gap-2">
          {drawing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />}
          {winner ? "Sortear novamente" : "Sortear"}
        </Button>
        {winner && (
          <Button variant="outline" size="lg" onClick={reset} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Limpar
          </Button>
        )}
      </div>
    </div>
  );
};

export default AdminRafflePanel;
