# Social Pop — Rede Social do Amazônia Pop

O escopo é enorme (26 áreas, gamificação, stories, messenger avançado, galerias de eventos, antifraude, painel admin completo). Para não quebrar nada do que já está no ar (eventos, ingressos, marketplace, messenger básico, notificações push, verificação), vou entregar em **fases incrementais**, cada uma com migração + UI + admin + testes antes de seguir.

Confirme a ordem abaixo (ou reordene) que eu começo pela Fase 1.

---

## Fase 1 — Fundação de Gamificação (XP, Níveis, Classes, Ranks, Conquistas)
- Tabelas: `xp_rules` (configurável), `xp_events` (log antifraude), `user_progression` (xp, level, rank, class), `classes`, `ranks`, `achievements`, `user_achievements`.
- Função `award_xp(user, action, ref)` com deduplicação (mesma ação/alvo/janela) → base do antifraude.
- Triggers em: posts, comments, likes, shares, follows, fans, tickets, event_attendees, validations_log, social_products, messages, conversations.
- Cálculo de nível (curva progressiva configurável) + recálculo de rank em job.
- UI: barra XP, badge de classe, rank e medalhas no PostCard, ProductCard e perfil.
- Admin: painel `Social Pop → XP / Classes / Ranks / Medalhas` editando valores em tempo real.

## Fase 2 — Perfil Público Completo (`/u/:username`)
- Tabela `social_profiles` (username único, banner, bio, redes, privacy_messenger).
- Página única de perfil agregando: artista/empreendedor/organizador + posts + stories destacados + produtos + eventos organizados/participados + medalhas + XP/Rank/Classe.
- Edição em `/meu-perfil`.

## Fase 3 — Stories (24h) + Destaques + Stories de Evento
- Tabelas: `stories` (media, expires_at, event_id?, ticket_id?), `story_views`, `story_reactions`, `story_highlights`, `story_highlight_items`.
- Bucket `stories` (público com transformação) + cleanup job (expira em 24h).
- UI: bolhas no topo do Social Pop, viewer fullscreen com progress, reações, contagem de views.
- Stories de evento aparecem na página do evento; só liberados para quem tem ingresso ou RSVP.
- Destaques permanentes por categoria no perfil.

## Fase 4 — Check-in Social + Galeria Colaborativa + Melhores Momentos + Histórico do Evento
- Tabela `event_checkins` (após validação do ingresso libera botão).
- Tabela `event_gallery` (fotos/vídeos com autorização).
- Página `/evento/:id/historico` gerada após `event_date` passar: banner, participantes, stories autorizados, melhores momentos (top por engajamento), avaliações.

## Fase 5 — Messenger Avançado
- Estender `messages`: tipo (text/image/gif/audio futuro), `read_at`, `delivered_at`, attachments.
- Tabela `message_attachments` + bucket `messenger-media`.
- Presence (`online`, `last_seen`, `typing`) via Realtime channel.
- Privacidade configurável (todos / seguidores / sigo / fãs / ninguém) na tabela `social_profiles`.
- Bloquear, silenciar, denunciar, excluir conversa.
- Ícone de mensagens com badge na navbar do Social Pop.
- Mantém o fluxo de verificação já existente.

## Fase 6 — Feed Inteligente + Tendências + Reações Estendidas
- View materializada `feed_ranking` (peso: recência, afinidade, fãs/seguidores, RSVP de eventos, engajamento).
- Página `/social/em-alta` (posts, stories, eventos, perfis, hashtags).
- Tabela `social_reactions` (❤️🔥👏😂😍👍) substituindo like simples (mantém compatibilidade com `social_likes`).
- Extração de hashtags + tabela `hashtags` + trending.

## Fase 7 — Notificações Granulares + Missões + Login Diário
- Estender `notification_preferences` com todos os novos tipos.
- Tabela `missions` (diárias/semanais) + `user_missions` + `daily_logins` (streak).
- Notificações de XP, level up, novo rank, medalha, check-in.

## Fase 8 — Antifraude + Admin "Social Pop" unificado + Performance
- Limites por janela, detecção de bots (rate, padrões), shadow-flag em `xp_events`.
- Menu admin "Social Pop" agrupando todos os sub-painéis.
- Lazy-load de stories/feed, prefetch, índices de performance, cache client.

---

## Detalhes técnicos (resumo)
- Tudo em Supabase: tabelas + RLS + GRANTs + triggers SECURITY DEFINER.
- Realtime habilitado para `stories`, `messages`, `social_reactions`, `social_notifications`.
- Arquivos novos em `src/components/social/*` (StoriesBar, StoryViewer, ReactionsBar, XpBadge, RankBadge, ClassBadge, ProfileHeader…), `src/pages/Perfil.tsx`, `src/pages/EmAlta.tsx`, `src/components/admin/AdminSocialPopPanel.tsx` (com sub-tabs).
- Compatibilidade: nada do que existe é removido — apenas estendido. Triggers de XP têm `EXCEPTION WHEN OTHERS THEN RETURN NEW` para não quebrar inserts existentes.
- Responsivo mobile-first em todas as telas novas.

---

## Sugestão de entrega
Pela escala, cada fase é uma resposta dedicada (migração → tipos → UI → admin). Posso começar **agora pela Fase 1 (XP, Níveis, Classes, Ranks, Conquistas)**, que é a fundação que tudo o resto consome.

Responda **"Siga"** para começar pela Fase 1, ou indique outra ordem.