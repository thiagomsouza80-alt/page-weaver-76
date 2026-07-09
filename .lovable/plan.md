
# Motor Oficial do Joano TCG — Plano de Implementação

Isto é um trabalho grande. Vou dividir em **5 fases entregáveis**, cada uma testável de forma independente, sem remover nada do que já existe no Amazônia Pop / Pop Games / Social Pop.

## Fase 1 — Modelagem de cartas expandida + verso da carta + card flip

**Objetivo:** cartas do Joano com todos os campos oficiais e animação de virar.

- Estender `game_cards` com colunas: `class`, `faction`, `card_type`, `value_points` (1–3), `attributes` (jsonb: FOR/AGI/INT/RES/CAR/ALM + expansível), `abilities` (jsonb array), `effects` (jsonb), `front_image_url`, `back_image_url`, `description`.
- Verso padrão global do Joano em `game_assets` + fallback automático quando o dev não envia verso.
- CRUD no `DevGameManage`: formulário completo, upload PNG/JPG/WEBP com compressão (usar `uploadWithRetry` + `compressImage`), preview frente/verso.
- Novo componente `CardFlip.tsx` (animação 3D CSS) usado em collection, pack opening e futuras partidas.

## Fase 2 — Decks (20 cartas) + Temporadas

- Nova tabela `game_decks` (user_id, game_id, name, is_active) e `game_deck_cards` (deck_id, card_id, quantity) com constraint total = 20.
- Nova tabela `game_seasons` (game_id, name, starts_at, ends_at, rewards jsonb, status).
- UI: página `Meus Decks` (montar/editar/validar 20 cartas), aba "Temporadas" no `DevGameManage`.

## Fase 3 — Motor de partida 1x1 (turn-based, assíncrono)

**Este é o coração e o mais complexo.** Implementação como motor server-authoritative em Postgres + Edge Function.

- Tabelas: `game_matches` (mode, status, winner_user_id, score jsonb, seed), `game_match_players` (match_id, user_id, deck_snapshot jsonb, hand jsonb, points), `game_match_turns` (turn_no, dice_roll, chosen_card jsonb por jogador, resolved_at, winner_user_id, points_awarded).
- Edge function `joano-match-engine` com ações: `create_match`, `join_match`, `start_turn` (rola D6, distribui carta), `submit_choice` (escolha secreta), `resolve_turn` (compara atributo sorteado, aplica pontos, descarte), `end_match`.
- Fluxo do turno seguindo a bula (10 passos), incluindo empates e condição de vitória (10 pontos OU adversário sem cartas).
- Fila simples de matchmaking (`game_matchmaking_queue`), sem MMR ainda (aleatório entre players na fila).
- UI `PlayMatch.tsx` com: rolagem de dado animada, mão do jogador (cartas viradas), zona de escolha secreta, revelação simultânea, placar, log da partida.

## Fase 4 — Modo Duplas 2x2

- Reaproveita as mesmas tabelas: `mode='duo'`, 4 jogadores por match, campo `team` (A/B) em `game_match_players`.
- Engine soma atributos por dupla, pontuação até 20, chat interno entre parceiros (usando Realtime).
- UI adaptada: 2 slots por lado, indicador do parceiro sem revelar sua carta.

## Fase 5 — Ranqueado + Estatísticas + Animações finais

- Tabelas: `game_ranked_profiles` (user_id, game_id, mmr, division, wins, losses, draws), `game_match_stats` (agregados por carta/classe/deck), `game_ranked_seasons`.
- Divisões: Bronze → Lendário (thresholds de MMR). Cálculo ELO simples após cada partida ranqueada.
- Painel de estatísticas do jogador e do desenvolvedor (taxa de vitória por carta/classe/deck, cartas mais usadas).
- Ranking global + regional (usa `city` do perfil).
- Polish de animações: shuffle, draw, dice, reveal, effects, score, victory, pack open, rare card glow.
- **Arquitetura modular para 3º modo:** interface `GameMode` no engine com regras/pontuação/vitória plugáveis — o 3º modo será só adicionar um novo handler.

## Detalhes técnicos

- Todo estado da partida vive no servidor (Postgres + edge function) para evitar trapaça; cliente só envia intenções.
- Realtime via `supabase.channel` em `game_matches` e `game_match_turns` para sincronizar os 2/4 jogadores.
- Verso padrão do Joano: asset estático em `src/assets/joano-card-back.png` + coluna `default_card_back_url` em `games` (dev pode sobrescrever).
- Compatibilidade mobile/desktop: layout responsivo Tailwind, gestos touch para virar cartas.
- Nenhuma tabela/rota/feature existente é alterada — só adições.

## Ordem de execução

Vou implementar **Fase 1 agora** (é a base de tudo: sem cartas completas + verso, o resto não faz sentido). Ao terminar, aviso e sigo para Fase 2, e assim por diante — cada fase entregue e testável antes da próxima.

**Confirma que sigo com a Fase 1?**
