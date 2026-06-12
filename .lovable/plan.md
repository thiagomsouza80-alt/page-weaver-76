# Sistema de Validadores Internos do Amazônia Pop

Permitir que organizadores deleguem a validação de ingressos a usuários já cadastrados na plataforma, sem compartilhar senhas, com modo de leitura contínua para eventos de grande porte.

---

## 1. Banco de dados (migração)

### Tabela `event_validators`
Vincula um usuário cadastrado a um evento como validador, com janela de validade e permissões.

Campos principais:
- `event_id` (FK events) / `organizer_id` (FK organizers) / `user_id` (FK auth.users)
- `validator_name`, `validator_email` (snapshot)
- `permissions` jsonb (`scan_qr`, `search_code`, `view_stats` — todos default true)
- `starts_at`, `ends_at`
- `status` (`active` | `suspended`)
- `added_by` (organizer user_id), `last_access_at`

Constraint: único por (event_id, user_id).

### Tabela `validations_log`
Auditoria de cada leitura (válida, repetida ou não encontrada).
Campos: event_id, ticket_id (nullable), validator_user_id, validator_name, participant_name, scanned_code, result (`valid`/`used`/`notfound`/`cancelled`), ip_address, user_agent, created_at.

### RPC `search_users_for_validator(_q text)` (SECURITY DEFINER)
Busca usuários cadastrados (artists + entrepreneurs + organizers) por nome/email/telefone. Retorna `{user_id, name, email, city, avatar_url, account_type}`. Só callable por organizers/admin (checa role do caller). Limite 20 resultados; não retorna dados sensíveis (cpf, dob, etc.).

### RPC `validator_event_summary(_event_id uuid)` (SECURITY DEFINER)
Retorna `{tickets_total, tickets_validated, tickets_remaining}` para validadores autorizados (e organizer/admin).

### RPC `is_event_validator(_user uuid, _event uuid)` (SECURITY DEFINER STABLE)
Helper para RLS — retorna true se há linha ativa em `event_validators` dentro da janela.

### Atualizações de RLS
- `tickets`: nova policy permitindo `SELECT` e `UPDATE` (apenas colunas de validação) para validadores ativos do evento via `is_event_validator`.
- `events`: nova policy `SELECT` para validadores ativos (só seus eventos autorizados).
- `event_validators`: organizer gerencia os próprios; validador lê apenas os seus; admin total.
- `validations_log`: INSERT via SECURITY DEFINER no app; SELECT para organizer do evento + admin + o próprio validador.

GRANTs explícitos a `authenticated` e `service_role` conforme padrão do projeto.

---

## 2. Edge Function `validator-notify`
Ao adicionar um validador: envia notificação interna (social_notifications) + e-mail via infra de app emails existente, com texto:
"Você foi adicionado à equipe de validação do evento [X]. Faça login em sua conta Amazônia Pop para acessar."

---

## 3. UI — Painel do Organizador

Em `src/components/organizer/OrganizerDashboard.tsx`, nova aba **Equipe de Validação** com dois componentes:

### `OrganizerValidatorsPanel.tsx`
- Lista de validadores do organizador (todos os eventos), com foto, nome, evento vinculado, último acesso, nº validações, status (🟢/🔴).
- Ações: Suspender, Reativar, Remover.

### `AddValidatorDialog.tsx`
- Campo busca (nome/email/telefone) → chama RPC `search_users_for_validator`.
- Card de resultado com foto, nome, cidade, conta.
- Botão "Adicionar como Validador" → seleciona evento (select dos eventos do organizer), datas início/fim, checkboxes de permissões.
- Confirma → INSERT em `event_validators` + invoca `validator-notify`.

---

## 4. UI — Painel do Validador

### Detecção de role
Em `useAuth.ts` adicionar flag `isValidator` (existe alguma linha ativa em `event_validators` para o usuário).

### Nova rota `/validador`
Página `Validador.tsx` mostrando **🎟️ Meus Eventos** — lista de eventos autorizados com data, local, validados/restantes (via `validator_event_summary`).

Na Navbar, item "Validação" aparece quando `isValidator`.

### Rota `/validador/eventos/:id`
- Stats em tempo real (Realtime na tabela `tickets` filtrado por event_id).
- Botão grande "📷 Validar Ingresso" → abre `ContinuousScanner`.
- Aba "🔍 Buscar por código" — input manual.

---

## 5. Componente `ContinuousScanner.tsx` (coração do sistema)

Reescreve a lógica de `AdminTicketValidationPanel` em modo contínuo, reutilizável também no painel admin:

- Abre câmera automaticamente (html5-qrcode) com `facingMode: environment`.
- Mantém scanner ativo após cada leitura.
- Overlay de resultado por **2 s** (fundo verde/amarelo/vermelho conforme `valid`/`used`/`notfound`), sem ocultar a câmera; depois some sozinho.
- Anti-duplicidade: ignora o mesmo `decodedText` por 3 s (Map de último timestamp por código).
- Bips Web Audio: 1 curto (válido), 2 (já usado), 3 graves (inválido). Toggle 🔊/🔇 persistido em localStorage.
- Controles: ⏸️ Pausar / ▶️ Retomar, 🔄 Reiniciar, 📷 Trocar Câmera (lista devices), 🔦 Flash (torch quando suportado).
- Stats topo: 👥 total / ✅ validados / ⏳ restantes (atualiza via Realtime).
- Cada leitura grava em `validations_log` (via RPC `log_validation` SECURITY DEFINER que aceita o resultado e captura user-agent do client).
- Atualiza `last_access_at` do validador na primeira leitura da sessão.

A consulta manual usa o mesmo fluxo de resolução (`code` ou `qr_token`).

---

## 6. Segurança

- RLS impede que validador veja outros eventos, dados financeiros, saques, dados bancários ou outros organizadores.
- Frontend não importa nenhum panel financeiro na área do validador.
- Edge function nunca expõe service-role ao cliente; tudo passa por RPC com checagem de papel.
- Validador só pode UPDATE em `tickets` para mudar `status` para `used`, `used_at`, `used_by` (policy com `WITH CHECK` restritivo).

---

## 7. Detalhes técnicos

- `html5-qrcode` já está instalado.
- Bips gerados com `AudioContext` (sem dependência externa).
- Flash via `track.applyConstraints({ advanced: [{ torch: true }] })` quando disponível.
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets` (se ainda não estiver).
- Navbar e roteamento (`src/App.tsx`) ganham `/validador` e `/validador/eventos/:id`.

---

## 8. Itens fora do escopo desta entrega
- Exportação de relatório de validações (pode ser adicionado depois).
- App nativo / PWA offline para portaria sem internet.

Confirma para eu seguir com a implementação?
