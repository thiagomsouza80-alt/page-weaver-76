---
name: Refund System
description: Ticket refund flow — user-initiated, admin-approved, manual PIX with receipt
type: feature
---
## Reembolsos de ingressos

### Quem solicita
- **Apenas o comprador** (Meu Perfil → Meus Ingressos → "Solicitar reembolso").
- Organizadores e admin NÃO iniciam pedidos. Admin apenas decide/paga.

### Regras de elegibilidade (trigger `refund_requests_validate_insert`)
- Ingresso deve estar `active` (não `used`/`cancelled`).
- Evento deve ocorrer em **mais de 7 dias** a partir de agora.
- Apenas 1 pedido ativo por ingresso (unique index parcial em `pending|approved|paid`).
- Deve haver `payment_transactions.status='paid'` vinculada; ingresso gratuito é rejeitado.

### Cálculo do valor
- `amount_refundable_cents = amount_paid_cents − platform_fee_cents`.
- **Taxa da plataforma NÃO é reembolsada** — fica retida pela Amazônia Pop.

### Fluxo
1. Comprador envia pedido com motivo (>=10 chars).
2. Admin aprova ou recusa em `AdminRefundsPanel` (sidebar Financeiro).
3. Após aprovado, admin marca como pago anexando comprovante PIX (bucket privado `refund-receipts`).
4. Trigger `refund_requests_handle_update` cancela o ingresso (`tickets.status='cancelled'`) ao marcar pago. Receipt obrigatório.

### Impacto no organizador
- `organizer_financial_summary` agora retorna `refunded_cents` (pagos) e `pending_refund_cents` (pendentes+aprovados).
- Ambos são descontados de `available_cents`. Saldo nunca fica negativo (clamped em 0).

### Storage
- Bucket: `refund-receipts` (privado). Path: `{user_id}/{refund_id}.{ext}`.
- Admin: ALL via policy. Comprador: SELECT apenas do próprio (folder começa com seu uid).

### Auditoria
- `log_financial_event` registra `refund_approved`, `refund_rejected`, `refund_paid` em `financial_audit_logs`.
