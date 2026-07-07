import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSocialAuthor } from "@/hooks/useSocialAuthor";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Lock, Library, Album } from "lucide-react";

const rarityBg: Record<string, string> = {
  common: "border-slate-400",
  uncommon: "border-emerald-500",
  rare: "border-blue-500",
  epic: "border-purple-500",
  legendary: "border-amber-500",
  mythic: "border-rose-500",
};

const Collection = () => {
  const { slug } = useParams();
  const { author } = useSocialAuthor();
  const [game, setGame] = useState<any>(null);
  const [cards, setCards] = useState<any[]>([]);
  const [owned, setOwned] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: g } = await (supabase as any).from("games").select("id,slug,name").eq("slug", slug).maybeSingle();
      if (!g) { setLoading(false); return; }
      setGame(g);
      const { data: c } = await (supabase as any).from("game_cards")
        .select("*").eq("game_id", g.id).eq("status", "active")
        .order("rarity", { ascending: true }).order("name");
      setCards((c as any) || []);
      if (author?.userId) {
        const { data: uc } = await (supabase as any).from("game_user_cards")
          .select("card_id,quantity").eq("user_id", author.userId).eq("game_id", g.id);
        const map: Record<string, number> = {};
        (uc || []).forEach((r: any) => { map[r.card_id] = r.quantity; });
        setOwned(map);
      }
      setLoading(false);
    })();
  }, [slug, author?.userId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!game) return <div className="min-h-screen bg-background"><Navbar /><main className="pt-24 text-center"><p>Jogo não encontrado.</p></main></div>;

  const ownedCards = cards.filter(c => owned[c.id]);

  const Grid = ({ items, showLock }: { items: any[]; showLock?: boolean }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {items.map(c => {
        const qty = owned[c.id] || 0;
        const locked = showLock && qty === 0;
        return (
          <div key={c.id} className={`aspect-[3/4] rounded-xl border-2 ${rarityBg[c.rarity] || "border-border"} bg-card overflow-hidden relative`}>
            {c.image_url
              ? <img src={c.image_url} alt={c.name} className={`w-full h-full object-cover ${locked ? "grayscale opacity-30" : ""}`} loading="lazy" />
              : <div className="w-full h-full flex items-center justify-center text-4xl">🎴</div>}
            {locked && <div className="absolute inset-0 flex items-center justify-center"><Lock className="h-8 w-8 text-muted-foreground" /></div>}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <p className="text-white text-xs font-bold truncate">{locked ? "???" : c.name}</p>
              <p className="text-white/70 text-[10px] uppercase flex justify-between">
                <span>{c.rarity}</span>
                {qty > 0 && <span>×{qty}</span>}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto pt-24 px-4 pb-16">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Library className="h-6 w-6 text-primary" />{game.name} · Coleção</h1>
            <p className="text-sm text-muted-foreground">{ownedCards.length}/{cards.length} cartas obtidas</p>
          </div>
          <Link to={`/pop-games/jogos/${game.slug}`}><Button variant="outline" size="sm">Voltar</Button></Link>
        </header>

        <Tabs defaultValue="minhas">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="minhas" className="gap-2"><Album className="h-4 w-4" />Minhas</TabsTrigger>
            <TabsTrigger value="biblioteca" className="gap-2"><Library className="h-4 w-4" />Biblioteca</TabsTrigger>
          </TabsList>
          <TabsContent value="minhas">
            {ownedCards.length === 0
              ? <p className="text-center text-muted-foreground py-12">Você ainda não tem cartas deste jogo. Abra pacotes para começar!</p>
              : <Grid items={ownedCards} />}
          </TabsContent>
          <TabsContent value="biblioteca">
            {cards.length === 0
              ? <p className="text-center text-muted-foreground py-12">Este jogo ainda não tem cartas cadastradas.</p>
              : <Grid items={cards} showLock />}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default Collection;
