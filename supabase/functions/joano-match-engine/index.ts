// =============================================================
// Joano TCG — Match Engine (Fase 3)
// Motor server-authoritative de partidas 1x1 (com base para 2x2).
// Ações:
//   - queue_join        (entra na fila de matchmaking)
//   - queue_leave       (sai da fila)
//   - start_turn        (rola o D6 e distribui a mão do jogador da vez)
//   - submit_choice     (escolhe atributo e carta)
//   - forfeit           (desiste)
//   - get_state         (retorna estado agregado)
// =============================================================
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const HAND_SIZE = 3;
const WIN_SCORE = 10;
const ATTRS = ["FOR", "AGI", "INT", "RES", "CAR", "ALM"];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || "");

    switch (action) {
      case "queue_join":       return await queueJoin(admin, user.id, body);
      case "queue_leave":      return await queueLeave(admin, user.id, body);
      case "start_turn":       return await startTurn(admin, user.id, body);
      case "submit_choice":    return await submitChoice(admin, user.id, body);
      case "forfeit":          return await forfeit(admin, user.id, body);
      case "get_state":        return await getState(admin, user.id, body);
      default: return json({ error: "unknown_action" }, 400);
    }
  } catch (err) {
    console.error("[joano-match-engine]", err);
    return json({ error: String((err as Error).message || err) }, 500);
  }
});

// ---------------- MATCHMAKING ----------------
async function queueJoin(admin: any, userId: string, body: any) {
  const gameId: string = body.game_id;
  const mode: "1v1" | "2v2" = body.mode || "1v1";
  const deckId: string = body.deck_id;
  if (!gameId || !deckId) return json({ error: "game_id and deck_id required" }, 400);

  // valida deck do usuário e obtém cartas
  const { data: deck } = await admin.from("game_decks").select("id, user_id, game_id").eq("id", deckId).maybeSingle();
  if (!deck || deck.user_id !== userId || deck.game_id !== gameId) return json({ error: "invalid_deck" }, 400);
  const { data: deckCards } = await admin.from("game_deck_cards").select("card_id, quantity").eq("deck_id", deckId);
  if (!deckCards?.length) return json({ error: "empty_deck" }, 400);

  const need = mode === "1v1" ? 1 : 3;

  // procura oponente(s) já na fila para o mesmo jogo/modo
  const { data: waiting } = await admin
    .from("game_match_queue")
    .select("id, user_id, deck_id, created_at")
    .eq("game_id", gameId).eq("mode", mode).eq("status", "waiting")
    .neq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(need);

  if ((waiting?.length ?? 0) >= need) {
    // cria partida com todos
    const allUsers = [{ user_id: userId, deck_id: deckId }, ...waiting!.map((w: any) => ({ user_id: w.user_id, deck_id: w.deck_id }))];
    const { data: match, error: mErr } = await admin.from("game_matches").insert({
      game_id: gameId, mode, status: "active",
      started_at: new Date().toISOString(),
      current_turn: 1,
      current_player_user_id: allUsers[0].user_id,
      score: Object.fromEntries(allUsers.map(u => [u.user_id, 0])),
    }).select("*").single();
    if (mErr) throw mErr;

    // popula players com mão inicial e deck restante
    for (let i = 0; i < allUsers.length; i++) {
      const u = allUsers[i];
      const { data: dc } = await admin.from("game_deck_cards").select("card_id, quantity").eq("deck_id", u.deck_id);
      const pool: string[] = [];
      (dc || []).forEach((r: any) => { for (let k = 0; k < r.quantity; k++) pool.push(r.card_id); });
      const shuffled = shuffle(pool);
      const hand = shuffled.slice(0, HAND_SIZE);
      const rest = shuffled.slice(HAND_SIZE);
      await admin.from("game_match_players").insert({
        match_id: match.id, user_id: u.user_id, deck_id: u.deck_id,
        seat: i + 1, team: mode === "2v2" ? (i % 2 === 0 ? 1 : 2) : (i + 1),
        hand, deck_remaining: rest,
      });
    }

    // remove entradas da fila
    await admin.from("game_match_queue").delete().in("id", waiting!.map((w: any) => w.id));

    return json({ status: "matched", match_id: match.id });
  }

  // caso contrário, entra/atualiza fila
  const { data: q, error: qErr } = await admin.from("game_match_queue").upsert({
    game_id: gameId, user_id: userId, mode, deck_id: deckId, status: "waiting",
  }, { onConflict: "game_id,user_id,mode" }).select("*").single();
  if (qErr) throw qErr;

  return json({ status: "waiting", queue_id: q.id });
}

