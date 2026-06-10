import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// =============================================================
// MisticPay - Webhook de pagamento (Depósito / Saque / MED)
// Doc: https://docs.misticpay.com/
//
// Payload de Depósito:
// {
//   "transactionId": 31484480,             // ID retornado pela MisticPay
//   "transactionType": "DEPOSITO",
//   "transactionMethod": "PIX",
//   "clientName": "...",
//   "clientDocument": "...",
//   "status": "COMPLETO" | "PENDENTE" | "FALHA" | "CANCELADO",
//   "value": 455,
//   "fee": 23,
//   "e2e": "..."
// }
//
// A doc atual não define assinatura HMAC. Usamos um shared secret
// passado como query param `?secret=...` na projectWebhook (definida
// na criação da cobrança). Configure MISTICPAY_WEBHOOK_SECRET.
// =============================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Validação do shared secret (recomendado)
    const expectedSecret = Deno.env.get("MISTICPAY_WEBHOOK_SECRET");
    if (expectedSecret) {
      const url = new URL(req.url);
      const provided =
        url.searchParams.get("secret") ||
        req.headers.get("x-webhook-secret") ||
        "";
      if (provided !== expectedSecret) {
        return json({ error: "Invalid webhook secret" }, 401);
      }
    }

    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);

    // ----- Webhook de MED (infração) -----
    if (payload?.event === "INFRACTION") {
      await admin.from("financial_audit_logs").insert({
        action: "med_infraction",
        entity_type: "med",
        entity_id: null,
        metadata: payload,
      });
      return json({ ok: true, type: "infraction" });
    }

    const txType: string = String(payload?.transactionType || "").toUpperCase();
    const status: string = String(payload?.status || "").toUpperCase();
    const providerId = payload?.transactionId != null ? String(payload.transactionId) : "";

    if (!providerId) return json({ error: "transactionId ausente" }, 400);

    // ----- Webhook de Saque (RETIRADA) -----
    if (txType === "RETIRADA") {
      // Registra no log de auditoria — vínculo com withdrawal_request
      // será feito quando o admin processar o saque automaticamente.
      await admin.from("financial_audit_logs").insert({
        action: "withdrawal_webhook",
        entity_type: "withdrawal_request",
        entity_id: null,
        metadata: payload,
      });
      return json({ ok: true, type: "withdrawal" });
    }

    // ----- Webhook de Depósito (DEPOSITO) -----
    const { data: tx } = await admin
      .from("payment_transactions")
      .select("*")
      .eq("provider_transaction_id", providerId)
      .maybeSingle();

    if (!tx) return json({ error: "Transação não encontrada", provider_id: providerId }, 404);

    // Idempotência
    if (tx.status === "paid" && status === "COMPLETO") {
      return json({ ok: true, idempotent: true });
    }

    if (status === "COMPLETO") {
      const { data: ticket, error: ticketErr } = await admin
        .from("tickets")
        .insert({
          event_id: tx.event_id,
          user_id: tx.buyer_user_id,
          holder_name: tx.buyer_name,
          holder_email: tx.buyer_email,
          holder_phone: tx.buyer_phone,
          price_cents: tx.amount_cents,
          platform_fee_cents: tx.fee_cents,
          payment_status: "paid",
          payment_method: "pix",
          payment_reference: providerId,
        })
        .select("id")
        .single();

      if (ticketErr) {
        await admin.from("payment_transactions").update({
          status: "failed",
          raw_payload: payload,
        }).eq("id", tx.id);
        return json({ error: "Falha ao gerar ingresso", detail: ticketErr.message }, 500);
      }

      await admin.from("payment_transactions").update({
        status: "paid",
        paid_at: new Date().toISOString(),
        ticket_id: ticket.id,
        raw_payload: payload,
      }).eq("id", tx.id);

      await admin.from("financial_audit_logs").insert({
        action: "payment_confirmed",
        entity_type: "payment_transaction",
        entity_id: tx.id,
        metadata: { ticket_id: ticket.id, provider: "misticpay", provider_transaction_id: providerId, e2e: payload?.e2e },
      });

      return json({ ok: true, ticket_id: ticket.id });
    }

    if (status === "CANCELADO") {
      await admin.from("payment_transactions").update({ status: "cancelled", raw_payload: payload }).eq("id", tx.id);
      return json({ ok: true });
    }

    if (status === "FALHA") {
      await admin.from("payment_transactions").update({ status: "failed", raw_payload: payload }).eq("id", tx.id);
      return json({ ok: true });
    }

    // PENDENTE ou outros
    await admin.from("payment_transactions").update({ raw_payload: payload }).eq("id", tx.id);
    return json({ ok: true, unhandled_status: status });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
