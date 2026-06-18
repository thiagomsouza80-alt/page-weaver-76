## Objetivo

Adicionar **lotes** e **modalidades de ingresso** (Inteira, Meia, Solidário, PCD, Idoso, Cortesia) ao Amazônia Pop, sem quebrar reembolsos, financeiro, saques, MisticPay, validadores, QR Codes e eventos legados.

Estratégia: **3 fases incrementais**. Eventos antigos continuam funcionando no modo atual (legado automático) — só passam a usar lotes/modalidades se o organizador editar e ativar.

---

## Fase A — Schema + criação no painel do organizador

**Banco (migration única):**

- `event_ticket_batches` — lotes do evento
  - event_id, name, quantity, price_cents, starts_at, ends_at, sort_order, status (auto: scheduled/active/ended/sold_out)
- `event_ticket_categories` — modalidades
  - event_id, batch_id (nullable), kind (`full|half|solidarity|pcd|elderly|courtesy`), name, description, price_cents, is_free, quantity, per_user_limit, sale_starts_at, sale_ends_at, is_active, requires_document, requires_donation, donation_description, sort_order
- `event_courtesy_codes` — códigos promocionais de cortesia
  - category_id, code (único), max_uses, used_count, expires_at, created_by
- `tickets` ganha colunas: `category_id`, `batch_id`, `category_kind`, `category_name`, `batch_name`, `unit_price_cents`, `is_courtesy`, `courtesy_code_id`, `document_verified_at`, `donation_verified_at` (todas nullable → legado intacto)
- `events.use_batches boolean default false` (opt-in)
- Função `event_category_available(category_id)` → calcula restante respeitando lote + quantidade
- Função `event_current_batch(event_id)` → retorna lote ativo agora
- Trigger em `tickets` para preencher snapshot de categoria/lote e validar limite por usuário + per_user_limit
- RLS: organizador dono gerencia tudo; público lê categorias/lotes ativos; cortesia code só leitura via RPC

**Frontend organizador (`OrganizadorEvento` ou form de criação):**

- Aba "Ingressos" com 2 sub-seções: **Lotes** e **Modalidades**
- Checkbox "Utilizar lotes" no evento
- CRUD de lotes (cards com status calculado)
- CRUD de modalidades (cada uma com seu kind, vínculo de lote, limite por usuário, requisitos)
- Painel de cortesia: gerar N códigos OU buscar usuário (RPC `search_users_for_validator` já existe) e atribuir ingresso direto

Sem mudança no fluxo de compra ainda — eventos editados começam a aparecer com modalidades, mas o botão atual continua usando o caminho legado se não houver categorias.

---

## Fase B — Compra pública + taxa condicional + limites

**`TicketRedeemButton` / página do evento:**

- Se evento tem categorias ativas: substitui o botão único por lista de modalidades:
  - Nome, descrição, preço, restante, lote atual, requisitos (ícones ♿ 👴 🎁), botão "Adquirir"
  - Mostra "Esgotado" / "Encerrado" / "Em breve" conforme status
- Diálogo de compra:
  - Avisos obrigatórios (checkbox de aceite) para half/solidarity/pcd/elderly conforme `requires_document`/`requires_donation`
  - Campo opcional "Código de cortesia" quando aplicável
  - Respeita `per_user_limit` (consulta server-side antes de gerar PIX)
- **Taxa da plataforma** (`platformFee`): aplicada SÓ se `is_free=false` E `category_kind != 'courtesy'`. Cortesia e qualquer modalidade gratuita ficam isentas.
- `misticpay-create-charge` recebe `category_id`; valida elegibilidade, calcula preço a partir do lote/categoria do servidor (não confia no client), grava snapshot em `tickets` e `payment_transactions`.
- Compatibilidade: eventos sem categorias usam o caminho atual idêntico ao de hoje. Reembolso continua olhando `payment_transactions` — sem mudanças.

---

## Fase C — Validador + relatórios + finalização

**Validador (`ValidadorEvento` / `ContinuousScanner`):**

- Tela do ticket mostra: nome, modalidade (ícone + nome), lote, status
- Quando `requires_document` ou `requires_donation` → validação em **2 passos**:
  1. Scan → mostra alerta amarelo "Conferir documento" / "Receber doação: <descrição>"
  2. Validador marca checkbox "Conferido" e confirma → grava `document_verified_at`/`donation_verified_at` e marca `used`
- `log_validation` ganha campo extra no metadata: `category_kind`, `verification_required`, `verified_by`

**Painel do organizador — relatórios:**

- `OrganizadorEvento` → tabela atual mantida + nova seção "Por modalidade":
  - Linhas: Inteira / Meia / Solidário / PCD / Idoso / Cortesia
  - Colunas: Disponível · Resgatado · Receita · Taxas · % Ocupação
- Filtro por modalidade/lote na tabela de participantes
- Export CSV ganha colunas modalidade e lote

**Polimento:**

- Mobile: cards de modalidade em coluna única, scroll horizontal nos lotes
- Sem alterações em saques, financeiro, MisticPay webhook (recebe a transação igual), reembolso (continua usando `amount_paid_cents - platform_fee_cents`)

---

## Riscos & mitigação

- **Eventos legados:** todas as novas colunas nullable + flag `use_batches` opt-in. Caminho de código atual permanece como fallback quando o evento não tem categorias.
- **Taxa em cortesia:** centralizada numa função utilitária `computeFee(category)` para garantir consistência client/server.
- **Reembolso:** intocado — opera sobre `payment_transactions`. Cortesias não geram transação paga, então naturalmente ficam fora.
- **MisticPay webhook:** continua atualizando `tickets`/`payment_transactions` por `external_id`; só passa a ter snapshot de categoria/lote.

---

## Entrega

- Cada fase = 1 ou 2 turns. Ao fim de A peço review antes de seguir para B; mesma coisa entre B e C.
- Começo agora pela **Fase A** assim que aprovar.