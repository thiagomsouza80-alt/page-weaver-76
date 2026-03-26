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

    const { user_id, profile_type, profile_id } = await req.json();

    // Delete profile first (cascade will handle pending_updates via FK)
    if (profile_type === "artist") {
      // Delete fan_clicks for this artist
      await adminClient.from("fan_clicks").delete().eq("artist_id", profile_id);
      // Delete pending updates
      await adminClient.from("artist_pending_updates").delete().eq("artist_id", profile_id);
      // Delete artist
      await adminClient.from("artists").delete().eq("id", profile_id);
    } else if (profile_type === "entrepreneur") {
      await adminClient.from("entrepreneur_pending_updates").delete().eq("entrepreneur_id", profile_id);
      await adminClient.from("entrepreneurs").delete().eq("id", profile_id);
    }

    // Delete the auth user so the email can be reused
    if (user_id) {
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(user_id);
      if (deleteError) {
        console.error("Error deleting auth user:", deleteError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
