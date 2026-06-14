# Plano: Melhorias estruturais Amazônia Pop

Escopo grande dividido em 5 fases. Nenhuma funcionalidade existente (ingressos, organizadores, validadores, financeiro, MisticPay, banco, social) será alterada na lógica — apenas reorganização visual, navegação e responsividade.

## Fase 1 — Admin Dashboard reorganizado

Atualmente `AdminDashboard.tsx` tem uma lista plana de 18 abas. Vou refatorar para sidebar com grupos expansíveis (collapsible/accordion), mantendo todos os panels existentes intactos.

Grupos:
- **📰 Conteúdo**: Notícias, Eventos, Artistas, Empreendedores, Apoiadores, Atualizações, Banners
- **👥 Comunidade**: Ranking de Fãs, Membros Pagos, Sorteios, Moderação Social
- **🎟️ Eventos e Ingressos**: Validar Ingressos, Organizadores, Banco de Dados
- **💰 Financeiro**: Solicitações de Saque, Controle Financeiro, Gateway
- **⚙️ Sistema**: E-mails Órfãos, Configurações (nova aba placeholder), Logs (nova aba placeholder)

Persistência do estado de grupos abertos/recolhidos via `localStorage`. Sidebar fixa no desktop, recolhível no tablet, hambúrguer no mobile (usando Sheet do shadcn).

## Fase 2 — Login persistente

Atualizar `src/integrations/supabase/client.ts` — já usa `localStorage` + `persistSession: true` + `autoRefreshToken: true`. Adicionar:
- `detectSessionInUrl: true`
- Garantir que nenhum fluxo chama `signOut()` automaticamente em mount/erros transitórios.

Auditar `useAuth`/`useAdmin` para não forçar logout em falhas de rede. Logout só via botão "Encerrar Sessão".

## Fase 3 — Reorganização "Minha Conta" / remover "Ingressos" do nav mobile

`MeuPerfil.tsx` será reorganizado em tabs/seções:
- 👤 Meu Perfil (nome, foto, telefone, e-mail, senha)
- 🎟️ Meus Ingressos
- 📅 Eventos Participando
- 🕘 Histórico
- ⚙️ Configurações
- 🚪 Encerrar Sessão

`MobileBottomNav.tsx` — substituir item "Ingressos" por "Social Pop":
`[Início, Notícias, Eventos, Social, Conta]`

A área Conta agrupa ingressos + perfil. Funcionalidades existentes preservadas, apenas reorganizadas em tabs.

## Fase 4 — Social Pop como menu independente

Adicionar link "Social Pop" no Navbar principal e no MobileBottomNav. Já existe `/social` (`SocialPop.tsx`) — apenas promover na navegação.

## Fase 5 — Responsividade

Aplicar padrão tabela-desktop / cards-mobile em:
- `AdminFinancePanel`
- `AdminWithdrawalsPanel`
- `AdminDatabasePanel`
- `AdminTicketValidationPanel`
- `OrganizerFinancePanel`

Padrão: `<div className="hidden md:block">tabela</div>` + `<div className="md:hidden space-y-3">cards</div>`.

Menu mobile do Navbar com `max-w-[85%]` e scroll suave (`overflow-y-auto`).

## Detalhes técnicos

**Arquivos editados:**
- `src/pages/AdminDashboard.tsx` — sidebar reagrupada + responsiva
- `src/components/MobileBottomNav.tsx` — substituir Ingressos por Social
- `src/components/Navbar.tsx` — adicionar Social Pop + ajustar menu mobile largura
- `src/pages/MeuPerfil.tsx` — reorganizar em tabs Conta/Ingressos/etc
- `src/integrations/supabase/client.ts` — **NÃO** será editado (é auto-gen); apenas confirmo que já está correto
- `src/components/admin/AdminFinancePanel.tsx`, `AdminWithdrawalsPanel.tsx`, `AdminDatabasePanel.tsx`, `AdminTicketValidationPanel.tsx` — adicionar versão mobile em cards
- `src/components/organizer/OrganizerFinancePanel.tsx` — idem

**Arquivos novos:**
- `src/components/admin/AdminSettingsPanel.tsx` (placeholder)
- `src/components/admin/AdminLogsPanel.tsx` (placeholder ou ligar a `validations_log`/`financial_audit_logs`)
- `src/hooks/useSidebarState.ts` (persistência localStorage)

**Performance (item 10):** já há React Query no projeto. Vou garantir `staleTime` configurado e adicionar `loading="lazy"` em `<img>` que ainda não tenham. Skeleton loading já existe via `components/ui/skeleton`.

**Padronização visual:** mantém tokens HSL atuais (roxo `265 80% 55%`, azul accent já no design system). Sem mudança de paleta.

## Fora deste plano (não alterar)

Lógica de ingressos, organizadores, validadores, MisticPay, financeiro, banco e Social Pop — apenas reagrupados visualmente.

## Estimativa

~12 arquivos editados, 3 novos. Sem migrations. Sem mudanças de schema.
