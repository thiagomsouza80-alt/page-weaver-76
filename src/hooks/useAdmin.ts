import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export const useAdmin = () => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // No session at all → redirect, but do NOT signOut (nothing to sign out).
        navigate("/admin/login");
        return;
      }

      const { data, error } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });

      if (error) {
        // Transient error (network/RPC). Keep session alive; just stop loading.
        console.warn("[useAdmin] has_role failed (transient):", error.message);
        setLoading(false);
        return;
      }

      if (!data) {
        // Authenticated but NOT admin → redirect without forcing signOut,
        // so the user's regular session (artist/organizer/etc.) stays intact.
        navigate("/admin/login");
        return;
      }

      setUserId(session.user.id);
      setIsAdmin(true);
      setLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      // Only re-check on real auth transitions, not on token refresh.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        checkAdmin();
      }
    });

    checkAdmin();

    return () => subscription.unsubscribe();
  }, [navigate]);

  return { loading, isAdmin, userId };
};
