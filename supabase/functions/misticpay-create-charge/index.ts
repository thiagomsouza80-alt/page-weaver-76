import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// =============================================================
// MisticPay - Criar cobrança PIX (Cash-In)
// Doc: https://docs.misticpay.com/  (POST /api/transactions/create)
// Auth: headers `ci` (Client ID) e `cs` (Client Secret)
// Valores enviados em REAIS (decimal). Ex: 4.55 = R$ 4,55
// =============================================================

interface Body {
  event_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  buyer_document: string; // CPF, somente dígitos
}

const onlyDigits = (s: string) => (s || "").replace(/\D+/g, "");

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
    const cpf = onlyDigits(body.buyer_document || "");
    if (!body.event_id || !body.buyer_name || !body.buyer_email || !body.buyer_phone) {
      return json({ error: "Campos obrigatórios ausentes" }, 400);
    }
    if (cpf.length !== 11) {
      return json({ error: "CPF inválido. Informe os 11 dígitos." }, 400);
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
    const { data: settings } = await admin
      .from("platform_settings")
      .select("ticket_fee_cents")
      .eq("id", true)
      .maybeSingle();
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

    // 5) Chamada real à MisticPay
    const clientId = Deno.env.get("MISTICPAY_CLIENT_ID");
    const clientSecret = Deno.env.get("MISTICPAY_CLIENT_SECRET");
    const webhookSecret = Deno.env.get("MISTICPAY_WEBHOOK_SECRET") || "";
    const env = (Deno.env.get("MISTICPAY_ENV") || "production").toLowerCase();
    const apiBase = "https://api.misticpay.com/api"; // doc oficial — única base anunciada

    if (!clientId || !clientSecret) {
      // Reverte transação e avisa
      await admin.from("payment_transactions").update({ status: "failed" }).eq("id", tx.id);
      return json({ error: "Credenciais MisticPay não configuradas (MISTICPAY_CLIENT_ID/SECRET)." }, 500);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const webhookUrl = `${supabaseUrl}/functions/v1/misticpay-webhook${
      webhookSecret ? `?secret=${encodeURIComponent(webhookSecret)}` : ""
    }`;

    const amountReais = Number((totalCents / 100).toFixed(2));
    const description = `Ingresso - ${ev.title}`.slice(0, 140);

    const resp = await fetch(`${apiBase}/transactions/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ci: clientId,
        cs: clientSecret,
      },
      body: JSON.stringify({
        amount: amountReais,
        payerName: body.buyer_name,
        payerDocument: cpf,
        transactionId: tx.id, // referência nossa — virá de volta no webhook
        description,
        projectWebhook: webhookUrl,
      }),
    });

    const respJson = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      await admin.from("payment_transactions").update({
        status: "failed",
        raw_payload: respJson,
      }).eq("id", tx.id);
      return json({
        error: "Falha ao criar cobrança na MisticPay",
        detail: respJson?.message || respJson?.error || `HTTP ${resp.status}`,
      }, 502);
    }

    const data = respJson?.data ?? {};
    const providerTxId = String(data.transactionId ?? "");
    const qrcode = data.qrCodeBase64 || data.qrcodeUrl || "";
    const copyPaste = data.copyPaste || "";

    await admin
      .from("payment_transactions")
      .update({
        provider_transaction_id: providerTxId,
        pix_qrcode: qrcode,
        pix_copy_paste: copyPaste,
        pix_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      })
      .eq("id", tx.id);

    await admin.from("financial_audit_logs").insert({
      actor_user_id: userId,
      action: "create_charge",
      entity_type: "payment_transaction",
      entity_id: tx.id,
      ip_address: req.headers.get("x-forwarded-for") ?? null,
      metadata: {
        event_id: ev.id,
        amount_cents: amountCents,
        fee_cents: feeCents,
        total_cents: totalCents,
        provider_transaction_id: providerTxId,
        env,
      },
    });

    return json({
      transaction_id: tx.id,
      provider_transaction_id: providerTxId,
      qrcode,
      copy_paste: copyPaste,
      expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      amount_cents: amountCents,
      fee_cents: feeCents,
      total_cents: totalCents,
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