async function queueLeave(admin: any, userId: string, body: any) {
  const gameId: string = body.game_id;
  const mode: string = body.mode || "1v1";
  await admin.from("game_match_queue").delete().eq("user_id", userId).eq("game_id", gameId).eq("mode", mode);
  return json({ ok: true });
}

// ---------------- TURN FLOW ----------------
async function startTurn(admin: any, userId: string, body: any) {
  const matchId: string = body.match_id;
  const { data: match } = await admin.from("game_matches").select("*").eq("id", matchId).maybeSingle();
  if (!match || match.status !== "active") return json({ error: "match_inactive" }, 400);
  if (match.current_player_user_id !== userId) return json({ error: "not_your_turn" }, 403);

  // já iniciou o turno atual?
  const { data: existing } = await admin.from("game_match_turns")
    .select("*").eq("match_id", matchId).eq("turn_number", match.current_turn).maybeSingle();
  if (existing) return json({ turn: existing });

  const dice = Math.floor(Math.random() * 6) + 1;

  // refila a mão do jogador (se acabou o baralho, embaralha descarte)
  const { data: me } = await admin.from("game_match_players").select("*").eq("match_id", matchId).eq("user_id", userId).single();
  let hand: string[] = me.hand || [];
  let deck: string[] = me.deck_remaining || [];
  let discard: string[] = me.discard || [];
  while (hand.length < HAND_SIZE && (deck.length > 0 || discard.length > 0)) {
    if (deck.length === 0) { deck = shuffle(discard); discard = []; }
    hand.push(deck.shift()!);
  }
  await admin.from("game_match_players").update({ hand, deck_remaining: deck, discard })
    .eq("match_id", matchId).eq("user_id", userId);

  // oponente do turno
  const { data: opp } = await admin.from("game_match_players").select("user_id")
    .eq("match_id", matchId).neq("user_id", userId).limit(1).single();

  const { data: turn, error } = await admin.from("game_match_turns").insert({
    match_id: matchId, turn_number: match.current_turn,
    player_user_id: userId, opponent_user_id: opp?.user_id ?? null,
    dice_roll: dice,
  }).select("*").single();
  if (error) throw error;

  return json({ turn });
}

async function submitChoice(admin: any, userId: string, body: any) {
  const matchId: string = body.match_id;
  const cardId: string = body.card_id;
  const attribute: string = body.attribute;
  if (!ATTRS.includes(attribute)) return json({ error: "invalid_attribute" }, 400);

  const { data: match } = await admin.from("game_matches").select("*").eq("id", matchId).maybeSingle();
  if (!match || match.status !== "active") return json({ error: "match_inactive" }, 400);

  const { data: turn } = await admin.from("game_match_turns").select("*")
    .eq("match_id", matchId).eq("turn_number", match.current_turn).maybeSingle();
  if (!turn) return json({ error: "turn_not_started" }, 400);

  const isActive = turn.player_user_id === userId;
  const isOpponent = turn.opponent_user_id === userId;
  if (!isActive && !isOpponent) return json({ error: "not_in_turn" }, 403);
  if (isActive && turn.chosen_attribute) return json({ error: "already_chose" }, 400);
  if (isOpponent && turn.opponent_card_id) return json({ error: "already_chose" }, 400);
  if (isOpponent && !turn.chosen_attribute) return json({ error: "wait_for_attribute" }, 400);

  // valida que carta está na mão
  const { data: me } = await admin.from("game_match_players").select("*")
    .eq("match_id", matchId).eq("user_id", userId).single();
  const hand: string[] = me.hand || [];
  if (!hand.includes(cardId)) return json({ error: "card_not_in_hand" }, 400);

  // busca valor do atributo na carta
  const { data: card } = await admin.from("game_cards").select("id, name, attributes, value_points")
    .eq("id", cardId).maybeSingle();
  if (!card) return json({ error: "invalid_card" }, 400);
  const value = Number(card.attributes?.[attribute] ?? 0);

  if (isActive) {
    await admin.from("game_match_turns").update({
      chosen_attribute: attribute, player_card_id: cardId, player_value: value,
    }).eq("id", turn.id);
    // remove da mão, para descarte
    const newHand = hand.filter(c => c !== cardId);
    const newDiscard = [...(me.discard || []), cardId];
    await admin.from("game_match_players").update({ hand: newHand, discard: newDiscard })
      .eq("match_id", matchId).eq("user_id", userId);
    return json({ ok: true, waiting_for: "opponent" });
  } else {
    // oponente responde
    await admin.from("game_match_turns").update({
      opponent_card_id: cardId, opponent_value: value,
    }).eq("id", turn.id);
    const newHand = hand.filter(c => c !== cardId);
    const newDiscard = [...(me.discard || []), cardId];
    await admin.from("game_match_players").update({ hand: newHand, discard: newDiscard })
      .eq("match_id", matchId).eq("user_id", userId);

    return await resolveTurn(admin, matchId);
  }
}

