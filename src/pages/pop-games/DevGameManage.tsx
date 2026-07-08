import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSocialAuthor } from "@/hooks/useSocialAuthor";
import { useGameDeveloper } from "@/hooks/useGameDeveloper";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { uploadGameAsset } from "@/lib/popGames";
import { Loader2, Plus, Trash2, Wrench, Package, Album, Target, Award } from "lucide-react";

const RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];
const PACK_TYPES = [
  { v: "starter", l: "Deck inicial" },
  { v: "daily", l: "Diário" },
  { v: "event", l: "Evento" },
  { v: "special", l: "Especial" },
  { v: "mission", l: "Missão" },
];

const DevGameManage = () => {
  const { slug } = useParams();
  const nav = useNavigate();
  const { author } = useSocialAuthor();
  const { developer } = useGameDeveloper(author?.userId ?? null);
  const [game, setGame] = useState<any>(null);
  const [collections, setCollections] = useState<any[]>([]);
  const [cards, setCards] = useState<any[]>([]);
  const [packs, setPacks] = useState<any[]>([]);
  const [missions, setMissions] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [missionForm, setMissionForm] = useState({ code: "", title: "", description: "", mission_type: "daily", target_value: 1, xp_reward: 10, coin_reward: 20 });
  const [achForm, setAchForm] = useState({ code: "", title: "", description: "", rarity: "common", xp_reward: 50, coin_reward: 100 });

  const [cardOpen, setCardOpen] = useState(false);
  const [cardForm, setCardForm] = useState<any>({ code: "", name: "", rarity: "common", collection_id: null });
  const [cardImg, setCardImg] = useState<File | null>(null);

  const [packOpen, setPackOpen] = useState(false);
  const [packForm, setPackForm] = useState<any>(null);

  const [colForm, setColForm] = useState({ code: "", name: "" });

  const load = async () => {
    setLoading(true);
    const { data: g } = await (supabase as any).from("games").select("*").eq("slug", slug).maybeSingle();
    if (!g) { setLoading(false); return; }
    setGame(g);
    const [{ data: cols }, { data: cs }, { data: ps }] = await Promise.all([
      (supabase as any).from("game_card_collections").select("*").eq("game_id", g.id).order("sort_order"),
      (supabase as any).from("game_cards").select("*").eq("game_id", g.id).order("rarity").order("name"),
      (supabase as any).from("game_packs").select("*").eq("game_id", g.id).order("created_at", { ascending: false }),
    ]);
    setCollections((cols as any) || []);
    setCards((cs as any) || []);
    setPacks((ps as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [slug]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!game) return <div className="min-h-screen bg-background"><Navbar /><main className="pt-24 text-center"><p>Jogo não encontrado.</p></main></div>;

  const isOwner = developer && game.developer_id === developer.id;
  if (!isOwner) return (
    <div className="min-h-screen bg-background"><Navbar />
      <main className="pt-24 text-center max-w-md mx-auto px-4">
        <Wrench className="h-12 w-12 mx-auto text-primary mb-3" />
        <p className="text-muted-foreground">Você não é o desenvolvedor deste jogo.</p>
        <Button onClick={() => nav("/pop-games/dev")} className="mt-3">Voltar</Button>
      </main><Footer />
    </div>
  );

  const saveCollection = async () => {
    if (!colForm.code || !colForm.name) return;
    await (supabase as any).from("game_card_collections").insert({ game_id: game.id, code: colForm.code, name: colForm.name });
    setColForm({ code: "", name: "" });
    toast({ title: "Coleção criada" });
    load();
  };

  const saveCard = async () => {
    if (!cardForm.code || !cardForm.name) { toast({ title: "Código e nome são obrigatórios", variant: "destructive" }); return; }
    let image_url = cardForm.image_url;
    if (cardImg && author?.userId) image_url = await uploadGameAsset(author.userId, cardImg, "card");
    const payload = { ...cardForm, game_id: game.id, image_url };
    if (cardForm.id) await (supabase as any).from("game_cards").update(payload).eq("id", cardForm.id);
    else await (supabase as any).from("game_cards").insert(payload);
    setCardOpen(false); setCardForm({ code: "", name: "", rarity: "common", collection_id: null }); setCardImg(null);
    toast({ title: "Carta salva" }); load();
  };

  const deleteCard = async (id: string) => {
    if (!confirm("Excluir carta?")) return;
    await (supabase as any).from("game_cards").delete().eq("id", id); load();
  };

  const savePack = async () => {
    if (!packForm?.code || !packForm?.name) { toast({ title: "Código e nome obrigatórios", variant: "destructive" }); return; }
    let odds = packForm.rarity_odds;
    if (typeof odds === "string") { try { odds = JSON.parse(odds); } catch { toast({ title: "Odds inválidas", variant: "destructive" }); return; } }
    const payload = { ...packForm, rarity_odds: odds, game_id: game.id };
    if (packForm.id) await (supabase as any).from("game_packs").update(payload).eq("id", packForm.id);
    else await (supabase as any).from("game_packs").insert(payload);
    setPackOpen(false); setPackForm(null); toast({ title: "Pacote salvo" }); load();
  };

  const deletePack = async (id: string) => {
    if (!confirm("Excluir pacote?")) return;
    await (supabase as any).from("game_packs").delete().eq("id", id); load();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto pt-24 px-4 pb-16">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6 text-primary" />Gerenciar · {game.name}</h1>
            <p className="text-sm text-muted-foreground">Coleções, cartas e pacotes</p>
          </div>
          <Link to="/pop-games/dev"><Button variant="outline" size="sm">Voltar</Button></Link>
        </header>

        <Tabs defaultValue="cards">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="collections" className="gap-2"><Album className="h-4 w-4" />Coleções</TabsTrigger>
            <TabsTrigger value="cards" className="gap-2"><Album className="h-4 w-4" />Cartas</TabsTrigger>
            <TabsTrigger value="packs" className="gap-2"><Package className="h-4 w-4" />Pacotes</TabsTrigger>
          </TabsList>

          <TabsContent value="collections" className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Código (ex: base-set)" value={colForm.code} onChange={e => setColForm({ ...colForm, code: e.target.value })} />
              <Input placeholder="Nome" value={colForm.name} onChange={e => setColForm({ ...colForm, name: e.target.value })} />
              <Button onClick={saveCollection} className="gap-1"><Plus className="h-4 w-4" />Criar</Button>
            </div>
            <ul className="space-y-1">
              {collections.map(c => <li key={c.id} className="p-2 rounded bg-card border border-border text-sm">{c.name} <span className="text-muted-foreground">({c.code})</span></li>)}
              {collections.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma coleção ainda.</p>}
            </ul>
          </TabsContent>

          <TabsContent value="cards" className="space-y-3">
            <div className="flex justify-end">
              <Dialog open={cardOpen} onOpenChange={setCardOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-1" onClick={() => { setCardForm({ code: "", name: "", rarity: "common", collection_id: null }); setCardImg(null); }}><Plus className="h-4 w-4" />Nova carta</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{cardForm.id ? "Editar carta" : "Nova carta"}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div><Label>Código *</Label><Input value={cardForm.code || ""} onChange={e => setCardForm({ ...cardForm, code: e.target.value })} /></div>
                    <div><Label>Nome *</Label><Input value={cardForm.name || ""} onChange={e => setCardForm({ ...cardForm, name: e.target.value })} /></div>
                    <div><Label>Raridade</Label>
                      <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={cardForm.rarity} onChange={e => setCardForm({ ...cardForm, rarity: e.target.value })}>
                        {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div><Label>Coleção</Label>
                      <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={cardForm.collection_id || ""} onChange={e => setCardForm({ ...cardForm, collection_id: e.target.value || null })}>
                        <option value="">— nenhuma —</option>
                        {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                    <div><Label>Categoria</Label><Input value={cardForm.category || ""} onChange={e => setCardForm({ ...cardForm, category: e.target.value })} /></div>
                    <div><Label>Descrição</Label><Textarea rows={3} value={cardForm.description || ""} onChange={e => setCardForm({ ...cardForm, description: e.target.value })} /></div>
                    <div><Label>Imagem</Label><Input type="file" accept="image/*" onChange={e => setCardImg(e.target.files?.[0] || null)} />
                      {cardForm.image_url && <img src={cardForm.image_url} alt="" className="mt-2 h-20 rounded" />}
                    </div>
                    <div><Label>Atributos personalizados (JSON)</Label>
                      <Textarea rows={3} placeholder='{"attack":10,"defense":5}'
                        value={typeof cardForm.custom_attrs === "string" ? cardForm.custom_attrs : JSON.stringify(cardForm.custom_attrs || {}, null, 2)}
                        onChange={e => { try { setCardForm({ ...cardForm, custom_attrs: JSON.parse(e.target.value) }); } catch { setCardForm({ ...cardForm, custom_attrs: e.target.value }); } }} />
                    </div>
                    <Button onClick={saveCard} className="w-full">Salvar</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {cards.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhuma carta ainda.</p> : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {cards.map(c => (
                  <div key={c.id} className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="aspect-[3/4] bg-secondary">
                      {c.image_url ? <img src={c.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-3xl">🎴</div>}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-bold truncate">{c.name}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">{c.rarity} · {c.code}</p>
                      <div className="flex gap-1 mt-1">
                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs flex-1" onClick={() => { setCardForm(c); setCardOpen(true); }}>Editar</Button>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => deleteCard(c.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="packs" className="space-y-3">
            <div className="flex justify-end">
              <Dialog open={packOpen} onOpenChange={o => { setPackOpen(o); if (!o) setPackForm(null); }}>
                <DialogTrigger asChild>
                  <Button className="gap-1" onClick={() => setPackForm({
                    code: "", name: "", pack_type: "starter", cards_per_pack: 5, is_free: true,
                    rarity_odds: { common: 70, uncommon: 20, rare: 8, epic: 1.5, legendary: 0.5 }, is_active: true,
                  })}><Plus className="h-4 w-4" />Novo pacote</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{packForm?.id ? "Editar pacote" : "Novo pacote"}</DialogTitle></DialogHeader>
                  {packForm && (
                    <div className="space-y-3">
                      <div><Label>Código *</Label><Input value={packForm.code || ""} onChange={e => setPackForm({ ...packForm, code: e.target.value })} /></div>
                      <div><Label>Nome *</Label><Input value={packForm.name || ""} onChange={e => setPackForm({ ...packForm, name: e.target.value })} /></div>
                      <div><Label>Tipo</Label>
                        <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={packForm.pack_type} onChange={e => setPackForm({ ...packForm, pack_type: e.target.value })}>
                          {PACK_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                        </select>
                      </div>
                      <div><Label>Cartas por pacote</Label><Input type="number" min={1} max={100} value={packForm.cards_per_pack} onChange={e => setPackForm({ ...packForm, cards_per_pack: Number(e.target.value) })} /></div>
                      <div><Label>Chances de raridade (JSON)</Label>
                        <Textarea rows={4}
                          value={typeof packForm.rarity_odds === "string" ? packForm.rarity_odds : JSON.stringify(packForm.rarity_odds, null, 2)}
                          onChange={e => { try { setPackForm({ ...packForm, rarity_odds: JSON.parse(e.target.value) }); } catch { setPackForm({ ...packForm, rarity_odds: e.target.value }); } }} />
                      </div>
                      <div className="flex gap-4 text-sm">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={packForm.is_free} onChange={e => setPackForm({ ...packForm, is_free: e.target.checked })} />Gratuito</label>
                        <label className="flex items-center gap-2"><input type="checkbox" checked={packForm.is_active} onChange={e => setPackForm({ ...packForm, is_active: e.target.checked })} />Ativo</label>
                      </div>
                      <Button onClick={savePack} className="w-full">Salvar</Button>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </div>
            {packs.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhum pacote ainda.</p> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {packs.map(p => (
                  <div key={p.id} className="bg-card border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{PACK_TYPES.find(t => t.v === p.pack_type)?.l} · {p.cards_per_pack} cartas · {p.is_free ? "gratuito" : `${p.price_coins} moedas`} · {p.is_active ? "ativo" : "inativo"}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => { setPackForm(p); setPackOpen(true); }}>Editar</Button>
                        <Button size="sm" variant="ghost" onClick={() => deletePack(p.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default DevGameManage;
