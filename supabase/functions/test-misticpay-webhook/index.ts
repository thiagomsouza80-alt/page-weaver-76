// TEMPORARY — apenas para teste E2E. Remover após validar.
// Recebe { transaction_id } (id da nossa payment_transactions), monta um payload
// de webhook idêntico ao da MisticPay e chama o webhook real com o secret.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { transaction_id } = await req.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: tx } = await admin
      .from("payment_transactions")
      .select("provider_transaction_id, total_cents, fee_cents, buyer_name, buyer_email")
      .eq("id", transaction_id)
      .maybeSingle();
    if (!tx?.provider_transaction_id) {
      return new Response(JSON.stringify({ error: "tx ou provider_transaction_id ausente" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const secret = Deno.env.get("MISTICPAY_WEBHOOK_SECRET") || "";
    const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/misticpay-webhook?secret=${encodeURIComponent(secret)}`;
    const payload = {
      transactionId: tx.provider_transaction_id,
      transactionType: "DEPOSITO",
      transactionMethod: "PIX",
      clientName: tx.buyer_name,
      clientDocument: "11144477735",
      status: "COMPLETO",
      value: tx.total_cents / 100,
      fee: tx.fee_cents / 100,
      e2e: "E2E-TEST-" + crypto.randomUUID(),
    };
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await r.text();
    return new Response(JSON.stringify({ status: r.status, body }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
