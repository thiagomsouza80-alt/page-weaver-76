
# Social Pop — Plano de Implementação

Esta é uma feature **muito grande** (rede social completa). Para entregar com qualidade, proponho dividir em **3 fases** entregáveis. Cada fase é funcional por si só, e você aprova antes da próxima.

---

## Fase 1 — Fundação + Feed Social (MVP)

**Banco de dados** (migração única):
- `social_posts` — author_user_id, author_type (artist/entrepreneur/fan), content (text), media_urls[], media_type (text/image/video/gallery), likes_count, comments_count, created_at, hidden, deleted
- `social_comments` — post_id, user_id, parent_comment_id (para respostas), content, created_at, hidden
- `social_likes` — post_id, user_id (unique)
- `social_saved_posts` — post_id, user_id (unique)
- `social_shares` — post_id, user_id, created_at
- Storage bucket `social-media` (público) para fotos/vídeos
- RLS + GRANTs adequados (autores editam o próprio; admins tudo; leitura pública de posts não-ocultos/não-deletados)
- Função `increment_*_count` / `decrement_*_count` para likes e comments

**UI**:
- Item "Social Pop" no menu (Navbar desktop + mobile), ao lado de Empreendedores
- Rota `/social` com:
  - Composer no topo (texto + upload de imagens/vídeo) — só visível para logados
  - Feed com cards de post (avatar, nome, selo Artista/Empreendedor, mídia com carrossel se múltipla, ações curtir/comentar/compartilhar/salvar)
  - Tabs de ordenação: **Recentes**, **Populares** (likes_count), **Em alta** (likes últimas 48h)
  - Modal de comentários com respostas aninhadas (1 nível)
  - Compartilhar via Web Share API + cópia de link
  - Compressão client-side de imagens (reaproveita `imageCompression.ts`)

---

## Fase 2 — Vitrine de Empreendedores + Perfis Sociais

**Banco**:
- `social_products` — entrepreneur_id, title, description, price (numeric), gallery_images[], purchase_url, whatsapp_phone, active, created_at
- `social_follows` — follower_user_id, following_user_id (unique) — para Seguir
- Colunas em `artists`/`entrepreneurs`: `followers_count`, `following_count`, `posts_count`

**UI**:
- Aba **Vitrine** dentro do `/social` listando produtos (preço, descrição, galeria, botão "Comprar" e botão "WhatsApp" abrindo `wa.me/55...`)
- Página `/meu-perfil` ganha aba **Meus Produtos** (CRUD) — só Empreendedores
- Páginas de detalhe do artista/empreendedor ganham:
  - Aba "Publicações" (feed filtrado por autor)
  - Estatísticas: publicações / curtidas recebidas / seguidores / seguindo
  - Botão **Seguir / Seguindo**

---

## Fase 3 — Moderação + Denúncias + Notificações

**Banco**:
- `social_reports` — target_type (post/comment/user/product), target_id, reporter_user_id, reason, status (pending/reviewed/dismissed), created_at
- `social_notifications` — user_id, type (like/comment/follow/reply/share), actor_user_id, post_id, comment_id, read, created_at
- `social_user_status` — user_id, status (active/suspended/banned), until, reason
- Triggers para criar notificações automaticamente em like/comment/follow/share

**UI**:
- Botão **Denunciar** em posts, comentários, produtos e perfis (modal com motivo)
- Sino de notificações na Navbar (badge com não lidos, dropdown com lista)
- **Painel admin → nova aba "Moderação Social"** com sub-abas:
  - Publicações denunciadas / Comentários denunciados / Usuários denunciados
  - Ações: Aprovar (dismiss), Ocultar, Excluir, Suspender, Banir
- Middleware: usuários suspensos/banidos não conseguem postar/comentar

---

## Detalhes técnicos transversais
- Tudo usa os tokens semânticos do design system existente (sem cores hardcoded)
- Componentes em `src/components/social/*` e `src/components/admin/AdminSocialModerationPanel.tsx`
- Realtime opcional (Supabase channels) para feed e notificações em Fase 3
- Vídeo: upload direto para Storage, `<video controls>` nativo (sem player externo)
- Limites: imagens já comprimidas (max 1200px, JPEG 0.8), vídeo máx 25MB
- Reaproveita `uploadWithRetry`, `useAuth`, `useAdmin`

---

## O que **não** entra (para discutir depois)
- Mensagens diretas (DM) entre usuários
- Stories
- Live streaming
- Algoritmo de recomendação personalizado (usaremos apenas recência + popularidade)
- App mobile nativo

---

**Tamanho estimado**: cada fase é grande — ~10-15 arquivos novos por fase. Sugiro começarmos pela **Fase 1**. Confirma que posso seguir com a Fase 1 nesse formato? Se quiser ajustes (ex.: remover vídeo no MVP, mudar ordem das fases, incluir/excluir algo), me diz antes que eu inicio.
