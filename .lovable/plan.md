## Reestruturação Cadastro + Perfil + Classes

Entrega única. Coluna `segment` permanece no banco (legado) mas deixa de ser usada/exibida em qualquer tela nova. Classe vira o único eixo de categorização.

### 1. Banco de dados (1 migração)
- Adicionar `class_id uuid` em `user_profiles` (FK opcional para `classes`).
- Atualizar trigger `ensure_user_profile` para aceitar `class_id` vindo do signup `raw_user_meta_data`.
- Backfill: mapear `artists.segment` → `classes.name` (cosplayer→Cosplayer, kpop→Army, youtuber→Youtuber/Criador, influenciador_digital→Influenciador, fan_cultura_pop→Fã, etc.) e gravar `user_profiles.class_id` quando ainda nulo.
- Para empreendedores existentes sem classe: setar Classe "Empreendedor". Organizadores: "Organizador de Eventos".
- Adicionar Classes faltantes do brief (Youtuber separado do "Criador de Conteúdo") e reordenar ícones/cores conforme lista.
- Função `recalc_user_rank` e demais permanecem intocadas (compatibilidade total com XP/Ranks/Conquistas).

### 2. Cadastro
- `CadastroArtistaForm`: remover campo "Segmento", adicionar seletor visual de **Classe** (obrigatório) — grid de chips com ícone + cor da `classes` table. Salvar `class_id` no `user_profiles` via `auth.signUp({ options: { data: { class_id } } })` que o trigger lê.
- `CadastroEmpreendedorForm`: define automaticamente Classe "Empreendedor" (sem seletor).
- `CadastroOrganizadorForm`: define automaticamente Classe "Organizador de Eventos" (sem seletor).
- Página `Cadastro.tsx` mantém os 3 fluxos atuais.

### 3. Novo Perfil (`MeuPerfil.tsx`)
Reescrita completa. Layout clean focado em identidade:

```text
┌─────────────────────────────────┐
│   [Banner com gradiente]    [⋮] │ ← menu superior direito
│  [Avatar]                       │
│   Nome · @username              │
│   [Classe chip] [Rank badge]    │
│   Nível N — [████░░] XP         │
│   ♥ N fãs · 👥 N seguidores     │
│   Bio curta                     │
│   [Seguir] [Sou fã]             │
├─────────────────────────────────┤
│ Tabs: Publicações | Destaques   │
│       Estatísticas | Conquistas │
│       Galeria                   │
└─────────────────────────────────┘
```
Remover da tela principal: editor de perfil público, ClassPicker, NotificationSettings, MessengerVerification, MyProducts, MeusIngressos, configurações. Todos passam para o menu (≡).

### 4. Menu superior do perfil
Novo componente `ProfileSettingsMenu.tsx` (Sheet lateral direito) com categorias colapsáveis:
- **Minha Conta** → Editar perfil, Alterar foto, Alterar banner, Alterar Classe, Alterar bio
- **Ingressos** → Meus ingressos, Histórico, Reembolsos
- **Marketplace** (se aplicável) → Meus produtos, Mensagens, Pedidos
- **Organizador** (se aplicável) → Meus eventos, Financeiro, Validadores, Relatórios
- **Privacidade** → toggles (ocultar e-mail, WhatsApp, quem envia mensagens, quem vê stories, bloqueados)
- **Notificações** → preferências por canal
- **Segurança** → Alterar senha, Sessões, 2FA (placeholder "em breve")
- **Privacidade e Dados** → Baixar dados, Excluir conta, Política, Termos
- **Sair**

Cada item abre dialog/sheet aninhado reaproveitando componentes existentes (PublicProfileEditor, NotificationSettingsCard, MessengerVerificationCard, MyProductsSection, MeusIngressosSection, RefundRequestDialog, etc.).

### 5. Filtros, Ranking, Busca
- `Artistas.tsx`, `ArtistsSection.tsx`, `ArtistaDetalhe.tsx`: substituir filtro/exibição de Segmento por Classe (join `user_profiles.class_id → classes`).
- `AdminArtistsPanel`, `AdminFanRankingPanel`, `AdminDatabasePanel`: coluna Classe; remover seletor de Segmento dos forms admin.
- Social Pop / Ranking: filtrar por `class_id`.
- Edge function `og-preview`: usar Classe quando disponível, fallback no segment legado.

### 6. Admin de Classes
Adicionar aba em `AdminSocialPopPanel` (já existente): CRUD de `classes` (nome, ícone Lucide, cor hex, descrição, `is_active`, `sort_order`). Usa políticas RLS já existentes para admin.

### 7. Validação final
- `rg -i "segmento|segment"` deve retornar só legados em migrations antigas, `types.ts` auto-gerado, e a coluna `artists.segment` (intocada). Tudo o que é UI/filtro/cadastro removido.
- Smoke test: cadastrar artista, ver Classe salva, perfil carrega sem pedir Classe de novo, menu abre, filtros funcionam.

### Detalhe técnico
- Trigger `ensure_user_profile` lê `NEW.raw_user_meta_data->>'class_id'`.
- Formulários passam `options.data.class_id`.
- Editor de Classe no menu usa `ClassPicker` já existente (gravando em `user_profiles.class_id`, não mais em `user_progression.class_id` — `user_progression.class_id` continua mas espelha a escolha).
- Trigger adicional: ao atualizar `user_profiles.class_id`, propagar para `user_progression.class_id` para manter compatibilidade com badges/UI existentes.

Confirma para eu executar tudo de uma vez?