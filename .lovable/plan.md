# Pop Games — Plano de Implementação

Módulo enorme. Para entregar com qualidade sem quebrar nada do que já existe (Social Pop, Messenger, Organizador, Cadastros, Financeiro), proponho dividir em **4 fases**. Cada fase é utilizável isoladamente e não remove funcionalidades atuais.

## Visão geral da arquitetura

```text
Amazônia Pop (conta única)
 └── Social Pop
      ├── 🎮 Ícone Pop Games (badge de notificações)
      └── /pop-games
           ├── Home (destaques, novos, populares, favoritos, eventos, ranking, notícias)
           ├── /pop-games/jogos/:slug        (página do jogo + botão Jogar)
           ├── /pop-games/jogos/:slug/colecao
           ├── /pop-games/jogos/:slug/decks
           ├── /pop-games/jogos/:slug/missoes
           ├── /pop-games/dev/solicitar      (virar desenvolvedor)
           └── /pop-games/dev                (painel do desenvolvedor)
```

Reutiliza: `auth.users`, `user_profiles`, `user_progression` (XP/level/rank), `social_notifications`, `social_follows`, Messenger.

## Fase 1 — Fundação + Acesso pelo Social Pop  *(entregar primeiro)*

**Banco (migração única)**
- `game_developers` (user_id, studio_name, status pending/approved/rejected, bio, links, logo/banner)
- `game_developer_requests` (histórico de solicitações + decisões do admin)
- `games` (developer_id, slug, name, category, status draft/published, logo, banner, trailer_url, screenshots[], description, rating_avg, players_count, last_update_at, is_featured, is_new, is_in_development)
- `game_news` (game_id, title, body, cover_url)
- `game_favorites` (user_id, game_id)
- `game_players` (user_id, game_id, joined_at, level, xp, matches, wins) — base do ranking por jogo
- App role nova: `game_developer` no enum `app_role` + entrada em `user_roles` ao aprovar
- RLS + GRANTs padrão em todas as tabelas
- Trigger: ao aprovar desenvolvedor → cria linha em `user_roles`
- Notificações: novas linhas em `social_notifications` para "novo jogo", "atualização de favorito", "solicitação aprovada"

**Frontend**
- Ícone 🎮 (`Gamepad2` do lucide) no header do `SocialPop.tsx` ao lado do sino de mensagens, com badge (contagem de notificações de tipo `game_*`)
- Rotas em `App.tsx`: `/pop-games`, `/pop-games/dev/solicitar`, `/pop-games/dev`, `/pop-games/jogos/:slug`
- **Home Pop Games** (`PopGames.tsx`) com seções: Destaques · Recém-lançados · Populares · Em desenvolvimento · Favoritos · Ranking geral · Notícias
- **Formulário "Seja Desenvolvedor"** (nome do jogo, estúdio, descrição, categoria, logo/banner opcionais, links)
- **Painel do Desenvolvedor** (CRUD de jogos, publicar versão, criar notícia, estatísticas básicas)
- **Página do jogo** com todos os campos + botão **Jogar** (por enquanto registra em `game_players` e mostra "em breve" se o jogo não tiver módulo de cartas ainda)
- **Painel admin** novo (`AdminGameDevelopersPanel`): aprovar / pedir alterações / rejeitar

## Fase 2 — Cartas, Pacotes, Coleção, Deck Inicial

- Tabelas: `game_cards` (com `custom_attrs jsonb` para atributos personalizados por dev), `game_card_collections`, `game_packs` (tipos: starter/daily/event/special/mission + regras de raridade JSON), `game_user_cards` (coleção do jogador com quantidade, obtido_em, origem), `game_pack_openings`
- Deck inicial automático na primeira entrada no jogo (config por dev)
- Tela **Coleção** (obtidas + biblioteca geral com bloqueadas)
- Tela **Abrir pacote** (animação leve)
- Painel dev: CRUD de cartas, coleções e pacotes

## Fase 3 — Decks, Missões, Login Diário, Conquistas, Ranking

- `game_decks` (nome, capa, cartas)
- `game_missions` + `game_user_mission_progress`
- `game_daily_rewards` + claim diário
- `game_achievements` + `game_user_achievements`
- `pop_coins` na `user_progression` (nova coluna)
- Ranking por jogo + ranking geral Pop Games (agrega XP dos jogos)
- Integração com `social_notifications` para missões concluídas, conquistas, pacotes grátis

## Fase 4 — Preparação para Motor de Batalhas (só estrutura)

- Tabelas placeholder: `game_matches`, `game_match_players`, `game_tournaments`, `game_marketplace_listings`, `game_card_trades`
- Nenhuma lógica de batalha implementada — só schema + RLS para permitir evolução futura sem reescrever nada
- Documento `docs/pop-games-architecture.md` descrevendo o SDK/API público futuro

## Identidade visual

- Reaproveita tokens do `index.css` (sem cores hardcoded)
- Acento "gamer" via gradientes semânticos existentes + ícones lucide (`Gamepad2`, `Sparkles`, `Trophy`, `Package`, `Swords`)
- Animações leves via classes Tailwind (`animate-in`, `transition-transform`) — sem libs pesadas

## O que **não** muda

- Social Pop, Messenger, Organizador, Financeiro, Cadastros, Admin atual: intocados
- Um mesmo usuário continua podendo acumular papéis (artista + empreendedor + organizador + **desenvolvedor de jogos**)

## Detalhes técnicos

- Migração da Fase 1 já traz `ALTER TYPE app_role ADD VALUE 'game_developer'` (em transação separada, exigência do Postgres)
- Rota `/pop-games/dev` protegida por `has_role(auth.uid(),'game_developer')` OU `has_role(...,'admin')`
- Ícone 🎮 sempre visível para logados; badge só quando há notificações não lidas de tipos `game_*`
- Notificações reaproveitam `social_notifications` (novos tipos: `game_new`, `game_update`, `game_event`, `game_reward`, `game_mission_done`, `game_free_pack`, `game_dev_approved`, `game_dev_changes`, `game_dev_rejected`)
- Storage: bucket público novo `game-assets` (logos, banners, cartas, screenshots)

---

**Confirma começar pela Fase 1** (fundação + ícone no Social Pop + painel dev + painel admin + página do jogo)? Ou prefere que eu ajuste o escopo (ex.: entregar Fase 1 + Fase 2 juntas, ou reduzir Fase 1)?
