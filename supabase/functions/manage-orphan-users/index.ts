import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization")!;
    const callerClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) throw new Error("Não autenticado");

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: caller.id,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Sem permissão");

    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    if (req.method === "GET" || action === "list") {
      // List all auth users, then find orphans (no matching artist or entrepreneur)
      const allUsers: Array<{ id: string; email: string; created_at: string }> = [];
      let page = 1;
      const perPage = 1000;
      
      while (true) {
        const { data: { users }, error } = await adminClient.auth.admin.listUsers({
          page,
          perPage,
        });
        if (error) throw error;
        if (!users || users.length === 0) break;
        for (const u of users) {
          allUsers.push({ id: u.id, email: u.email ?? "", created_at: u.created_at });
        }
        if (users.length < perPage) break;
        page++;
      }

      // Get all user_ids from artists and entrepreneurs
      const { data: artists } = await adminClient
        .from("artists")
        .select("user_id")
        .not("user_id", "is", null);
      
      const { data: entrepreneurs } = await adminClient
        .from("entrepreneurs")
        .select("user_id")
        .not("user_id", "is", null);

      // Get admin user_ids
      const { data: adminRoles } = await adminClient
        .from("user_roles")
        .select("user_id");

      const linkedIds = new Set<string>();
      for (const a of artists ?? []) if (a.user_id) linkedIds.add(a.user_id);
      for (const e of entrepreneurs ?? []) if (e.user_id) linkedIds.add(e.user_id);
      for (const r of adminRoles ?? []) linkedIds.add(r.user_id);

      const orphans = allUsers.filter(u => !linkedIds.has(u.id));

      return new Response(JSON.stringify({ orphans }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const { user_id } = await req.json();
      if (!user_id) throw new Error("user_id é obrigatório");

      const { error } = await adminClient.auth.admin.deleteUser(user_id);
      if (error) throw error;

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Método não suportado" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