async function resolveTurn(admin: any, matchId: string) {
  const { data: match } = await admin.from("game_matches").select("*").eq("id", matchId).single();
  const { data: turn } = await admin.from("game_match_turns").select("*")
    .eq("match_id", matchId).eq("turn_number", match.current_turn).single();

  const pv = Number(turn.player_value ?? 0);
  const ov = Number(turn.opponent_value ?? 0);
  let outcome: "player" | "opponent" | "draw" = "draw";
  let awarded = 0;
  let winnerUser: string | null = null;

  if (pv > ov) {
    outcome = "player";
    winnerUser = turn.player_user_id;
    // pontos = value_points da carta derrotada
    const { data: c } = await admin.from("game_cards").select("value_points").eq("id", turn.opponent_card_id).maybeSingle();
    awarded = Math.max(1, Number(c?.value_points ?? 1));
  } else if (ov > pv) {
    outcome = "opponent";
    winnerUser = turn.opponent_user_id;
    const { data: c } = await admin.from("game_cards").select("value_points").eq("id", turn.player_card_id).maybeSingle();
    awarded = Math.max(1, Number(c?.value_points ?? 1));
  }

  await admin.from("game_match_turns").update({
    outcome, points_awarded: awarded, resolved_at: new Date().toISOString(),
    result: { pv, ov, dice: turn.dice_roll, attribute: turn.chosen_attribute },
  }).eq("id", turn.id);

  const score = { ...(match.score || {}) };
  if (winnerUser) score[winnerUser] = (score[winnerUser] || 0) + awarded;

  // condição de vitória
  const { data: players } = await admin.from("game_match_players").select("user_id, hand, deck_remaining, discard").eq("match_id", matchId);
  const someoneOut = (players || []).some((p: any) =>
    (p.hand?.length || 0) === 0 && (p.deck_remaining?.length || 0) === 0 && (p.discard?.length || 0) === 0);
  const reachedScore = Object.entries(score).find(([, v]) => (v as number) >= WIN_SCORE);

  if (reachedScore || someoneOut) {
    const winner = reachedScore
      ? reachedScore[0]
      : Object.entries(score).sort(([, a], [, b]) => (b as number) - (a as number))[0][0];
    await admin.from("game_matches").update({
      status: "finished", winner_user_id: winner, score,
      ended_at: new Date().toISOString(),
    }).eq("id", matchId);
    return json({ ok: true, finished: true, winner_user_id: winner, score });
  }

  // alterna turno para o oponente
  const nextPlayer = turn.opponent_user_id;
  await admin.from("game_matches").update({
    score, current_turn: match.current_turn + 1, current_player_user_id: nextPlayer,
  }).eq("id", matchId);

  return json({ ok: true, outcome, awarded, score });
}

async function forfeit(admin: any, userId: string, body: any) {
  const matchId: string = body.match_id;
  const { data: players } = await admin.from("game_match_players").select("user_id").eq("match_id", matchId);
  const winner = (players || []).find((p: any) => p.user_id !== userId)?.user_id ?? null;
  await admin.from("game_matches").update({
    status: "finished", ended_at: new Date().toISOString(), winner_user_id: winner,
  }).eq("id", matchId);
  return json({ ok: true });
}

async function getState(admin: any, userId: string, body: any) {
  const matchId: string = body.match_id;
  const [{ data: match }, { data: players }, { data: turns }] = await Promise.all([
    admin.from("game_matches").select("*").eq("id", matchId).maybeSingle(),
    admin.from("game_match_players").select("*").eq("match_id", matchId),
    admin.from("game_match_turns").select("*").eq("match_id", matchId).order("turn_number", { ascending: true }),
  ]);
  if (!match) return json({ error: "not_found" }, 404);
  const inMatch = (players || []).some((p: any) => p.user_id === userId);
  if (!inMatch) return json({ error: "forbidden" }, 403);
  return json({ match, players, turns });
}
