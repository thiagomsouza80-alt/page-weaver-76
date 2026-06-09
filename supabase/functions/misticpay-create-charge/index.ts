import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// =============================================================
// MisticPay - Criar cobrança PIX
// =============================================================
// IMPORTANTE: As chamadas HTTP reais para a MisticPay estão marcadas
// com "TODO MISTICPAY" abaixo. Substitua pelos endpoints reais quando
// a documentação oficial for fornecida. A estrutura, segurança e
// integração com o banco já estão completas e funcionais.
// =============================================================

interface Body {
  event_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authErr } = await supabase.auth.getClaims(token);
    if (authErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub;

    const body = (await req.json()) as Body;
    if (!body.event_id || !body.buyer_name || !body.buyer_email || !body.buyer_phone) {
      return json({ error: "Campos obrigatórios ausentes" }, 400);
    }

    // 1) Evento + preço
    const { data: ev, error: evErr } = await admin
      .from("events")
      .select("id, title, ticket_type, ticket_price_cents, tickets_total, organizer_id")
      .eq("id", body.event_id)
      .maybeSingle();
    if (evErr || !ev) return json({ error: "Evento não encontrado" }, 404);
    if (ev.ticket_type !== "paid") return json({ error: "Evento não é pago" }, 400);

    // 2) Disponibilidade
    if (ev.tickets_total) {
      const { count } = await admin
        .from("tickets")
        .select("id", { count: "exact", head: true })
        .eq("event_id", ev.id)
        .neq("status", "cancelled");
      if ((count ?? 0) >= ev.tickets_total) {
        return json({ error: "Ingressos esgotados" }, 409);
      }
    }

    // 3) Taxa global
    const { data: settings } = await admin.from("platform_settings").select("ticket_fee_cents").eq("id", true).maybeSingle();
    const feeCents = settings?.ticket_fee_cents ?? 100;
    const amountCents = ev.ticket_price_cents;
    const totalCents = amountCents + feeCents;

    // 4) Criar transaction (pending)
    const { data: tx, error: txErr } = await admin
      .from("payment_transactions")
      .insert({
        event_id: ev.id,
        organizer_id: ev.organizer_id,
        buyer_user_id: userId,
        buyer_name: body.buyer_name,
        buyer_email: body.buyer_email,
        buyer_phone: body.buyer_phone,
        amount_cents: amountCents,
        fee_cents: feeCents,
        total_cents: totalCents,
        provider: "misticpay",
        status: "pending",
      })
      .select("*")
      .single();
    if (txErr || !tx) return json({ error: "Falha ao registrar transação", detail: txErr?.message }, 500);

    // ===========================================================
    // TODO MISTICPAY - Substituir pelo POST real à API da MisticPay
    // ===========================================================
    // const clientId = Deno.env.get("MISTICPAY_CLIENT_ID");
    // const clientSecret = Deno.env.get("MISTICPAY_CLIENT_SECRET");
    // const apiBase = Deno.env.get("MISTICPAY_ENV") === "production"
    //   ? "https://api.misticpay.com" : "https://sandbox.misticpay.com";
    // const resp = await fetch(`${apiBase}/v1/charges`, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     Authorization: `Bearer ${await getAccessToken(clientId, clientSecret, apiBase)}`,
    //   },
    //   body: JSON.stringify({
    //     amount: totalCents,
    //     customer: { name: body.buyer_name, email: body.buyer_email, phone: body.buyer_phone },
    //     reference: tx.id,
    //     webhook_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/misticpay-webhook`,
    //   }),
    // });
    // const charge = await resp.json();

    // STUB temporário até a doc oficial chegar:
    const charge = {
      id: `STUB-${tx.id.slice(0, 8)}`,
      qrcode: `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
        `PIX|MISTICPAY-STUB|${tx.id}|${totalCents}`
      )}`,
      copy_paste: `00020126STUBPIX${tx.id}${totalCents}5204000053039865802BR6009AMAZONIAPOP62070503***6304MISTIC`,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };

    // 5) Atualizar transaction com dados do PIX
    await admin
      .from("payment_transactions")
      .update({
        provider_transaction_id: charge.id,
        pix_qrcode: charge.qrcode,
        pix_copy_paste: charge.copy_paste,
        pix_expires_at: charge.expires_at,
      })
      .eq("id", tx.id);

    // Audit
    await admin.from("financial_audit_logs").insert({
      actor_user_id: userId,
      action: "create_charge",
      entity_type: "payment_transaction",
      entity_id: tx.id,
      ip_address: req.headers.get("x-forwarded-for") ?? null,
      metadata: { event_id: ev.id, amount_cents: amountCents, fee_cents: feeCents, total_cents: totalCents, stub: true },
    });

    return json({
      transaction_id: tx.id,
      provider_transaction_id: charge.id,
      qrcode: charge.qrcode,
      copy_paste: charge.copy_paste,
      expires_at: charge.expires_at,
      amount_cents: amountCents,
      fee_cents: feeCents,
      total_cents: totalCents,
      stub: true,
    });
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
