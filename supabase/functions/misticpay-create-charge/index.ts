import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// =============================================================
// MisticPay - Criar cobrança PIX (Cash-In)
// Doc: https://docs.misticpay.com/  (POST /api/transactions/create)
// Auth: headers `ci` (Client ID) e `cs` (Client Secret)
// Valores enviados em REAIS (decimal). Ex: 4.55 = R$ 4,55
// =============================================================

interface AddonInput {
  product_id: string;
  quantity: number;
}
interface Body {
  event_id: string;
  category_id?: string | null;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  buyer_document: string; // CPF, somente dígitos
  addons?: AddonInput[];
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

    // 1) Evento
    const { data: ev, error: evErr } = await admin
      .from("events")
      .select("id, title, ticket_type, ticket_price_cents, tickets_total, organizer_id")
      .eq("id", body.event_id)
      .maybeSingle();
    if (evErr || !ev) return json({ error: "Evento não encontrado" }, 404);

    // 2) Resolver preço a partir de modalidade (se fornecida) ou evento legado
    let amountCents = 0;
    let categoryId: string | null = null;
    let batchId: string | null = null;
    let categoryKind: string | null = null;

    if (body.category_id) {
      const { data: cat } = await admin
        .from("event_ticket_categories")
        .select("*")
        .eq("id", body.category_id)
        .maybeSingle();
      if (!cat) return json({ error: "Modalidade não encontrada" }, 404);
      if (cat.event_id !== ev.id) return json({ error: "Modalidade não pertence ao evento" }, 400);
      if (!cat.is_active) return json({ error: "Modalidade não está ativa" }, 400);
      const now = Date.now();
      if (cat.sale_starts_at && new Date(cat.sale_starts_at).getTime() > now)
        return json({ error: "Venda dessa modalidade ainda não começou" }, 400);
      if (cat.sale_ends_at && new Date(cat.sale_ends_at).getTime() < now)
        return json({ error: "Venda dessa modalidade encerrada" }, 400);
      if (cat.kind === "courtesy" || cat.is_free)
        return json({ error: "Modalidade gratuita não usa PIX" }, 400);

      if (cat.batch_id) {
        const { data: bat } = await admin
          .from("event_ticket_batches")
          .select("*")
          .eq("id", cat.batch_id)
          .maybeSingle();
        if (!bat || !bat.is_active) return json({ error: "Lote inativo" }, 400);
        if (bat.starts_at && new Date(bat.starts_at).getTime() > now)
          return json({ error: "Lote ainda não iniciou" }, 400);
        if (bat.ends_at && new Date(bat.ends_at).getTime() < now)
          return json({ error: "Lote encerrado" }, 400);
        batchId = bat.id;
      }

      const { data: avail } = await admin.rpc("event_category_available", { _category_id: cat.id });
      if (avail !== null && (avail as number) <= 0) return json({ error: "Modalidade esgotada" }, 409);

      if (cat.per_user_limit) {
        const { count } = await admin
          .from("tickets")
          .select("id", { count: "exact", head: true })
          .eq("category_id", cat.id)
          .eq("user_id", userId)
          .neq("status", "cancelled");
        if ((count ?? 0) >= cat.per_user_limit) {
          return json({ error: `Limite por usuário atingido (${cat.per_user_limit})` }, 409);
        }
      }

      amountCents = cat.price_cents;
      categoryId = cat.id;
      categoryKind = cat.kind;
    } else {
      if (ev.ticket_type !== "paid") return json({ error: "Evento não é pago" }, 400);
      amountCents = ev.ticket_price_cents;
    }

    // 3) Disponibilidade total do evento
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

    // 4) Taxa global (só aplica a modalidades pagas / não-cortesia)
    const { data: settings } = await admin
      .from("platform_settings")
      .select("ticket_fee_cents")
      .eq("id", true)
      .maybeSingle();
    const baseFee = settings?.ticket_fee_cents ?? 100;
    const feeCents = (categoryKind === "courtesy" || amountCents === 0) ? 0 : baseFee;

