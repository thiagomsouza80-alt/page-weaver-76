## Visão geral

O pedido cobre 13 frentes — algumas pequenas (corrigir busca de validador, login persistente) e outras enormes (marketplace completo com chat, Messenger privado com verificação por documento, central de notificações push, auditoria geral). Tentar tudo em uma única entrega quebraria o que já funciona. Proponho dividir em **6 fases**, cada uma entregue, testada e aprovada antes da próxima.

Cada fase entrega valor por si só. Você pode reordenar.

---

## Fase 1 — Correções rápidas e de alto impacto (entregar primeiro)

1. **Busca de validadores (item 1)**
   - Ampliar `search_users_for_validator` para também buscar em `auth.users` (e-mail) e considerar organizadores cadastrados.
   - Debounce de 300 ms no `AddValidatorDialog`, paginação (10 + "carregar mais"), foto, nome, papel, status ativo.
   - Logs em nova tabela `validator_invitation_logs` (enviado / aceito / removido).

2. **Eventos antigos com ingressos avançados (item 2)**
   - Já está disponível tecnicamente; o que falta é UX. Adicionar banner "Ative lotes e modalidades neste evento" no painel de eventos antigos (sem categorias). Nenhuma migração de dados destrutiva.

3. **Login persistente (item 4)**
   - Confirmar `persistSession: true`, `autoRefreshToken: true` no client, listener `onAuthStateChange` em `useAuth`, e remover qualquer `signOut` automático em foco/visibility. Auditoria de 1 arquivo.

4. **Conta unificada (item 9)**
   - Rota `/conta` que centraliza Perfil, Segurança, Notificações para organizador, empreendedor, artista, usuário. Reaproveita componentes existentes de `MeuPerfil`.

5. **Padronização de imagens 3:4 1080×1440 (item 11)**
   - Atualizar upload de Notícias e Eventos para forçar 3:4, crop automático centralizado (smart-crop simples baseado em foco central), preview ao vivo. Remover seletor topo/centro/baixo.

---

## Fase 2 — Central de notificações (item 3 + 6 financeiro)

- Tabela `user_notifications` (tipo, payload, lida_em) + `notification_preferences` (toggles por categoria).
- Gatilhos no banco para: novo evento, novo evento favoritado alterado, cancelado, nova notícia, curtidas, comentários, seguidores, saques (solicitado/aprovado/pago), reembolsos (solicitado/aprovado/pago).
- Tela `Conta → Notificações` com toggles por categoria.
- Sino na navbar + lista em `/conta/notificacoes`.
- **Push web (PWA):** Service Worker + Web Push API com VAPID. Requer 2 segredos (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`) — solicitarei na hora.
- Lembretes de inatividade: cron via Edge Function diária.

---

## Fase 3 — Privacidade e responsividade (itens 10 + 12)

- Campos obrigatórios em todos os cadastros: foto, nome, e-mail, nascimento, WhatsApp.
- Toggles `hide_email` / `hide_phone` no perfil; views públicas respeitam; admin sempre vê.
- Sweep de responsividade: navbar mobile, tabelas (`overflow-x-auto`), painéis admin, dashboard organizador.

---

## Fase 4 — Marketplace de Empreendedores (item 5 + parte do 6)

Já existe `social_products` básico. Expandir para marketplace real:

- Adicionar campos: `category`, `stock`, `external_url`, `whatsapp_number`, `enable_chat`.
- Páginas: `/marketplace` (lista global), `/empreendedor/:slug/produtos`, detalhe do produto.
- Botões configuráveis por produto: Comprar no site / WhatsApp (`wa.me/?text=`) / Chat interno.
- Notificações: novo interesse, nova mensagem (integra com Fase 5).

---

## Fase 5 — Messenger privado com verificação (itens 7 + 8)

- Tabela `messaging_verification_requests` (selfie, documento, status). Upload em bucket privado `messaging-verification`.
- Painel admin para aprovar/recusar; usuários aprovados recebem flag `messaging_verified` e selo ✅.
- Tabelas `conversations`, `conversation_participants`, `messages` (com imagens via bucket `messages`).
- Realtime via `postgres_changes` para entregar mensagens ao vivo.
- Menu 💬 Mensagens no Social Pop. Bloqueio para não verificados.

---

## Fase 6 — Auditoria geral (item 13)

Após as fases anteriores: rodar `security--run_security_scan`, `supabase--linter`, varredura de RLS, testes manuais em fluxos de pagamento (MisticPay), reembolso, saque, validação. Entrega: relatório com correções aplicadas.

---

## Detalhes técnicos (referência)

- Push web: VAPID + `web-push` (Deno) em Edge Function; assinaturas em `push_subscriptions`.
- Realtime do Messenger: `ALTER PUBLICATION supabase_realtime ADD TABLE public.messages`.
- Smart-crop 3:4: canvas client-side, foco no centro com detecção de bordas simples; fallback `object-fit: cover`.
- Login persistente já está habilitado no client gerado; auditoria confirmará se algum hook está chamando `signOut` indevidamente.
- Marketplace e Messenger reaproveitam infra do Social Pop (`social_posts`, buckets, notificações).

---

## O que preciso de você antes de começar

1. **Confirma esta ordem** (Fase 1 → 6) ou prefere priorizar Messenger/Marketplace antes?
2. **Push web real ou só notificações internas (sino + toast)?** Push real exige gerar chaves VAPID.
3. **Verificação do Messenger:** posso reusar `pending_updates` existente ou prefere fluxo dedicado novo?
4. **Tudo aprovado?** Começo pela **Fase 1** imediatamente após sua resposta.