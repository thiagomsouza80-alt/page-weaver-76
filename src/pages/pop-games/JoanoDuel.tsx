import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, Swords, X, Dice6, Trophy, ArrowLeft } from "lucide-react";
import { JOANO_ATTRIBUTES, JoanoAttributeKey } from "@/lib/joano";
import CardFlip from "@/components/pop-games/CardFlip";

type Deck = { id: string; name: string; is_active: boolean };
type Match = any;
type Player = any;
type Turn = any;

const engine = async (payload: any) => {
  const { data, error } = await (supabase.functions as any).invoke("joano-match-engine", { body: payload });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
};

const JoanoDuel = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [game, setGame] = useState<any>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [deckId, setDeckId] = useState<string>("");
  const [queueBusy, setQueueBusy] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [cardsMap, setCardsMap] = useState<Record<string, any>>({});
  const [chosenAttr, setChosenAttr] = useState<JoanoAttributeKey | null>(null);
  const [busy, setBusy] = useState(false);
  const queueRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);
      const { data: g } = await (supabase as any).from("games").select("id, slug, name, logo_url").eq("slug", slug).maybeSingle();
      setGame(g);
      if (g) {
        const { data: ds } = await (supabase as any).from("game_decks").select("id, name, is_active").eq("user_id", user.id).eq("game_id", g.id);
        setDecks(ds || []);
        const active = (ds || []).find((d: any) => d.is_active) || (ds || [])[0];
        if (active) setDeckId(active.id);
      }
      setLoading(false);
    })();
  }, [slug, navigate]);

  // realtime: fila / partida
  useEffect(() => {
    if (!userId || !game) return;
    const ch = supabase.channel(`joano-lobby-${game.id}-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_match_queue", filter: `user_id=eq.${userId}` }, (payload: any) => {
        const row = payload.new || payload.old;
        if (row?.matched_match_id) loadMatch(row.matched_match_id);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "game_match_players", filter: `user_id=eq.${userId}` }, (payload: any) => {
        if (payload.new?.match_id) loadMatch(payload.new.match_id);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [userId, game]);

  // realtime da partida ativa
  useEffect(() => {
    if (!match?.id) return;
    const ch = supabase.channel(`joano-match-${match.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_matches", filter: `id=eq.${match.id}` }, () => refreshState(match.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "game_match_players", filter: `match_id=eq.${match.id}` }, () => refreshState(match.id))
      .on("postgres_changes", { event: "*", schema: "public", table: "game_match_turns", filter: `match_id=eq.${match.id}` }, () => refreshState(match.id))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [match?.id]);

  const loadMatch = async (id: string) => {
    setWaiting(false);
    await refreshState(id);
  };

  const refreshState = async (matchId: string) => {
    const st = await engine({ action: "get_state", match_id: matchId });
    setMatch(st.match);
    setPlayers(st.players || []);
    setTurns(st.turns || []);
    const me = (st.players || []).find((p: any) => p.user_id === userId);
    const cardIds = new Set<string>();
    (me?.hand || []).forEach((c: string) => cardIds.add(c));
    (st.turns || []).forEach((t: any) => { if (t.player_card_id) cardIds.add(t.player_card_id); if (t.opponent_card_id) cardIds.add(t.opponent_card_id); });
    const missing = [...cardIds].filter(c => !cardsMap[c]);
    if (missing.length) {
      const { data: cs } = await (supabase as any).from("game_cards").select("*").in("id", missing);
      const map: any = { ...cardsMap };
      (cs || []).forEach((c: any) => { map[c.id] = c; });
      setCardsMap(map);
    }
  };

  const enterQueue = async () => {
    if (!deckId) { toast({ title: "Escolha um deck ativo com 20 cartas." }); return; }
    setQueueBusy(true);
    try {
      const r = await engine({ action: "queue_join", game_id: game.id, mode: "1v1", deck_id: deckId });
      if (r.status === "matched") await loadMatch(r.match_id);
      else { setWaiting(true); queueRef.current = r.queue_id; pollForMatch(); }
    } catch (e: any) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
    finally { setQueueBusy(false); }
  };

  // poll fallback (caso Realtime demore)
  const pollForMatch = () => {
    const int = setInterval(async () => {
      if (!userId || !game) return;
      const { data: p } = await (supabase as any).from("game_match_players")
        .select("match_id, game_matches!inner(status, game_id)")
        .eq("user_id", userId).limit(1).maybeSingle();
      if (p?.match_id) {
        clearInterval(int);
        loadMatch(p.match_id);
      }
    }, 2000);
    setTimeout(() => clearInterval(int), 60000);
  };

  const leaveQueue = async () => {
    await engine({ action: "queue_leave", game_id: game.id, mode: "1v1" });
    setWaiting(false);
  };

  const me = useMemo(() => players.find(p => p.user_id === userId), [players, userId]);
  const opp = useMemo(() => players.find(p => p.user_id !== userId), [players, userId]);
  const currentTurn = useMemo(() => turns.find(t => t.turn_number === match?.current_turn), [turns, match]);
  const isMyTurn = match && match.current_player_user_id === userId;

  const startTurn = async () => {
    setBusy(true);
    try { await engine({ action: "start_turn", match_id: match.id }); }
    catch (e: any) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const play = async (cardId: string) => {
    if (!currentTurn) return;
    const isActive = currentTurn.player_user_id === userId;
    if (isActive && !chosenAttr) { toast({ title: "Escolha um atributo primeiro." }); return; }
    setBusy(true);
    try {
      await engine({
        action: "submit_choice", match_id: match.id, card_id: cardId,
        attribute: isActive ? chosenAttr : currentTurn.chosen_attribute,
      });
      setChosenAttr(null);
    } catch (e: any) { toast({ title: "Erro", description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const forfeit = async () => {
    if (!confirm("Desistir da partida?")) return;
    await engine({ action: "forfeit", match_id: match.id });
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  // ============ LOBBY ============
  if (!match) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-16 px-6 max-w-2xl mx-auto">
          <button onClick={() => navigate(`/pop-games/jogos/${slug}`)} className="text-sm text-primary hover:underline mb-4 inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" />Voltar</button>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Swords className="h-5 w-5 text-primary" />Duelo 1x1 — {game?.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {decks.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  Você ainda não possui um deck com 20 cartas. Monte um deck primeiro.
                  <div className="mt-3">
                    <Button variant="outline" onClick={() => navigate(`/pop-games/jogos/${slug}/decks`)}>Ir para Meus Decks</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-sm font-medium">Escolha seu deck</label>
                    <select className="mt-1 w-full rounded-md border border-border bg-background p-2 text-sm" value={deckId} onChange={e => setDeckId(e.target.value)}>
                      {decks.map(d => <option key={d.id} value={d.id}>{d.name}{d.is_active ? " (ativo)" : ""}</option>)}
                    </select>
                  </div>
                  {waiting ? (
                    <div className="text-center py-6">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
                      <p className="text-sm mb-3">Procurando oponente...</p>
                      <Button size="sm" variant="outline" onClick={leaveQueue}>Cancelar</Button>
                    </div>
                  ) : (
                    <Button className="w-full gap-2" onClick={enterQueue} disabled={queueBusy}>
                      {queueBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Swords className="h-4 w-4" />}
                      Entrar na fila
                    </Button>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
        <Footer />
      </div>
    );
  }

  // ============ MATCH ============
  const finished = match.status === "finished";
  const iWon = finished && match.winner_user_id === userId;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16 px-6 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold flex items-center gap-2"><Swords className="h-6 w-6 text-primary" />Duelo — Turno {match.current_turn}</h1>
          {!finished && <Button size="sm" variant="outline" className="gap-1" onClick={forfeit}><X className="h-4 w-4" />Desistir</Button>}
        </div>

        {/* Placar */}
        <div className="grid grid-cols-2 gap-4">
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Você</p>
            <p className="text-3xl font-bold">{match.score?.[userId!] ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Mão: {me?.hand?.length ?? 0} · Baralho: {me?.deck_remaining?.length ?? 0}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Oponente</p>
            <p className="text-3xl font-bold">{opp ? (match.score?.[opp.user_id] ?? 0) : 0}</p>
            <p className="text-xs text-muted-foreground mt-1">Mão: {opp?.hand?.length ?? 0} · Baralho: {opp?.deck_remaining?.length ?? 0}</p>
          </CardContent></Card>
        </div>

        {finished ? (
          <Card className="bg-primary/10 border-primary/40"><CardContent className="p-6 text-center">
            <Trophy className={`h-10 w-10 mx-auto mb-2 ${iWon ? "text-primary" : "text-muted-foreground"}`} />
            <p className="text-xl font-bold">{iWon ? "Vitória!" : "Fim de partida"}</p>
            <Button className="mt-4" onClick={() => navigate(`/pop-games/jogos/${slug}`)}>Voltar ao jogo</Button>
          </CardContent></Card>
        ) : (
          <>
            {/* Turno atual */}
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2">
                <Dice6 className="h-4 w-4 text-primary" />
                {isMyTurn ? "Sua vez" : "Vez do oponente"}
              </CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {!currentTurn && isMyTurn && (
                  <Button onClick={startTurn} disabled={busy} className="gap-2">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dice6 className="h-4 w-4" />}
                    Rolar dado e iniciar turno
                  </Button>
                )}
                {!currentTurn && !isMyTurn && <p className="text-sm text-muted-foreground">Aguardando o oponente rolar o dado...</p>}

                {currentTurn && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="secondary">🎲 {currentTurn.dice_roll}</Badge>
                      {currentTurn.chosen_attribute && (
                        <Badge className="bg-primary/15 text-primary border-primary/30">
                          Atributo: {JOANO_ATTRIBUTES.find(a => a.key === currentTurn.chosen_attribute)?.label}
                        </Badge>
                      )}
                    </div>

                    {/* escolha de atributo (só jogador ativo, se ainda não escolheu) */}
                    {currentTurn.player_user_id === userId && !currentTurn.chosen_attribute && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Escolha o atributo em disputa:</p>
                        <div className="flex flex-wrap gap-2">
                          {JOANO_ATTRIBUTES.map(a => (
                            <Button key={a.key} size="sm" variant={chosenAttr === a.key ? "default" : "outline"} onClick={() => setChosenAttr(a.key as JoanoAttributeKey)}>{a.label}</Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* cartas em jogo (revelação) */}
                    {(currentTurn.player_card_id || currentTurn.opponent_card_id) && (
                      <div className="grid grid-cols-2 gap-3">
                        <MatchCardSlot label={currentTurn.player_user_id === userId ? "Você" : "Oponente"} card={cardsMap[currentTurn.player_card_id]} value={currentTurn.player_value} />
                        <MatchCardSlot label={currentTurn.opponent_user_id === userId ? "Você" : "Oponente"} card={cardsMap[currentTurn.opponent_card_id]} value={currentTurn.opponent_value} />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Minha mão */}
            {me?.hand?.length > 0 && currentTurn && (
              (currentTurn.player_user_id === userId && !currentTurn.player_card_id) ||
              (currentTurn.opponent_user_id === userId && currentTurn.chosen_attribute && !currentTurn.opponent_card_id)
            ) && (
              <div>
                <p className="text-sm font-medium mb-2">Sua mão — clique para jogar</p>
                <div className="grid grid-cols-3 gap-3">
                  {me.hand.map((cid: string) => {
                    const c = cardsMap[cid];
                    return (
                      <button key={cid} onClick={() => play(cid)} disabled={busy} className="text-left rounded-xl border border-border bg-card p-2 hover:border-primary transition">
                        <CardFlip card={c} revealed size="sm" />
                        <p className="text-xs mt-2 font-semibold truncate">{c?.name || "..."}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {JOANO_ATTRIBUTES.map(a => c?.attributes?.[a.key] ? (
                            <span key={a.key} className="text-[10px] px-1 rounded bg-secondary text-secondary-foreground">{a.key}:{c.attributes[a.key]}</span>
                          ) : null)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Histórico */}
            {turns.length > 1 && (
              <Card><CardHeader><CardTitle className="text-sm">Histórico</CardTitle></CardHeader>
                <CardContent className="text-xs text-muted-foreground space-y-1">
                  {turns.filter(t => t.resolved_at).slice(-5).reverse().map(t => (
                    <div key={t.id}>Turno {t.turn_number}: {t.chosen_attribute} — {t.player_value} × {t.opponent_value} → {t.outcome === "draw" ? "empate" : (t.outcome === "player" ? "vitória ativa" : "vitória oponente")} (+{t.points_awarded})</div>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
      <Footer />
    </div>
  );
};

const MatchCardSlot = ({ label, card, value }: { label: string; card: any; value: any }) => (
  <div className="rounded-xl border border-border bg-card p-2 text-center">
    <p className="text-xs text-muted-foreground mb-1">{label}</p>
    {card ? (
      <>
        <CardFlip card={card} revealed size="sm" />
        <p className="text-xs mt-1 font-semibold truncate">{card.name}</p>
        {value != null && <p className="text-lg font-bold text-primary">{value}</p>}
      </>
    ) : (
      <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">Aguardando…</div>
    )}
  </div>
);

export default JoanoDuel;