    // 4b) Adicionais (produtos extras)
    let addonsCents = 0;
    const addonsMetadata: Array<{ product_id: string; name: string; quantity: number; unit_price_cents: number }> = [];
    const addonsInput = Array.isArray(body.addons) ? body.addons.filter((a) => a?.product_id && (a?.quantity ?? 0) > 0) : [];
    if (addonsInput.length > 0) {
      const ids = [...new Set(addonsInput.map((a) => String(a.product_id)))];
      const { data: products } = await admin
        .from("event_addon_products")
        .select("id, event_id, name, price_cents, stock_total, stock_sold, max_per_order, is_visible")
        .in("id", ids);
      const prodMap = new Map<string, any>((products || []).map((p: any) => [p.id, p]));
      for (const a of addonsInput) {
        const p = prodMap.get(String(a.product_id));
        if (!p) return json({ error: "Produto adicional não encontrado" }, 404);
        if (p.event_id !== ev.id) return json({ error: "Produto adicional inválido para o evento" }, 400);
        if (!p.is_visible) return json({ error: `Produto "${p.name}" indisponível` }, 400);
        const qty = Math.max(1, Math.min(999, Math.floor(a.quantity)));
        if (p.max_per_order && qty > p.max_per_order) {
          return json({ error: `Máximo ${p.max_per_order} unidades por pedido de "${p.name}"` }, 400);
        }
        if (p.stock_total != null && (p.stock_sold + qty) > p.stock_total) {
          return json({ error: `Estoque insuficiente para "${p.name}"` }, 409);
        }
        addonsCents += p.price_cents * qty;
        addonsMetadata.push({ product_id: p.id, name: p.name, quantity: qty, unit_price_cents: p.price_cents });
      }
    }

    const totalCents = amountCents + feeCents + addonsCents;

    // 5) Criar transaction (pending)
    const { data: tx, error: txErr } = await admin
      .from("payment_transactions")
      .insert({
        event_id: ev.id,
        organizer_id: ev.organizer_id,
        buyer_user_id: userId,
        buyer_name: body.buyer_name,
        buyer_email: body.buyer_email,
        buyer_phone: body.buyer_phone,
        amount_cents: amountCents + addonsCents,
        fee_cents: feeCents,
        total_cents: totalCents,
        provider: "misticpay",
        status: "pending",
        metadata: {
          ...(categoryId ? { category_id: categoryId, batch_id: batchId } : {}),
          ...(addonsMetadata.length ? { addons: addonsMetadata, addons_cents: addonsCents } : {}),
        },
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

    const respText = await resp.text();
    let respJson: any = {};
    try { respJson = JSON.parse(respText); } catch { /* keep text */ }
    console.log("[misticpay] HTTP", resp.status, "body:", respText.slice(0, 800));

    if (!resp.ok) {
      await admin.from("payment_transactions").update({
        status: "failed",
        raw_payload: { http_status: resp.status, body: respJson || respText },
      }).eq("id", tx.id);
      return json({
        error: "Falha ao criar cobrança na MisticPay",
        detail: respJson?.message || respJson?.error || `HTTP ${resp.status}`,
      }, 502);
    }

    const data = respJson?.data ?? respJson ?? {};
    const providerTxId = String(data.transactionId ?? data.id ?? "");
    const qrcode = data.qrCodeBase64 || data.qrcodeUrl || data.qr_code || data.qrCode || "";
    const copyPaste = data.copyPaste || data.copy_paste || data.pixCopyPaste || data.qrCodeText || "";

    await admin
      .from("payment_transactions")
      .update({
        provider_transaction_id: providerTxId,
        pix_qrcode: qrcode,
        pix_copy_paste: copyPaste,
        pix_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        raw_payload: respJson,
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
