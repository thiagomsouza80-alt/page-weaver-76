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
import { JOANO_ATTRIBUTES, JOANO_CARD_TYPES, JOANO_VALUE_POINTS } from "@/lib/joano";
import CardFlip from "@/components/pop-games/CardFlip";
import { Loader2, Plus, Trash2, Wrench, Package, Album, Target, Award, Upload, CalendarRange } from "lucide-react";

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
  const [seasons, setSeasons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [missionForm, setMissionForm] = useState({ code: "", title: "", description: "", mission_type: "daily", target_value: 1, xp_reward: 10, coin_reward: 20 });
  const [achForm, setAchForm] = useState({ code: "", title: "", description: "", rarity: "common", xp_reward: 50, coin_reward: 100 });
  const [seasonForm, setSeasonForm] = useState({ name: "", description: "", starts_at: "", ends_at: "", status: "draft", rewards: "[]" });

  const [cardOpen, setCardOpen] = useState(false);
  const [cardForm, setCardForm] = useState<any>({ code: "", name: "", rarity: "common", collection_id: null, attributes: {}, abilities: [], effects: [], value_points: 1 });
  const [cardFrontImg, setCardFrontImg] = useState<File | null>(null);
  const [cardBackImg, setCardBackImg] = useState<File | null>(null);
  const [backUploading, setBackUploading] = useState(false);

  const [packOpen, setPackOpen] = useState(false);
  const [packForm, setPackForm] = useState<any>(null);

  const [colForm, setColForm] = useState({ code: "", name: "" });

  const load = async () => {
    setLoading(true);
    const { data: g } = await (supabase as any).from("games").select("*").eq("slug", slug).maybeSingle();
    if (!g) { setLoading(false); return; }
    setGame(g);
    const [{ data: cols }, { data: cs }, { data: ps }, { data: ms }, { data: ac }, { data: ss }] = await Promise.all([
      (supabase as any).from("game_card_collections").select("*").eq("game_id", g.id).order("sort_order"),
      (supabase as any).from("game_cards").select("*").eq("game_id", g.id).order("rarity").order("name"),
      (supabase as any).from("game_packs").select("*").eq("game_id", g.id).order("created_at", { ascending: false }),
      (supabase as any).from("game_missions").select("*").eq("game_id", g.id).order("created_at", { ascending: false }),
      (supabase as any).from("game_achievements").select("*").eq("game_id", g.id).order("created_at", { ascending: false }),
      (supabase as any).from("game_seasons").select("*").eq("game_id", g.id).order("starts_at", { ascending: false }),
    ]);
    setCollections((cols as any) || []);
    setCards((cs as any) || []);
    setPacks((ps as any) || []);
    setMissions((ms as any) || []);
    setAchievements((ac as any) || []);
    setSeasons((ss as any) || []);
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
    let front_image_url = cardForm.front_image_url || cardForm.image_url || null;
    let back_image_url = cardForm.back_image_url || null;
    if (cardFrontImg && author?.userId) front_image_url = await uploadGameAsset(author.userId, cardFrontImg, "card-front");
    if (cardBackImg && author?.userId) back_image_url = await uploadGameAsset(author.userId, cardBackImg, "card-back");
    const { id: _omit, ...rest } = cardForm;
    void _omit;
    const payload = {
      ...rest,
      game_id: game.id,
      front_image_url,
      back_image_url,
      image_url: front_image_url, // manter compatibilidade
    };
    if (cardForm.id) await (supabase as any).from("game_cards").update(payload).eq("id", cardForm.id);
    else await (supabase as any).from("game_cards").insert(payload);
    setCardOpen(false);
    setCardForm({ code: "", name: "", rarity: "common", collection_id: null, attributes: {}, abilities: [], effects: [], value_points: 1 });
    setCardFrontImg(null); setCardBackImg(null);
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

  const saveMission = async () => {
    if (!missionForm.code || !missionForm.title) { toast({ title: "Código e título obrigatórios", variant: "destructive" }); return; }
    const { error } = await (supabase as any).from("game_missions").insert({ ...missionForm, game_id: game.id });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setMissionForm({ code: "", title: "", description: "", mission_type: "daily", target_value: 1, xp_reward: 10, coin_reward: 20 });
    toast({ title: "Missão criada" }); load();
  };
  const deleteMission = async (id: string) => {
    if (!confirm("Excluir missão?")) return;
    await (supabase as any).from("game_missions").delete().eq("id", id); load();
  };

  const saveAchievement = async () => {
    if (!achForm.code || !achForm.title) { toast({ title: "Código e título obrigatórios", variant: "destructive" }); return; }
    const { error } = await (supabase as any).from("game_achievements").insert({ ...achForm, game_id: game.id });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setAchForm({ code: "", title: "", description: "", rarity: "common", xp_reward: 50, coin_reward: 100 });
    toast({ title: "Conquista criada" }); load();
  };
  const deleteAchievement = async (id: string) => {
    if (!confirm("Excluir conquista?")) return;
    await (supabase as any).from("game_achievements").delete().eq("id", id); load();
  };

  const saveSeason = async () => {
    if (!seasonForm.name || !seasonForm.starts_at || !seasonForm.ends_at) { toast({ title: "Nome e datas obrigatórios", variant: "destructive" }); return; }
    let rewards: any = [];
    try { rewards = JSON.parse(seasonForm.rewards || "[]"); } catch { toast({ title: "Recompensas: JSON inválido", variant: "destructive" }); return; }
    const { error } = await (supabase as any).from("game_seasons").insert({
      game_id: game.id, name: seasonForm.name, description: seasonForm.description || null,
      starts_at: seasonForm.starts_at, ends_at: seasonForm.ends_at, status: seasonForm.status, rewards,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setSeasonForm({ name: "", description: "", starts_at: "", ends_at: "", status: "draft", rewards: "[]" });
    toast({ title: "Temporada criada" }); load();
  };
  const setSeasonStatus = async (id: string, status: string) => {
    await (supabase as any).from("game_seasons").update({ status }).eq("id", id); load();
  };
  const deleteSeason = async (id: string) => {
    if (!confirm("Excluir temporada?")) return;
    await (supabase as any).from("game_seasons").delete().eq("id", id); load();
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-5xl mx-auto pt-24 px-4 pb-16">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><Wrench className="h-6 w-6 text-primary" />Gerenciar · {game.name}</h1>
            <p className="text-sm text-muted-foreground">Coleções, cartas, pacotes, missões e conquistas</p>
          </div>
          <Link to="/pop-games/dev"><Button variant="outline" size="sm">Voltar</Button></Link>
        </header>

        <Tabs defaultValue="cards">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 mb-4">
            <TabsTrigger value="collections" className="gap-1"><Album className="h-4 w-4" />Coleções</TabsTrigger>
            <TabsTrigger value="cards" className="gap-1"><Album className="h-4 w-4" />Cartas</TabsTrigger>
            <TabsTrigger value="packs" className="gap-1"><Package className="h-4 w-4" />Pacotes</TabsTrigger>
            <TabsTrigger value="missions" className="gap-1"><Target className="h-4 w-4" />Missões</TabsTrigger>
            <TabsTrigger value="achievements" className="gap-1"><Award className="h-4 w-4" />Conquistas</TabsTrigger>
            <TabsTrigger value="seasons" className="gap-1"><CalendarRange className="h-4 w-4" />Temporadas</TabsTrigger>
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
            {/* Verso padrão do jogo */}
            <div className="p-3 rounded-lg border border-border bg-card flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                <p className="text-sm font-medium">Verso padrão das cartas deste jogo</p>
                <p className="text-xs text-muted-foreground">Usado quando a carta não tiver verso próprio. Se vazio, usamos o verso padrão do Joano.</p>
              </div>
              {game.default_card_back_url && (
                <img src={game.default_card_back_url} alt="Verso padrão" className="h-16 w-12 rounded object-cover border border-border" />
              )}
              <label className="inline-flex">
                <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const f = e.target.files?.[0]; if (!f || !author?.userId) return;
                  setBackUploading(true);
                  try {
                    const url = await uploadGameAsset(author.userId, f, "game-back");
                    await (supabase as any).from("games").update({ default_card_back_url: url }).eq("id", game.id);
                    setGame({ ...game, default_card_back_url: url });
                    toast({ title: "Verso padrão atualizado" });
                  } catch (err: any) {
                    toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
                  } finally { setBackUploading(false); }
                }} />
                <span className="inline-flex items-center gap-1 h-9 px-3 rounded-md border border-input bg-background text-sm cursor-pointer hover:bg-secondary">
                  {backUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Enviar verso
                </span>
              </label>
            </div>

            <div className="flex justify-end">
              <Dialog open={cardOpen} onOpenChange={setCardOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-1" onClick={() => { setCardForm({ code: "", name: "", rarity: "common", collection_id: null, attributes: {}, abilities: [], effects: [], value_points: 1 }); setCardFrontImg(null); setCardBackImg(null); }}><Plus className="h-4 w-4" />Nova carta</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader><DialogTitle>{cardForm.id ? "Editar carta" : "Nova carta"}</DialogTitle></DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4">
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>Código *</Label><Input value={cardForm.code || ""} onChange={e => setCardForm({ ...cardForm, code: e.target.value })} /></div>
                        <div><Label>Nome *</Label><Input value={cardForm.name || ""} onChange={e => setCardForm({ ...cardForm, name: e.target.value })} /></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>Classe</Label><Input value={cardForm.class || ""} onChange={e => setCardForm({ ...cardForm, class: e.target.value })} placeholder="ex: Guerreiro do Norte" /></div>
                        <div><Label>Facção</Label><Input value={cardForm.faction || ""} onChange={e => setCardForm({ ...cardForm, faction: e.target.value })} placeholder="ex: Aliança" /></div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div><Label>Tipo</Label>
                          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={cardForm.card_type || ""} onChange={e => setCardForm({ ...cardForm, card_type: e.target.value })}>
                            <option value="">—</option>
                            {JOANO_CARD_TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                          </select>
                        </div>
                        <div><Label>Valor (pontos)</Label>
                          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={cardForm.value_points ?? 1} onChange={e => setCardForm({ ...cardForm, value_points: Number(e.target.value) })}>
                            {JOANO_VALUE_POINTS.map(v => <option key={v} value={v}>{v}</option>)}
                          </select>
                        </div>
                        <div><Label>Raridade</Label>
                          <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={cardForm.rarity} onChange={e => setCardForm({ ...cardForm, rarity: e.target.value })}>
                            {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </div>
                      </div>
                      <div><Label>Coleção</Label>
                        <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={cardForm.collection_id || ""} onChange={e => setCardForm({ ...cardForm, collection_id: e.target.value || null })}>
                          <option value="">— nenhuma —</option>
                          {collections.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div><Label>Descrição</Label><Textarea rows={3} value={cardForm.description || ""} onChange={e => setCardForm({ ...cardForm, description: e.target.value })} /></div>

                      <div>
                        <Label>Atributos (Joano)</Label>
                        <div className="grid grid-cols-3 gap-2 mt-1">
                          {JOANO_ATTRIBUTES.map(a => (
                            <div key={a.key}>
                              <Label className="text-[11px] text-muted-foreground">{a.key} · {a.label}</Label>
                              <Input type="number" min={0} max={99}
                                value={cardForm.attributes?.[a.key] ?? ""}
                                onChange={e => setCardForm({ ...cardForm, attributes: { ...(cardForm.attributes || {}), [a.key]: e.target.value === "" ? undefined : Number(e.target.value) } })}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      <div><Label>Habilidades (uma por linha)</Label>
                        <Textarea rows={2}
                          value={Array.isArray(cardForm.abilities) ? cardForm.abilities.join("\n") : ""}
                          onChange={e => setCardForm({ ...cardForm, abilities: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })}
                          placeholder="ex: Fúria — +2 FOR ao empatar" />
                      </div>
                      <div><Label>Efeitos especiais (uma por linha)</Label>
                        <Textarea rows={2}
                          value={Array.isArray(cardForm.effects) ? cardForm.effects.join("\n") : ""}
                          onChange={e => setCardForm({ ...cardForm, effects: e.target.value.split("\n").map(s => s.trim()).filter(Boolean) })}
                          placeholder="ex: Cancela armas adversárias" />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div><Label>Frente da carta (PNG/JPG/WEBP)</Label>
                          <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setCardFrontImg(e.target.files?.[0] || null)} />
                        </div>
                        <div><Label>Verso (opcional)</Label>
                          <Input type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setCardBackImg(e.target.files?.[0] || null)} />
                        </div>
                      </div>

                      <Button onClick={saveCard} className="w-full">Salvar carta</Button>
                    </div>

                    {/* Preview com card flip */}
                    <div className="space-y-2">
                      <Label>Pré-visualização</Label>
                      <CardFlip
                        frontUrl={cardFrontImg ? URL.createObjectURL(cardFrontImg) : (cardForm.front_image_url || cardForm.image_url)}
                        backUrl={cardBackImg ? URL.createObjectURL(cardBackImg) : cardForm.back_image_url}
                        gameBackUrl={game.default_card_back_url}
                        alt={cardForm.name || "Carta"}
                      />
                      <p className="text-[11px] text-muted-foreground text-center">Toque/clique para virar</p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            {cards.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhuma carta ainda.</p> : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {cards.map(c => (
                  <div key={c.id} className="bg-card border border-border rounded-lg overflow-hidden">
                    <CardFlip
                      frontUrl={c.front_image_url || c.image_url}
                      backUrl={c.back_image_url}
                      gameBackUrl={game.default_card_back_url}
                      alt={c.name}
                    />
                    <div className="p-2">
                      <p className="text-xs font-bold truncate">{c.name}</p>
                      <p className="text-[10px] uppercase text-muted-foreground">
                        {c.rarity} · {c.card_type || "—"} · {c.value_points ?? "—"}pt
                      </p>
                      <div className="flex gap-1 mt-1">
                        <Button size="sm" variant="outline" className="h-6 px-2 text-xs flex-1" onClick={(e) => { e.stopPropagation(); setCardForm(c); setCardOpen(true); }}>Editar</Button>
                        <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={(e) => { e.stopPropagation(); deleteCard(c.id); }}><Trash2 className="h-3 w-3" /></Button>
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

          <TabsContent value="missions" className="space-y-3">
            <div className="p-3 rounded-lg border border-border bg-card space-y-2">
              <p className="font-medium text-sm">Nova missão</p>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Código" value={missionForm.code} onChange={e => setMissionForm({ ...missionForm, code: e.target.value })} />
                <Input placeholder="Título" value={missionForm.title} onChange={e => setMissionForm({ ...missionForm, title: e.target.value })} />
              </div>
              <Textarea rows={2} placeholder="Descrição" value={missionForm.description} onChange={e => setMissionForm({ ...missionForm, description: e.target.value })} />
              <div className="grid grid-cols-4 gap-2">
                <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={missionForm.mission_type} onChange={e => setMissionForm({ ...missionForm, mission_type: e.target.value })}>
                  <option value="daily">Diária</option><option value="weekly">Semanal</option><option value="one_off">Única</option>
                </select>
                <Input type="number" min={1} placeholder="Meta" value={missionForm.target_value} onChange={e => setMissionForm({ ...missionForm, target_value: Number(e.target.value) })} />
                <Input type="number" min={0} placeholder="XP" value={missionForm.xp_reward} onChange={e => setMissionForm({ ...missionForm, xp_reward: Number(e.target.value) })} />
                <Input type="number" min={0} placeholder="Moedas" value={missionForm.coin_reward} onChange={e => setMissionForm({ ...missionForm, coin_reward: Number(e.target.value) })} />
              </div>
              <Button onClick={saveMission} className="w-full gap-1"><Plus className="h-4 w-4" />Criar missão</Button>
            </div>
            {missions.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhuma missão ainda.</p> : (
              <ul className="space-y-2">
                {missions.map(m => (
                  <li key={m.id} className="p-3 rounded-lg border border-border bg-card flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.title} <span className="text-muted-foreground text-xs">({m.mission_type})</span></p>
                      <p className="text-xs text-muted-foreground">Meta {m.target_value} · +{m.xp_reward} XP · +{m.coin_reward} moedas</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => deleteMission(m.id)}><Trash2 className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="achievements" className="space-y-3">
            <div className="p-3 rounded-lg border border-border bg-card space-y-2">
              <p className="font-medium text-sm">Nova conquista</p>
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Código" value={achForm.code} onChange={e => setAchForm({ ...achForm, code: e.target.value })} />
                <Input placeholder="Título" value={achForm.title} onChange={e => setAchForm({ ...achForm, title: e.target.value })} />
              </div>
              <Textarea rows={2} placeholder="Descrição" value={achForm.description} onChange={e => setAchForm({ ...achForm, description: e.target.value })} />
              <div className="grid grid-cols-3 gap-2">
                <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={achForm.rarity} onChange={e => setAchForm({ ...achForm, rarity: e.target.value })}>
                  {RARITIES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <Input type="number" min={0} placeholder="XP" value={achForm.xp_reward} onChange={e => setAchForm({ ...achForm, xp_reward: Number(e.target.value) })} />
                <Input type="number" min={0} placeholder="Moedas" value={achForm.coin_reward} onChange={e => setAchForm({ ...achForm, coin_reward: Number(e.target.value) })} />
              </div>
              <Button onClick={saveAchievement} className="w-full gap-1"><Plus className="h-4 w-4" />Criar conquista</Button>
            </div>
            {achievements.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhuma conquista ainda.</p> : (
              <ul className="space-y-2">
                {achievements.map(a => (
                  <li key={a.id} className="p-3 rounded-lg border border-border bg-card flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{a.title} <span className="text-muted-foreground text-xs">({a.rarity})</span></p>
                      <p className="text-xs text-muted-foreground">+{a.xp_reward} XP · +{a.coin_reward} moedas</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => deleteAchievement(a.id)}><Trash2 className="h-4 w-4" /></Button>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
          <TabsContent value="seasons" className="space-y-3">
            <div className="p-3 rounded-lg border border-border bg-card space-y-2">
              <p className="font-medium text-sm">Nova temporada</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input placeholder="Nome (ex: Temporada 1)" value={seasonForm.name} onChange={e => setSeasonForm({ ...seasonForm, name: e.target.value })} />
                <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={seasonForm.status} onChange={e => setSeasonForm({ ...seasonForm, status: e.target.value })}>
                  <option value="draft">Rascunho</option>
                  <option value="active">Ativa</option>
                  <option value="ended">Encerrada</option>
                </select>
              </div>
              <Textarea rows={2} placeholder="Descrição" value={seasonForm.description} onChange={e => setSeasonForm({ ...seasonForm, description: e.target.value })} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div><Label className="text-xs">Início</Label><Input type="datetime-local" value={seasonForm.starts_at} onChange={e => setSeasonForm({ ...seasonForm, starts_at: e.target.value })} /></div>
                <div><Label className="text-xs">Fim</Label><Input type="datetime-local" value={seasonForm.ends_at} onChange={e => setSeasonForm({ ...seasonForm, ends_at: e.target.value })} /></div>
              </div>
              <div><Label className="text-xs">Recompensas (JSON — ex: [{"{\"division\":\"gold\",\"coins\":500}"}])</Label>
                <Textarea rows={3} value={seasonForm.rewards} onChange={e => setSeasonForm({ ...seasonForm, rewards: e.target.value })} />
              </div>
              <Button onClick={saveSeason} className="w-full gap-1"><Plus className="h-4 w-4" />Criar temporada</Button>
            </div>
            {seasons.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Nenhuma temporada ainda.</p> : (
              <ul className="space-y-2">
                {seasons.map(s => (
                  <li key={s.id} className="p-3 rounded-lg border border-border bg-card flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{s.name} <span className="text-muted-foreground text-xs">({s.status})</span></p>
                      <p className="text-xs text-muted-foreground">{new Date(s.starts_at).toLocaleDateString()} → {new Date(s.ends_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-1">
                      <select className="h-8 rounded border border-input bg-background px-2 text-xs" value={s.status} onChange={e => setSeasonStatus(s.id, e.target.value)}>
                        <option value="draft">Rascunho</option><option value="active">Ativa</option><option value="ended">Encerrada</option>
                      </select>
                      <Button size="sm" variant="ghost" onClick={() => deleteSeason(s.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
};

export default DevGameManage;
