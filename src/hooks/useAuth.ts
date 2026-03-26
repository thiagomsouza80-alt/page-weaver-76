import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

interface UserProfile {
  type: "artist" | "entrepreneur";
  id: string;
  name: string;
}

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        // Check if artist
        const { data: artist } = await supabase
          .from("artists")
          .select("id, name")
          .eq("user_id", currentUser.id)
          .maybeSingle();

        if (artist) {
          setProfile({ type: "artist", id: artist.id, name: artist.name });
          setLoading(false);
          return;
        }

        // Check if entrepreneur
        const { data: entrepreneur } = await supabase
          .from("entrepreneurs")
          .select("id, name")
          .eq("user_id", currentUser.id)
          .maybeSingle();

        if (entrepreneur) {
          setProfile({ type: "entrepreneur", id: entrepreneur.id, name: entrepreneur.name });
          setLoading(false);
          return;
        }

        setProfile(null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  };

  return { user, profile, loading, signOut };
};
