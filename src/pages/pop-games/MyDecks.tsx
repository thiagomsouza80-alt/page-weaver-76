import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSocialAuthor } from "@/hooks/useSocialAuthor";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import CardFlip from "@/components/pop-games/CardFlip";
import { Loader2, Plus, Trash2, Star, Library, ArrowLeft, Minus } from "lucide-react";

const DECK_SIZE = 20;

interface Deck { id: string; name: string; is_active: boolean; }
interface DeckCard { card_id: string; quantity: number; }

const MyDecks = () => {
  const { slug } = useParams();
  const { author } = useSocialAuthor();
  const [game, setGame] = useState<any>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [selected, setSelected] = useState<Deck | null>(null);
  const [deckCards, setDeckCards] = useState<DeckCard[]>([]);
  const [owned, setOwned] = useState<Record<string, number>>({});
  const [allCards, setAllCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");

  const total = useMemo(() => deckCards.reduce((s, d) => s + d.quantity, 0), [deckCards]);

  const load = async () => {
    setLoading(true);
    const { data: g } = await (supabase as any).from("games").select("*").eq("slug", slug).maybeSingle();
    if (!g || !author?.userId) { setLoading(false); return; }
    setGame(g);
    const [{ data: ds }, { data: cs }, { data: uc }] = await Promise.all([
      (supabase as any).from("game_decks").select("*").eq("user_id", author.userId).eq("game_id", g.id).order("created_at"),
      (supabase as any).from("game_cards").select("*").eq("game_id", g.id).eq("status", "active"),
      (supabase as any).from("game_user_cards").select("card_id,quantity").eq("user_id", author.userId).eq("game_id", g.id),
    ]);
    setDecks((ds as any) || []);
    setAllCards((cs as any) || []);
    const map: Record<string, number> = {};
    (uc || []).forEach((r: any) => { map[r.card_id] = r.quantity; });
    setOwned(map);
    if (!selected && ds && ds.length) selectDeck(ds[0]);
    setLoading(false);
  };

  const selectDeck = async (d: Deck) => {
    setSelected(d);
    const { data } = await (supabase as any).from("game_deck_cards").select("card_id,quantity").eq("deck_id", d.id);
    setDeckCards((data as any) || []);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [slug, author?.userId]);

  const createDeck = async () => {
    if (!newName.trim() || !game || !author?.userId) return;
    const { data, error } = await (supabase as any).from("game_decks").insert({ user_id: author.userId, game_id: game.id, name: newName.trim() }).select().single();
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setNewName(""); toast({ title: "Deck criado" });
    await load(); selectDeck(data);
  };

  const setActive = async (d: Deck) => {
    if (total !== DECK_SIZE && d.id === selected?.id) {
      toast({ title: `Deck precisa ter ${DECK_SIZE} cartas`, variant: "destructive" }); return;
    }
    await (supabase as any).from("game_decks").update({ is_active: true }).eq("id", d.id);
    toast({ title: "Deck ativo definido" }); load();
  };

  const deleteDeck = async (d: Deck) => {
    if (!confirm(`Excluir deck "${d.name}"?`)) return;
    await (supabase as any).from("game_decks").delete().eq("id", d.id);
    setSelected(null); setDeckCards([]); load();
  };

  const changeQty = async (cardId: string, delta: number) => {
    if (!selected) return;
    const existing = deckCards.find(x => x.card_id === cardId);
    const currentQty = existing?.quantity || 0;
    const next = currentQty + delta;
    const ownedQty = owned[cardId] || 0;

    if (next < 0) return;
    if (next > ownedQty) { toast({ title: "Você não possui cópias suficientes", variant: "destructive" }); return; }
    if (delta > 0 && total >= DECK_SIZE) { toast({ title: `Deck cheio (${DECK_SIZE})`, variant: "destructive" }); return; }

    if (next === 0) {
      await (supabase as any).from("game_deck_cards").delete().eq("deck_id", selected.id).eq("card_id", cardId);
    } else if (existing) {
      await (supabase as any).from("game_deck_cards").update({ quantity: next }).eq("deck_id", selected.id).eq("card_id", cardId);
    } else {
      await (supabase as any).from("game_deck_cards").insert({ deck_id: selected.id, card_id: cardId, quantity: next });
    }
    selectDeck(selected);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!game) return <div className="min-h-screen bg-background"><Navbar /><main className="pt-24 text-center"><p>Jogo não encontrado.</p></main></div>;
  if (!author?.userId) return <div className="min-h-screen bg-background"><Navbar /><main className="pt-24 text-center"><p>Faça login para montar decks.</p></main></div>;

  const ownedCards = allCards.filter(c => (owned[c.id] || 0) > 0);
  const inDeck = (id: string) => deckCards.find(x => x.card_id === id)?.quantity || 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto pt-24 px-4 pb-16">
        <header className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Library className="h-6 w-6 text-primary" />{game.name} · Meus Decks</h1>
            <p className="text-sm text-muted-foreground">Monte decks com exatamente {DECK_SIZE} cartas.</p>
          </div>
          <Link to={`/pop-games/jogos/${game.slug}`}><Button variant="outline" size="sm" className="gap-1"><ArrowLeft className="h-4 w-4" />Voltar</Button></Link>
        </header>

        <div className="grid md:grid-cols-[280px_1fr] gap-4">
          {/* Sidebar de decks */}
          <aside className="space-y-2">
            <div className="p-3 bg-card border border-border rounded-lg space-y-2">
              <Input placeholder="Nome do novo deck" value={newName} onChange={e => setNewName(e.target.value)} />
              <Button onClick={createDeck} className="w-full gap-1" size="sm"><Plus className="h-4 w-4" />Criar deck</Button>
            </div>
            <ul className="space-y-1">
              {decks.map(d => (
                <li key={d.id} className={`p-2 rounded border flex items-center justify-between gap-1 cursor-pointer ${selected?.id === d.id ? "bg-primary/10 border-primary" : "bg-card border-border"}`} onClick={() => selectDeck(d)}>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate flex items-center gap-1">
                      {d.is_active && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
                      {d.name}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={(e) => { e.stopPropagation(); deleteDeck(d); }}><Trash2 className="h-3 w-3" /></Button>
                </li>
              ))}
              {decks.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">Nenhum deck ainda.</p>}
            </ul>
          </aside>

          {/* Editor */}
          <section>
            {!selected ? (
              <div className="text-center py-16 text-muted-foreground">Selecione ou crie um deck.</div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3 p-3 rounded-lg bg-card border border-border">
                  <div>
                    <p className="font-bold">{selected.name}</p>
                    <p className={`text-sm ${total === DECK_SIZE ? "text-emerald-500" : "text-muted-foreground"}`}>{total}/{DECK_SIZE} cartas</p>
                  </div>
                  <Button onClick={() => setActive(selected)} disabled={total !== DECK_SIZE || selected.is_active} className="gap-1">
                    <Star className="h-4 w-4" />{selected.is_active ? "Ativo" : "Tornar ativo"}
                  </Button>
                </div>

                {ownedCards.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">Você ainda não possui cartas deste jogo.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {ownedCards.map(c => {
                      const q = inDeck(c.id);
                      const max = owned[c.id] || 0;
                      return (
                        <div key={c.id} className="bg-card border border-border rounded-lg overflow-hidden">
                          <CardFlip frontUrl={c.front_image_url || c.image_url} backUrl={c.back_image_url} gameBackUrl={game.default_card_back_url} alt={c.name} interactive={false} />
                          <div className="p-2 space-y-1">
                            <p className="text-xs font-bold truncate">{c.name}</p>
                            <p className="text-[10px] uppercase text-muted-foreground">Você tem ×{max}</p>
                            <div className="flex items-center justify-between gap-1">
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => changeQty(c.id, -1)} disabled={q === 0}><Minus className="h-3 w-3" /></Button>
                              <span className="text-sm font-bold">{q}</span>
                              <Button size="sm" variant="outline" className="h-7 w-7 p-0" onClick={() => changeQty(c.id, +1)} disabled={q >= max || total >= DECK_SIZE}><Plus className="h-3 w-3" /></Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyDecks;
