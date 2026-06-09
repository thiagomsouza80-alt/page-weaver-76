import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// =============================================================
// MisticPay - Webhook de pagamento
// =============================================================
// IMPORTANTE: Substituir a validação de assinatura abaixo pelo
// método oficial da MisticPay quando a documentação for fornecida.
// O fluxo de liberação de ingresso já está implementado e seguro.
// =============================================================

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const rawBody = await req.text();
    const payload = JSON.parse(rawBody);

    // ===========================================================
    // TODO MISTICPAY - Validar assinatura HMAC do header
    // ex.: const signature = req.headers.get("x-misticpay-signature");
    // verifyHmac(rawBody, signature, Deno.env.get("MISTICPAY_WEBHOOK_SECRET"));
    // ===========================================================

    // Estrutura esperada (a confirmar com a doc):
    // { event: "payment.paid" | "payment.cancelled" | "payment.expired",
    //   data: { id: <provider_transaction_id>, reference: <our tx.id>, paid_at?: string } }
    const eventType: string = payload.event ?? payload.status ?? "unknown";
    const providerId: string | undefined = payload.data?.id ?? payload.transaction_id;
    const reference: string | undefined = payload.data?.reference ?? payload.reference;

    if (!providerId && !reference) {
      return json({ error: "Identificador ausente" }, 400);
    }

    // Localizar transação
    const { data: tx } = await admin
      .from("payment_transactions")
      .select("*")
      .or(`provider_transaction_id.eq.${providerId ?? ""},id.eq.${reference ?? "00000000-0000-0000-0000-000000000000"}`)
      .maybeSingle();

    if (!tx) return json({ error: "Transação não encontrada" }, 404);

    // Idempotência
    if (tx.status === "paid" && (eventType.includes("paid") || eventType === "approved")) {
      return json({ ok: true, idempotent: true });
    }

    if (eventType.includes("paid") || eventType === "approved" || eventType === "payment.paid") {
      // Liberar ingresso usando o sistema existente
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
          payment_reference: tx.provider_transaction_id ?? tx.id,
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
        metadata: { ticket_id: ticket.id, provider: tx.provider, provider_transaction_id: tx.provider_transaction_id },
      });

      return json({ ok: true, ticket_id: ticket.id });
    }

    if (eventType.includes("cancel") || eventType === "payment.cancelled") {
      await admin.from("payment_transactions").update({ status: "cancelled", raw_payload: payload }).eq("id", tx.id);
      return json({ ok: true });
    }

    if (eventType.includes("expire") || eventType === "payment.expired") {
      await admin.from("payment_transactions").update({ status: "expired", raw_payload: payload }).eq("id", tx.id);
      return json({ ok: true });
    }

    await admin.from("payment_transactions").update({ raw_payload: payload }).eq("id", tx.id);
    return json({ ok: true, unhandled: eventType });
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
